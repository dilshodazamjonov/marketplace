import os
import hashlib
import logging
import redis

from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL")

# compose.yaml sets REDIS_URL. Without it (running the API outside Docker) rate limiting is off.
redis_client = redis.Redis.from_url(
    REDIS_URL,
    decode_responses=True,
    # Without timeouts a stuck Redis would hang every sign-in.
    socket_connect_timeout=1,
    socket_timeout=1,
) if REDIS_URL else None

LOGIN_WINDOW = 15 * 60
LOGIN_IP_LIMIT = 20        # one attacker trying many accounts
LOGIN_EMAIL_LIMIT = 5      # many IPs attacking one account
REGISTER_WINDOW = 60 * 60
REGISTER_IP_LIMIT = 5

# Atomic increment with automatic expiration

INCREMENT = """
    local count = redis.call('INCR', KEYS[1])

    if count == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
    end

    return {count, redis.call('TTL', KEYS[1])}
"""

increment = redis_client.register_script(INCREMENT) if redis_client else None

def hit(key: str, limit: int, window: int) -> None:
    if increment is None:
        return
    try:
        count, ttl = increment(keys=[f"rl:{key}"], args=[window])
    except redis.RedisError:
        logger.warning("Rate limiting skipped: Redis is unavailable")
        return  # Redis is down: let the request through instead of blocking every sign-in
    if count > limit:
        raise HTTPException(429, "Too many attempts. Please try again later.",
                            headers={"Retry-After": str(max(ttl, 1))})

def reset(key: str) -> None:
    if redis_client is None:
        return
    try:
        redis_client.delete(f"rl:{key}")
    except redis.RedisError:
        logger.warning("Rate limit reset skipped: Redis is unavailable")

def client_ip(request: Request) -> str:
    # Behind nginx this is the real client IP: nginx sends it in X-Forwarded-For and uvicorn
    # trusts that header because of FORWARDED_ALLOW_IPS in compose.yaml.
    return request.client.host if request.client else "unknown"

def email_key(email: str) -> str:
    # Hashed so Redis never stores email addresses.
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()

def limit_login(request: Request, email: str) -> None:
    hit(f"login:ip:{client_ip(request)}", LOGIN_IP_LIMIT, LOGIN_WINDOW)
    hit(f"login:email:{email_key(email)}", LOGIN_EMAIL_LIMIT, LOGIN_WINDOW)

def clear_login_failures(email: str) -> None:
    # After a successful sign-in, so only failed attempts count against the account.
    reset(f"login:email:{email_key(email)}")

def limit_registration(request: Request) -> None:
    hit(f"register:ip:{client_ip(request)}", REGISTER_IP_LIMIT, REGISTER_WINDOW)
