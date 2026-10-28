from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import delete, select
from datetime import date, datetime, timezone

from backend.sql.users import User
from backend.sql.tokens import RefreshToken
from backend.sql.base import get_db
from backend.utils.auth_utils import password_hasher, get_current_user
from backend.utils.tokens import COOKIE_SECURE, REUSE_GRACE, hash_token, set_access_cookie, set_refresh_cookie, issue_refresh_token
from backend.utils.jwt import create_access_token, ACCESS_TOKEN_SECONDS
from backend.utils.rate_limit import limit_login, clear_login_failures, limit_registration
from backend.models.auth import UserModel, UserLogin, UserUpdate, PasswordChange

router = APIRouter(prefix='/auth', tags=["auth"])


def field_error(field: str, message: str, status_code: int = 409) -> HTTPException:
    # Same shape as FastAPI's 422s, so the frontend shows the message under that field.
    return HTTPException(status_code=status_code, detail=[{"loc": ["body", field], "msg": message}])

@router.post("/registration", status_code=201)
def registration(user: UserModel, request: Request, db: Session = Depends(get_db)):

    """
    1. Hash the password using a secure password hashing algorithm, such as Argon2.
    2. Create a User SQLAlchemy object.
    3. Add it to the session using db.add().
    4. Save it using db.commit().
    5. Return a success response without exposing the password.
    """

    limit_registration(request)

    existing_user = db.scalar(
        select(User).where(User.email == user.email)
    )

    if existing_user is not None:
        raise field_error("email", "This email is already registered.")

    username_exist = db.scalar(
        select(User).where(User.username == user.username)
    )

    if username_exist is not None:
        raise field_error("username", "This username is already taken.")

    hashed_password = password_hasher.hash(user.password)

    # New user creation
    new_user = User(
        username=user.username,
        email=user.email,
        date_of_birth=user.date_of_birth,
        user_type=user.user_type,
        password_hash = hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)


    return {
        "message": "Registration successful",
        "user_id": new_user.id
    }



@router.post('/login', status_code=200)
def login(user: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):

    limit_login(request, user.email)

    existing_user = db.scalar(
        select(User).where(User.email == user.email)
    )

    if existing_user is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not password_hasher.verify(user.password, existing_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not existing_user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account has been suspended."
        )

    clear_login_failures(user.email)

    # Old sign-ins pile up otherwise: drop this user's expired refresh tokens.
    db.execute(
        delete(RefreshToken).where(
            RefreshToken.user_id == existing_user.id,
            RefreshToken.expires_at <= datetime.now(timezone.utc)
        )
    )

    set_access_cookie(response, existing_user.id)
    set_refresh_cookie(response, issue_refresh_token(db, existing_user.id))

    db.commit()

    return {"expires_in": ACCESS_TOKEN_SECONDS}

@router.post('/refresh', status_code=200)
def refresh(response: Response, refresh_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):

    session_over = HTTPException(status_code=401, detail="Your session has ended. Please sign in again.")
    now = datetime.now(timezone.utc)

    stored = None
    if refresh_token:
        # FOR UPDATE: two simultaneous refreshes queue up instead of both rotating.
        stored = db.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == hash_token(refresh_token)).with_for_update()
        )

    if stored is None or stored.expires_at <= now:
        raise session_over

    if stored.used_at is not None:
        # Another tab refreshed with this token a moment ago and already has the new refresh cookie.
        if now - stored.used_at < REUSE_GRACE:
            set_access_cookie(response, stored.user_id)
            return {"expires_in": ACCESS_TOKEN_SECONDS}

        # An old token came back, so it leaked: end this whole sign-in.
        db.execute(delete(RefreshToken).where(RefreshToken.family_id == stored.family_id))
        db.commit()
        raise session_over

    stored.used_at = now
    set_access_cookie(response, stored.user_id)
    set_refresh_cookie(response, issue_refresh_token(db, stored.user_id, stored.family_id))
    db.commit()

    return {"expires_in": ACCESS_TOKEN_SECONDS}

@router.post('/logout', status_code=204)
def logout(response: Response, refresh_token: str | None = Cookie(default=None), db: Session = Depends(get_db)):

    if refresh_token:
        stored = db.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == hash_token(refresh_token))
        )
        if stored is not None:
            db.execute(delete(RefreshToken).where(RefreshToken.family_id == stored.family_id))
            db.commit()

    response.delete_cookie("access_token", path='/', httponly=True, samesite="strict", secure=COOKIE_SECURE)
    response.delete_cookie("refresh_token", path='/auth', httponly=True, samesite="strict", secure=COOKIE_SECURE)

@router.get('/me', status_code=200)
def get_me(current_user: User = Depends(get_current_user)):

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "date_of_birth": current_user.date_of_birth,
        "user_type": current_user.user_type,
        "created_at": current_user.created_at
    }

@router.patch('/me', status_code=200)
def update_me(changes: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    if changes.email is not None:
        email_taken = db.scalar(
            select(User).where(User.email == changes.email, User.id != current_user.id)
        )
        if email_taken is not None:
            raise field_error("email", "This email is already registered.")

    if changes.username is not None:
        username_taken = db.scalar(
            select(User).where(User.username == changes.username, User.id != current_user.id)
        )
        if username_taken is not None:
            raise field_error("username", "This username is already taken.")

    for field, value in changes.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return get_me(current_user)

@router.post('/change-password', status_code=204)
def change_password(
    body: PasswordChange,
    refresh_token: str | None = Cookie(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if not password_hasher.verify(body.current_password, current_user.password_hash):
        raise field_error("current_password", "Current password is incorrect.", status_code=400)

    current_user.password_hash = password_hasher.hash(body.new_password)

    # Sign out every other device, so a stolen session stops working. This sign-in stays.
    other_sessions = delete(RefreshToken).where(RefreshToken.user_id == current_user.id)
    if refresh_token:
        other_sessions = other_sessions.where(RefreshToken.token_hash != hash_token(refresh_token))
    db.execute(other_sessions)

    db.commit()


