from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.auth import authenticate_user, create_access_token, get_current_user, require_roles

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(payload: LoginRequest):
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return current_user


@router.get("/admin-only")
def admin_only(current_user=Depends(require_roles("admin"))):
    return {"message": "admin access granted", "user": current_user}
