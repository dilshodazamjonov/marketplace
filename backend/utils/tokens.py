import os
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Response
from sqlalchemy.orm import Session

from backend.sql.tokens import RefreshToken
from backend.utils.jwt import ACCESS_TOKEN_SECONDS, create_access_token


REFRESH_TOKEN_TTL = timedelta(days=7)
REUSE_GRACE = timedelta(seconds=30)

# Secure cookies are only sent over https: set COOKIE_SECURE=true once the site has it.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def issue_refresh_token(db: Session, user_id, family_id=None) -> str:
    token = secrets.token_urlsafe(32)
    db.add(RefreshToken(user_id=user_id, family_id=family_id or uuid.uuid4(), token_hash=hash_token(token),
                        expires_at=datetime.now(timezone.utc) + REFRESH_TOKEN_TTL))
    return token

def set_access_cookie(response: Response, user_id) -> None:
    response.set_cookie("access_token", create_access_token(str(user_id)), httponly=True,
                        samesite="strict", secure=COOKIE_SECURE, max_age=ACCESS_TOKEN_SECONDS, path="/")

def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie("refresh_token", token, httponly=True, samesite="strict", secure=COOKIE_SECURE,
                        max_age=int(REFRESH_TOKEN_TTL.total_seconds()), path="/auth")
