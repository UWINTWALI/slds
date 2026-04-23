"""
Pydantic v2 schemas for authentication and user management.
"""

from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    title: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    roles: List[str]
    is_active: bool

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    title: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    roles: List[str] = []

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    title: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    is_active: Optional[bool] = None


class RoleAssign(BaseModel):
    role_name: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters long")
        return v


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str
    district: Optional[str] = None
    sector: Optional[str] = None

    @field_validator("role")
    @classmethod
    def role_not_admin(cls, v: str) -> str:
        if v == "national_admin":
            raise ValueError("Cannot self-register as national_admin")
        allowed = {"district_officer", "sector_officer", "analyst"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(sorted(allowed))}")
        return v


class MessageResponse(BaseModel):
    message: str
