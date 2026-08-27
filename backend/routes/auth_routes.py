"""
Auth routes.

POST /auth/register -> create an account (PIN-based password).
                        Members register freely. Creating a TREASURER requires
                        the SAHAI_SETUP_KEY shared secret, because a treasurer
                        can read every member's finances - self-service
                        treasurer registration would be an open door.
POST /auth/login     -> exchange member_id + password for a JWT token
GET  /auth/me        -> return the authenticated user's token claims
"""

import hmac
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth import SETUP_KEY, create_token, get_current_user
from backend.models.user import create_user, authenticate

router = APIRouter(prefix="/auth", tags=["auth"])

# Roles anyone may register as, with no extra credential.
PUBLIC_REGISTRATION_ROLES = ("member",)
# Roles that additionally require the SAHAI_SETUP_KEY shared secret.
PRIVILEGED_REGISTRATION_ROLES = ("treasurer",)


class RegisterRequest(BaseModel):
    member_id: str = Field(..., min_length=2, max_length=64)
    name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=4, max_length=128)
    role: Literal["member", "treasurer"] = "member"
    setup_key: str | None = Field(
        None, description="Required when role is 'treasurer'."
    )


class LoginRequest(BaseModel):
    member_id: str
    password: str


@router.post("/register")
def register(payload: RegisterRequest):
    if payload.role in PRIVILEGED_REGISTRATION_ROLES:
        if not SETUP_KEY:
            raise HTTPException(
                status_code=403,
                detail="Treasurer registration is disabled. Set SAHAI_SETUP_KEY on the server.",
            )
        if not payload.setup_key or not hmac.compare_digest(payload.setup_key, SETUP_KEY):
            raise HTTPException(
                status_code=403,
                detail="A valid setup key is required to create a treasurer account.",
            )
    elif payload.role not in PUBLIC_REGISTRATION_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"role must be one of: {', '.join(sorted(PUBLIC_REGISTRATION_ROLES))}",
        )

    try:
        user = create_user(payload.member_id, payload.name, payload.password, payload.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    token = create_token(user.member_id, user.role)
    return {"member_id": user.member_id, "role": user.role, "token": token}


@router.post("/login")
def login(payload: LoginRequest):
    user = authenticate(payload.member_id, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid member_id or password.")

    token = create_token(user.member_id, user.role)
    return {"member_id": user.member_id, "role": user.role, "token": token}


@router.get("/me")
def current_user(user: dict = Depends(get_current_user)):
    return user