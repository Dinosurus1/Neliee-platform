#AsyncEngine + SessionLocal + Base
#configuracion de la base de datos asincrona con SQLalchemy 2.x
#compatible con Supabase, Neon, Railway, Render (todos usan PostgreSQL)

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from typing import AsyncGenerator
from ..core.config import settings


#engine asincrono

engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=settings.DEBUG, #log SQL en consola en modo debug
    pool_pre_ping=True, #reconecta si la conexión se pierde

    pool_size=5, #suficiente para 30 usuarios concurrentes, ajustar según necesidades
    max_overflow=10, #permitir picos de hasta 15 conexiones
)


#sesion factory

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False, #evitar que los objetos se vuelvan obsoletos tras commit
    autoflush=False, #control manual del flush para optimizar rendimiento
    autocommit=False, #control manual del commit para mayor flexibilidad
)

#base declarativa para los modelos ORM
class Base(DeclarativeBase):
    pass
 
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit() #commit al final de cada request, manejar transacciones manualmente para mayor control
        except Exception as e:
            await session.rollback() #rollback en caso de error para mantener integridad
            raise
