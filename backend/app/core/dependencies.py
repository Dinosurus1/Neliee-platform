#get_db, get_current_user, require_admin, etc... dependencias para las rutas y servicios de la aplicacion
# app/core/dependencies.py

#Dependencias reutilizables de FastAPI:
 # - get_db         → sesión async de BD
  #- get_current_user  → usuario autenticado por JWT
  #- require_admin  → guard de rol admin


import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .security import decode_token
from ..db.database import get_db
from ..models.models import Enrollment, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extrae y valida el JWT; devuelve el usuario activo."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(
        select(User)
        .options(selectinload(User.enrollments).selectinload(Enrollment.course))
        .where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception

    return user


async def require_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """Guard: solo usuarios con rol 'admin' pueden continuar."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción.",
        )
    return current_user