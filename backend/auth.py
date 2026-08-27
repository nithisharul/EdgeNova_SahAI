import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SECRET_KEY = os.getenv(
    "SAAI_SECRET_KEY",
    "development-only-secret-change-before-deployment-32",
)
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 30

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        200_000,
    )
    return f"pbkdf2_sha256$200000${salt}${digest.hex()}"


def _make_user(username: str, role: str, password: str) -> Dict[str, Any]:
    return {
        "username": username,
        "role": role,
        "password_hash": hash_password(password),
    }


USERS = {
    "admin": _make_user("admin", "admin", "admin123"),
    "treasurer": _make_user("treasurer", "treasurer", "treasurer123"),
    "member": _make_user("member", "member", "member123"),
}


def verify_password(password: str, password_hash: str) -> bool:
    try:
        _, iterations, salt, digest_hex = password_hash.split("$")
        iterations = int(iterations)
        computed = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return computed.hex() == digest_hex
    except (ValueError, TypeError):
        return False


def create_access_token(claims: Dict[str, Any]) -> str:
    token_claims = dict(claims)
    now = datetime.now(timezone.utc)
    token_claims.update({
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    })
    return jwt.encode(token_claims, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    user = USERS.get(username)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return {"username": user["username"], "role": user["role"]}


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Dict[str, Any]:
    if credentials is None or not credentials.scheme or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    username = payload.get("sub")
    user = USERS.get(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"username": user["username"], "role": user["role"]}


def require_roles(*allowed_roles: str):
    async def dependency(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return current_user

    return dependency
