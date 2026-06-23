# app/core/config.py
"""
Configuración centralizada con Pydantic BaseSettings.
Carga variables desde .env y valida que los valores sean seguros antes de arrancar.
"""
from functools import lru_cache
from typing import List

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Valores que NUNCA deben llegar a producción
_CLAVES_DEBILES = {
    "Cambiar en produccion",
    "cambiar_esto_con_openssl_rand_hex_32_en_produccion",
    "admin1234",
    "Admin1234",
    "secret",
    "changeme",
    "password",
    "12345678",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # ── General ────────────────────────────────────────────────────────────
    PROJECT_NAME: str = "Neliee LMS"
    DEBUG: bool = False  # False por defecto: nunca activar en producción por error

    # ── Base de datos ──────────────────────────────────────────────────────
    # FIX: no incluir credenciales reales en el default; forzar configuración explícita
    DATABASE_URL: str = "postgresql+asyncpg://user:CHANGE_ME@localhost:5432/neliee_db"

    # ── JWT ────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "Cambiar en produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── CORS / Hosts ───────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    # FIX: default vacío en lugar de ["*"] para que el error en producción sea obvio.
    # El model_validator de abajo rechaza ["*"] cuando DEBUG=False.
    ALLOWED_HOSTS: List[str] = ["*"]

    # ── Seed de admin inicial ──────────────────────────────────────────────
    FIRST_ADMIN_EMAIL: str = "admin@neliee.com"
    FIRST_ADMIN_PASSWORD: str = "Cambiar en produccion"

    # ── Correo ─────────────────────────────────────────────────────────────
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"

    # ── Frontend ───────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Validators de campo individual ─────────────────────────────────────

    @field_validator("SECRET_KEY")
    @classmethod
    def validar_secret_key(cls, v: str) -> str:
        """Rechaza claves débiles o cortas en cualquier entorno."""
        if v in _CLAVES_DEBILES or len(v) < 32:
            raise ValueError(
                "SECRET_KEY insegura o por defecto. "
                "Genera una con:\n"
                "  python -c \"import secrets; print(secrets.token_hex(64))\""
            )
        return v

    @field_validator("ALGORITHM")
    @classmethod
    def validar_algoritmo(cls, v: str) -> str:
        """Solo permite algoritmos seguros conocidos."""
        algoritmos_seguros = {"HS256", "HS384", "HS512", "RS256", "RS384", "RS512"}
        if v not in algoritmos_seguros:
            raise ValueError(f"ALGORITHM inválido. Usa uno de: {algoritmos_seguros}")
        return v

    # ── Validator cruzado (requiere todos los campos ya cargados) ──────────

    @model_validator(mode="after")
    def validar_configuracion_produccion(self) -> "Settings":
        """
        Valida restricciones que solo aplican en producción (DEBUG=False).
        Un entorno de desarrollo puede usar valores más relajados,
        pero producción no debe arrancar con configuraciones inseguras.
        """
        if self.DEBUG:
            return self  # En desarrollo no bloqueamos el arranque

        errores: list[str] = []

        # 1. FIRST_ADMIN_PASSWORD no debe ser débil ni el default
        if (
            self.FIRST_ADMIN_PASSWORD in _CLAVES_DEBILES
            or len(self.FIRST_ADMIN_PASSWORD) < 12
        ):
            errores.append(
                "FIRST_ADMIN_PASSWORD insegura para producción "
                "(mínimo 12 caracteres, sin valores por defecto)."
            )

        # 2. ALLOWED_HOSTS no debe ser comodín en producción
        if "*" in self.ALLOWED_HOSTS:
            errores.append(
                "ALLOWED_HOSTS=['*'] deshabilita TrustedHostMiddleware en producción. "
                "Especifica los hosts reales, por ejemplo: ['api.neliee.com']."
            )

        # 3. ALLOWED_ORIGINS no debe contener localhost en producción
        orígenes_locales = [o for o in self.ALLOWED_ORIGINS if "localhost" in o or "127.0.0.1" in o]
        if orígenes_locales:
            errores.append(
                f"ALLOWED_ORIGINS contiene orígenes locales en producción: {orígenes_locales}. "
                "Usa solo URLs de producción con HTTPS."
            )

        # 4. FRONTEND_URL debe usar HTTPS en producción
        if self.FRONTEND_URL.startswith("http://"):
            errores.append(
                f"FRONTEND_URL usa HTTP en producción: {self.FRONTEND_URL}. "
                "Debe usar HTTPS."
            )

        # 5. DATABASE_URL no debe contener la contraseña por defecto
        if "CHANGE_ME" in self.DATABASE_URL or "password" in self.DATABASE_URL.lower().split("@")[0]:
            errores.append(
                "DATABASE_URL parece usar credenciales por defecto. "
                "Configura credenciales reales en .env."
            )

        if errores:
            lista = "\n  - ".join(errores)
            raise ValueError(
                f"Configuración insegura para producción (DEBUG=False):\n  - {lista}"
            )

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()