#pydantic: UserCreate, UserOut, UserUpdate
# app/schemas/user.py
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator


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

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# app/schemas/course.py
# ─────────────────────────────────────────────────────────────────────────────
# (Incluido aquí para brevedad; en el proyecto va en su propio archivo)

import uuid as _uuid
from pydantic import BaseModel as _BaseModel


class CourseCreate(_BaseModel):
    title: str
    description: str | None = None
    gdrive_video_id: str        # Solo el ID, no la URL completa
    order: int = 0
    is_published: bool = False


class CourseUpdate(_BaseModel):
    title: str | None = None
    description: str | None = None
    gdrive_video_id: str | None = None
    order: int | None = None
    is_published: bool | None = None


class CourseOut(_BaseModel):
    id: _uuid.UUID
    title: str
    description: str | None
    gdrive_video_id: str
    order: int
    is_published: bool

    model_config = {"from_attributes": True}