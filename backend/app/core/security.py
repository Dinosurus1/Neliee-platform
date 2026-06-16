#KWT: crear/verificar tokens

#utilidades de seguridad: hashing de contraseñas y manejo de JWT

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import Settings


#hashing de contraseñas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


#JSON Web Tokens (JWT)

def create_access_token(subject: Any, extra_claims: dict | None = None) -> str:
    #genera un JWT firmado 'subject' es normalmente el user_id (str) 'extra_claims' puede incluir {"role": "admin"} u otros datos relevantes para autorizacion en el frontend

    expire = datetime.now(timezone.utc) + timedelta(minutes=Settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }

    if extra_claims:
        payload.update(extra_claims)
    
    return jwt.encode(payload, Settings.SECRET_KEY, algorithm=Settings.ALGORITHM)


def decode_token(token: str) -> dict:
    #decodifica y verifica un JWT, devuelve el payload o lanza JWTError si no es válido
    return jwt.decode(token, Settings.SECRET_KEY, algorithms=[Settings.ALGORITHM])