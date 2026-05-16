#pydantic: UserCreate, UserOut, UserUpdate
# app/schemas/user.py
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator

# NUEVO
from app.schemas.enrollment import EnrollmentOut


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Literal["employee", "admin"] = "employee"

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres.")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime

    # NUEVO
    enrollments: list[EnrollmentOut] = []

    model_config = {"from_attributes": True}



