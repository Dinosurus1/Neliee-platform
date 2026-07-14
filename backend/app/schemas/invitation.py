# app/schemas/invitation.py
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from ..core.password_policy import validate_password_strength

class InvitationCreate(BaseModel):
    """Payload que envía el admin para invitar a una empleada."""
    email: EmailStr


class ActivateAccount(BaseModel):
    """
    Payload que envía la empleada para activar su cuenta.
    El token viene de la URL del correo de invitación.
    """
    token: str
    full_name: str
    password: str

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres.")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return validate_password_strength(v)


class InvitationOut(BaseModel):
    """Respuesta al admin tras enviar la invitación."""
    id: uuid.UUID
    email: str
    expires_at: datetime
    created_at: datetime  # necesario para columna "Registrada" en la tabla de pendientes

    model_config = ConfigDict(from_attributes=True)