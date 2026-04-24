#settings (pydantics BaseSettings) para la configuracion de la aplicacion, con variables de entorno y valores por defecto
#app/core/config.py
#configuracion centralizada con pydantic BaseSettings para la aplicacion, incluyendo variables de entorno y valores por defecto para la base de datos, JWT, etc...

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # settings para la base de datos
    model_config = SettingsConfigDict(env_file = ".env", env_file_encoding = "utf-8")

    #proyecto

    PROJECT_NAME: str = "Neliee LMS"
    DEBUG: bool = True


    #base de datos
    #formato: postgresql+asyncpg://user:password@host:5432/dbname
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/neliee_db"

    #JWT

    SECRET_KEY: str = "Cambiar en produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480 # 8 horas

    #en produccion [https://neliee.com, https://admin.neliee.com
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    ALLOWED_HOSTS: List[str] = ["*"]

    #admin seed (primer arranque)

    FIRST_ADMIN_EMAIL: str = "admin@neelie.com"
    FIRST_ADMIN_PASSWORD: str = "admin1234" #cambiar tras primer login

# Función para cargar la configuración con caching para evitar recargas innecesarias
@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
    