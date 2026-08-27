"""
Core auth logic.

Uses PBKDF2 (stdlib hashlib, no extra native dependencies) for password
hashing and PyJWT for session tokens. Roles are "admin", "member", and
"treasurer".

NOTE: for a hackathon this is real, working auth -- not decorative --
and the JWT secret is read from SAHAI_SECRET_KEY. Set that variable in
every deployed environment.

Treasurer accounts cannot be self-registered: creating one requires
SAHAI_SETUP_KEY (see backend/routes/auth_routes.py). Without that gate any
visitor could register as a treasurer and read the whole group's finances.
"""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("SAHAI_SECRET_KEY", "dev-only-secret-change-me-32-bytes")
ALGORITHM = "HS256"

# 30 minutes is the right production default, but it will expire mid-demo.
# Override with SAHAI_TOKEN_EXPIRY_SECONDS (e.g. 43200 for 12h) when presenting.
TOKEN_EXPIRY_SECONDS = int(os.getenv("SAHAI_TOKEN_EXPIRY_SECONDS", 60 * 30))

# Shared secret required to create a treasurer account. Empty means treasurer
# registration is disabled entirely, which is the safe default.
SETUP_KEY = os.getenv("SAHAI_SETUP_KEY", "")
ROLES = frozenset(("admin", "treasurer", "member"))
# Tuple, not frozenset: require_roles() renders these into an error message and
# frozenset iteration order is arbitrary, so the message would vary run to run.
STAFF_ROLES = ("admin", "treasurer")

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
        "exp": datetime.now(timezone.utc) + timedelta(seconds=TOKEN_EXPIRY_SECONDS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        claims = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM],
            options={"require": ["exp", "member_id", "role"]},
        )
        # Defence in depth: a token carrying a role we no longer recognise is
        # rejected rather than silently treated as an unknown (and therefore
        # permission-less, or worse, matching) role.
        if claims.get("role") not in ROLES:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token carries an unrecognised role.",
            )
        return claims
    except jwt.MissingRequiredClaimError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired, please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")


# ---------- FastAPI dependencies ----------

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict:
    """Use as: Depends(get_current_user) -- requires a valid token, any role."""
    token = credentials.credentials
    return decode_token(token)


def require_roles(*allowed_roles: str):
    """Build a dependency that requires an authenticated user in one role."""
    invalid_roles = set(allowed_roles) - ROLES
    if invalid_roles:
        raise ValueError(f"Unknown role(s): {', '.join(sorted(invalid_roles))}")

    def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            roles = " or ".join(allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires {roles} access.",
            )
        return user

    return dependency


require_treasurer = require_roles(*STAFF_ROLES)
require_admin = require_roles("admin")
require_member = require_roles("member")