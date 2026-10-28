from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import delete, select
from datetime import date, datetime, timezone

from backend.sql.users import User
from backend.sql.tokens import RefreshToken
from backend.sql.base import get_db
from backend.utils.auth_utils import password_hasher, get_current_user
from backend.utils.tokens import REUSE_GRACE, hash_token, set_access_cookie, set_refresh_cookie, issue_refresh_token
from backend.utils.jwt import create_access_token, ACCESS_TOKEN_SECONDS
from backend.models.auth import UserModel, UserLogin

router = APIRouter(prefix='/auth', tags=["auth"])

@router.post("/registration", status_code=201)
def registration(user: UserModel, db: Session = Depends(get_db)):

    """
    1. Hash the password using a secure password hashing algorithm, such as Argon2.
    2. Create a User SQLAlchemy object.
    3. Add it to the session using db.add().
    4. Save it using db.commit().
    5. Return a success response without exposing the password.
    """

    existing_user = db.scalar(
        select(User).where(User.email == user.email)
    )

    if existing_user is not None:

        raise HTTPException(
            status_code=409,
            detail="Email already registered, login instead in /auth/login"
        )

    username_exist = db.scalar(
        select(User).where(User.username == user.username)
    )

    if username_exist is not None:
        raise HTTPException(
            status_code=409,
            detail="username already exists"
        )

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
def login(user: UserLogin, response: Response, db: Session = Depends(get_db)):

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

    response.delete_cookie("access_token", path='/', httponly=True, samesite="strict")
    response.delete_cookie("refresh_token", path='/auth', httponly=True, samesite="strict")

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


