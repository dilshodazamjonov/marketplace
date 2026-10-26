from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import date

from backend.sql.users import User
from backend.sql.base import get_db
from backend.utils.auth_utils import password_hasher, get_current_user
from backend.utils.jwt import create_access_token
from backend.models import UserModel, UserLogin

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
def login(user: UserLogin, db: Session = Depends(get_db)):

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

    access_token = create_access_token(str(existing_user.id))

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get('/me', status_code=200)
def get_me(current_user: User = Depends(get_current_user)):

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "date_of_birth": current_user.date_of_birth,
        "created_at": current_user.created_at
    }

