"""Auth router — POST /api/auth/login, GET /api/auth/me."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer()

SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

# Demo users — seeded from config/users.json; passwords loaded from env
_USERS: dict[str, dict] = {
    "admin": {
        "username": "admin",
        "role": "admin",
        "display_name": "Travel Admin",
        "email": "admin@navanvoyage.demo",
        "password_hash": _pwd.hash(os.getenv("SEED_ADMIN_PASSWORD", "admin123")),
    },
    "traveller": {
        "username": "traveller",
        "role": "traveller",
        "display_name": "Demo Traveller",
        "email": "traveller@navanvoyage.demo",
        "password_hash": _pwd.hash(os.getenv("SEED_TRAVELLER_PASSWORD", "travel123")),
    },
}


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    username: str
    role: str
    display_name: str
    email: str


class LoginResponse(BaseModel):
    token: str
    user: UserOut


def _create_token(username: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
    return jwt.encode({"sub": username, "role": role, "exp": expire}, SECRET, algorithm=ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    payload = _decode_token(creds.credentials)
    username = payload.get("sub")
    if not username or username not in _USERS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return _USERS[username]


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest) -> LoginResponse:
    user = _USERS.get(body.username)
    if not user or not _pwd.verify(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = _create_token(user["username"], user["role"])
    return LoginResponse(
        token=token,
        user=UserOut(
            username=user["username"],
            role=user["role"],
            display_name=user["display_name"],
            email=user["email"],
        ),
    )


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(
        username=user["username"],
        role=user["role"],
        display_name=user["display_name"],
        email=user["email"],
    )
