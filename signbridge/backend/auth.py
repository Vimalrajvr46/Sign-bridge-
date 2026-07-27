"""JWT authentication utilities."""

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


class TokenPayload(BaseModel):
    sub: str
    email: str
    exp: datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    display_name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    display_name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# In-memory user store for demo; replace with database in production
_users_db: dict[str, dict[str, Any]] = {}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict[str, Any]) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> TokenPayload:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return TokenPayload(
            sub=payload["sub"],
            email=payload["email"],
            exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def register_user(user: UserCreate) -> UserResponse:
    if user.email in _users_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{len(_users_db) + 1}"
    _users_db[user.email] = {
        "id": user_id,
        "email": user.email,
        "display_name": user.display_name,
        "password_hash": hash_password(user.password),
    }
    return UserResponse(id=user_id, email=user.email, display_name=user.display_name)


def authenticate_user(credentials: UserLogin) -> UserResponse:
    record = _users_db.get(credentials.email)
    if not record or not verify_password(credentials.password, record["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return UserResponse(
        id=record["id"],
        email=record["email"],
        display_name=record["display_name"],
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> UserResponse | None:
    """Optional auth — returns None for anonymous sessions."""
    if credentials is None:
        return None
    payload = decode_token(credentials.credentials)
    record = _users_db.get(payload.email)
    if not record:
        raise HTTPException(status_code=401, detail="User not found")
    return UserResponse(
        id=record["id"],
        email=record["email"],
        display_name=record["display_name"],
    )


async def require_user(
    user: UserResponse | None = Depends(get_current_user),
) -> UserResponse:
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
