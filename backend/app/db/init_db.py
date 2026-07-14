# app/db/init_db.py
"""
Siembra el admin inicial. Si el esquema aún no existe, intenta aplicar Alembic
y, si no es posible, crea las tablas desde los modelos para que el arranque no falle.
"""

import asyncio
import os
import subprocess
import sys
from pathlib import Path

from sqlalchemy import select

from ..core.config import settings
from ..core.security import hash_password
from .database import AsyncSessionLocal
from ..models import models


async def ensure_schema_exists() -> None:
    """Asegura que las tablas existan antes de sembrar el admin."""
    backend_dir = Path(__file__).resolve().parents[2]

    try:
        env = os.environ.copy()
        env.setdefault("PYTHONPATH", str(backend_dir))
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=str(backend_dir),
            env=env,
            capture_output=True,
            text=True,
            check=True,
        )
        if result.stdout:
            print(result.stdout.strip())
        print("✅ Migraciones Alembic aplicadas.")
    except subprocess.CalledProcessError as exc:
     print(exc.stdout)
     print(exc.stderr)
     raise RuntimeError(
        "No se pudieron aplicar las migraciones de Alembic."
    ) from exc


async def init_db() -> None:
    await ensure_schema_exists()

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