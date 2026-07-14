# app/db/init_db.py
"""
Siembra el admin inicial. La creación/migración del esquema ahora la maneja
Alembic exclusivamente (alembic upgrade head), no este módulo.
"""

from sqlalchemy import select

from ..core.config import settings
from ..core.security import hash_password
from .database import AsyncSessionLocal
from ..models import models


async def init_db() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(models.User).where(models.User.email == settings.FIRST_ADMIN_EMAIL)
        )
        if result.scalar_one_or_none() is None:
            admin = models.User(
                full_name="Administrador",
                email=settings.FIRST_ADMIN_EMAIL,
                hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
                role="admin",
                is_active=True,
                must_change_password=True,
            )
            session.add(admin)
            await session.commit()
            print(f"✅ Admin seed creado: {settings.FIRST_ADMIN_EMAIL}")
            print("⚠️  Debe cambiar la contraseña en el primer inicio de sesión.")
        else:
            print("ℹ️  Admin ya existe, omitiendo seed.")