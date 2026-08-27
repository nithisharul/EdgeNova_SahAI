"""
Core auth logic.

Uses PBKDF2 (stdlib hashlib, no extra native dependencies) for password
hashing and PyJWT for session tokens. Roles are "member" or "treasurer" --
some endpoints (ledger verification, group summary, other members'
portfolios) are treasurer-only.

NOTE: for a hackathon this is real, working auth -- not decorative --
but the JWT secret below is hardcoded for simplicity. In any real
deployment, move SECRET_KEY to an environment variable.
"""

import hashlib
import hmac
import os
import time
import secrets

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = "dev-only-secret-change-me"  # TODO: move to env var before any real deployment
ALGORITHM = "HS256"
TOKEN_EXPIRY_SECONDS = 60 * 60 * 12  # 12 hours

security_scheme = HTTPBearer()


# ---------- Password hashing (PBKDF2, stdlib only) ----------

def hash_password(password: str, salt: str = None) -> str:
    if salt is None:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"{salt}${pwd_hash.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, hash_hex = stored_hash.split("$")
    except ValueError:
        return False
    recomputed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return hmac.compare_digest(recomputed.hex(), hash_hex)


# ---------- JWT tokens ----------

def create_token(member_id: str, role: str) -> str:
    payload = {
        "member_id": member_id,
        "role": role,
        "exp": time.time() + TOKEN_EXPIRY_SECONDS,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired, please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")


# ---------- FastAPI dependencies ----------

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict:
    """Use as: Depends(get_current_user) -- requires a valid token, any role."""
    token = credentials.credentials
    return decode_token(token)


def require_treasurer(user: dict = Depends(get_current_user)) -> dict:
    """Use as: Depends(require_treasurer) -- requires a valid token AND role=='treasurer'."""
    if user.get("role") != "treasurer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires treasurer access.",
        )
    return user