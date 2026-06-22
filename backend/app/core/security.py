#KWT: crear/verificar tokens

#utilidades de seguridad: hashing de contraseñas y manejo de JWT


import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings




#hashing de contraseñas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


#JSON Web Tokens (JWT)

def create_access_token(subject: Any, extra_claims: dict | None = None) -> str:
    #genera un JWT firmado 'subject' es normalmente el user_id (str) 'extra_claims' puede incluir {"role": "admin"} u otros datos relevantes para autorizacion en el frontend

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    if extra_claims:
        payload.update(extra_claims)
    
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    #decodifica y verifica un JWT, devuelve el payload o lanza JWTError si no es válido
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

def generate_refresh_token() -> str:
    #genera un token de refresco criptograficamente seguro de 64 bytes(url-safe)
    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    #hashea el token de refresco usando SHA-256 para guardarlo en la DB de forma segura
    #No usamos bcrypt porque el token ya tiene altísima entropía y bcrypt lo limitaría a 72 bytes.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
    