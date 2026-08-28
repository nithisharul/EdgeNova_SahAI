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
import json
import os
import secrets
import threading
import time
from urllib.error import URLError
from urllib.request import urlopen
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("SAHAI_SECRET_KEY", "dev-only-secret-change-me-32-bytes")
ALGORITHM = "HS256"
AUTH_MODE = os.getenv("SAHAI_AUTH_MODE", "local").strip().lower()
OIDC_ISSUER = os.getenv("KEYCLOAK_ISSUER", "").rstrip("/")
OIDC_AUDIENCE = os.getenv("KEYCLOAK_AUDIENCE", "sahai-api")
OIDC_JWKS_URL = f"{OIDC_ISSUER}/protocol/openid-connect/certs" if OIDC_ISSUER else ""
OIDC_ROLE_GROUPS = {
    "sahai-admins": "admin",
    "sahai-treasurers": "treasurer",
    "sahai-members": "member",
}
_jwks_cache = {}
_jwks_cached_at = 0.0
_jwks_lock = threading.Lock()

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


# ---------- Keycloak / OpenID Connect ----------

def _load_jwks(force=False):
    global _jwks_cache, _jwks_cached_at
    if not OIDC_JWKS_URL:
        raise HTTPException(status_code=500, detail="KEYCLOAK_ISSUER is not configured.")
    if not force and time.time() - _jwks_cached_at < 300 and _jwks_cache:
        return _jwks_cache
    with _jwks_lock:
        if not force and time.time() - _jwks_cached_at < 300 and _jwks_cache:
            return _jwks_cache
        try:
            with urlopen(OIDC_JWKS_URL, timeout=5) as response:
                keys = json.load(response).get("keys", [])
        except (OSError, URLError, ValueError) as error:
            raise HTTPException(status_code=503, detail="Keycloak signing keys are unavailable.") from error
        _jwks_cache = {key.get("kid"): key for key in keys if key.get("kid")}
        _jwks_cached_at = time.time()
        return _jwks_cache


def _oidc_role(claims: dict) -> str:
    groups = claims.get("groups", [])
    if isinstance(groups, str):
        groups = [groups]
    group_names = {str(group).strip("/").split("/")[-1] for group in groups}
    roles = set()
    for group_name, role in OIDC_ROLE_GROUPS.items():
        if group_name in group_names:
            roles.add(role)

    realm_roles = claims.get("realm_access", {}).get("roles", [])
    if isinstance(realm_roles, list):
        roles.update(role for role in realm_roles if role in ROLES)

    if len(roles) != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Keycloak user must have exactly one SahAI application role.",
        )
    return roles.pop()


def decode_oidc_token(token: str) -> dict:
    if AUTH_MODE != "oidc":
        raise HTTPException(status_code=500, detail="OIDC authentication is not enabled.")
    if not OIDC_ISSUER:
        raise HTTPException(status_code=500, detail="KEYCLOAK_ISSUER is not configured.")
    try:
        header = jwt.get_unverified_header(token)
        if header.get("alg") != "RS256" or not header.get("kid"):
            raise jwt.InvalidTokenError("Unsupported token algorithm or missing key id.")
        key_data = _load_jwks().get(header["kid"])
        if not key_data:
            key_data = _load_jwks(force=True).get(header["kid"])
        if not key_data:
            raise jwt.InvalidTokenError("Unknown Keycloak signing key.")
        key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))
        claims = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=OIDC_AUDIENCE,
            issuer=OIDC_ISSUER,
            options={"require": ["exp", "iat", "sub"]},
        )
        member_id = claims.get("preferred_username") or claims.get("email") or claims["sub"]
        return {"member_id": str(member_id), "role": _oidc_role(claims), **claims}
    except HTTPException:
        raise
    except (jwt.PyJWTError, ValueError, KeyError, TypeError) as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Keycloak token.") from error


# ---------- FastAPI dependencies ----------

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict:
    """Use as: Depends(get_current_user) -- requires a valid token, any role."""
    token = credentials.credentials
    return decode_oidc_token(token) if AUTH_MODE == "oidc" else decode_token(token)


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