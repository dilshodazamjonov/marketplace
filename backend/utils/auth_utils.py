import os
import jwt

from uuid import UUID
from fastapi import Depends, HTTPException, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.sql.users import User
from backend.sql.base import get_db

from pwdlib import PasswordHash

SECRET_KEY = os.environ["JWT_SECRET_KEY"]
ALGORITHM = "HS256"

password_hasher = PasswordHash.recommended()

bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
        access_token: str| None = Cookie(default=None),
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
        db: Session = Depends(get_db)
) -> User:

    credentials_exception = HTTPException(
        status_code=401,
        detail="Invalid or missing authentication token",
        headers={"WWW-Authenticate": "Bearer"}
    )

    token = access_token or (credentials.credentials if credentials else None)

    if token is None:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY, 
            algorithms=[ALGORITHM], 
            options={"require": ["sub", "exp"]}
        )

        user_id = UUID(payload["sub"])

    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise credentials_exception from None

    user = db.get(User, user_id)

    # Suspended users are signed out on their next request.
    if user is None or not user.is_active:
        raise credentials_exception

    return user

