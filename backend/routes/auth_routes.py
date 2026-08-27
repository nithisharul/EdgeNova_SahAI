"""
Auth routes.

POST /auth/register -> create a member or treasurer account (PIN-based
                        password, simple for a hackathon demo)
POST /auth/login     -> exchange member_id + password for a JWT token
GET  /auth/me        -> return the authenticated user's token claims
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.auth import create_token, get_current_user
from backend.models.user import create_user, authenticate

router = APIRouter(prefix="/auth", tags=["auth"])

# Must stay in sync with the CHECK constraint in backend/models/user.py.
PUBLIC_REGISTRATION_ROLES = ("member", "treasurer")


class RegisterRequest(BaseModel):
    member_id: str
    name: str
    password: str
    role: Literal["member", "treasurer"]


class LoginRequest(BaseModel):
    member_id: str
    password: str


@router.post("/register")
def register(payload: RegisterRequest):
    if payload.role not in PUBLIC_REGISTRATION_ROLES:
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