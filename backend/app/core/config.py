#settings (pydantics BaseSettings) para la configuracion de la aplicacion, con variables de entorno y valores por defecto
#app/core/config.py
#configuracion centralizada con pydantic BaseSettings para la aplicacion, incluyendo variables de entorno y valores por defecto para la base de datos, JWT, etc...

from functools import lru_cache
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_CLAVES_DEBILES = {
    "Cambiar en produccion",
    "cambiar_esto_con_openssl_rand_hex_32_en_produccion",
    "admin1234",
    "secret",
    "changeme",
}

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file = ".env", env_file_encoding = "utf-8")

    PROJECT_NAME: str = "Neliee LMS"
    DEBUG: bool = False                          # ← Cambiado: False por defecto

    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/neliee_db"

    SECRET_KEY: str = "Cambiar en produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    ALLOWED_HOSTS: List[str] = ["*"]

    FIRST_ADMIN_EMAIL: str = "admin@neelie.com"
    FIRST_ADMIN_PASSWORD: str = "admin1234"

    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    FRONTEND_URL: str = "http://localhost:5173"

    @field_validator("SECRET_KEY")
    @classmethod
    def validar_secret_key(cls, v: str) -> str:
        if v in _CLAVES_DEBILES or len(v) < 32:
            raise ValueError(
                "SECRET_KEY insegura o por defecto. "
                "Genera una con: python -c \"import secrets; print(secrets.token_hex(64))\""
            )
        return v
    
@lru_cache
def get_settings():
    return Settings()

settings = get_settings()