#pydantic: UserCreate, UserOut, UserUpdate
# app/schemas/user.py
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator

# NUEVO
from .enrollment import EnrollmentOut


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: Literal["employee"] = "employee"

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres.")
        if len(v) > 100:
            raise ValueError("La contraseña no puede superar 100 caracteres.")   # ← DoS bcrypt
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una mayúscula.")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una minúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número.")
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



