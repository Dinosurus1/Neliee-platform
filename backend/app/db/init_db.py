#script para crear la base de datos y las tablas necesarias
# app/db/init_db.py

#Crea las tablas (si no existen) e inserta el primer admin.
#Se ejecuta una sola vez en el lifespan de FastAPI.


from sqlalchemy import select

from ..core.config import Settings
from ..core.security import hash_password
from .database import engine, AsyncSessionLocal
from ..models import models  # Importar para que Base conozca los modelos
from .database import Base


async def init_db() -> None:
    # 1. Crear tablas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Seed: crear admin inicial si no existe
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(models.User).where(models.User.email == Settings.FIRST_ADMIN_EMAIL)
        )
        if result.scalar_one_or_none() is None:
            admin = models.User(
                full_name="Administrador",
                email=Settings.FIRST_ADMIN_EMAIL,
                hashed_password=hash_password(Settings.FIRST_ADMIN_PASSWORD),
                role="admin",
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            print(f"✅ Admin seed creado: {Settings.FIRST_ADMIN_EMAIL}")
        else:
            print("ℹ️  Admin ya existe, omitiendo seed.")