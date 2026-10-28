import os
import jwt

from datetime import datetime, timedelta, timezone

SECRET_KEY = os.environ["JWT_SECRET_KEY"]
ALGORITHM = "HS256"

# One place for the lifetime: the JWT's exp, the cookie's max_age and "expires_in" all use it.
ACCESS_TOKEN_TTL = timedelta(hours=1)
ACCESS_TOKEN_SECONDS = int(ACCESS_TOKEN_TTL.total_seconds())

def create_access_token(user_id: str) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + ACCESS_TOKEN_TTL
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )








