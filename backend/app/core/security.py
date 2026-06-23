# app/core/security.py
"""
Utilidades de seguridad: hashing de contraseñas y manejo de JWT.
Usa PyJWT en lugar de python-jose (python-jose tiene CVEs activos y está sin mantenimiento).
"""
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt  # PyJWT  →  pip install PyJWT
from jwt import InvalidTokenError  # cubre ExpiredSignatureError, DecodeError, etc.
from passlib.context import CryptContext

from .config import settings

# ---------------------------------------------------------------------------
# Hashing de contraseñas
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JSON Web Tokens


def create_access_token(subject: Any, extra_claims: dict | None = None) -> str:
    """
    Genera un JWT firmado.
    'subject' es normalmente el user_id (UUID → str).
    'extra_claims' puede incluir {"role": "admin"} u otros datos para el frontend.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra_claims:
        payload.update(extra_claims)

    # PyJWT >= 2.0 devuelve str directamente (no bytes)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decodifica y verifica un JWT.
    Lanza jwt.InvalidTokenError (o subclase) si el token es inválido o expirado.
    En dependencies.py captura esta excepción como antes.
    """
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
    )


# ---------------------------------------------------------------------------
# Refresh Tokens
# ---------------------------------------------------------------------------

def generate_refresh_token() -> str:
    """Genera un token de refresco criptográficamente seguro de 64 bytes (url-safe)."""
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    """
    Hashea el refresh token con SHA-256 para guardarlo en la DB de forma segura.
    No usamos bcrypt porque el token ya tiene altísima entropía y bcrypt lo limitaría a 72 bytes.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()