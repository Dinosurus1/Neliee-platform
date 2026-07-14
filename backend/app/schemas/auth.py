from pydantic import BaseModel, field_validator

from ..core.password_policy import validate_password_strength


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str


class TwoFactorRequired(BaseModel):
    requires_2fa: bool = True
    pending_token: str
    message: str = "Se envió un código de verificación a tu correo."


class Verify2FARequest(BaseModel):
    pending_token: str
    code: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return validate_password_strength(v)