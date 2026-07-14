# app/routers/users.py
"""
CRUD de usuarios — solo accesible por admins.
Prefix: /api/v1/admin/users
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from ..core.dependencies import get_db, require_admin
from ..core.security import hash_password
from ..models.models import Enrollment, User
from ..schemas.user import  UserOut, UserUpdate

router = APIRouter()



# Helper interno


async def _get_user_with_enrollments(user_id: uuid.UUID, db: AsyncSession) -> User:
    """Recarga el usuario con sus inscripciones después de un commit."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.enrollments).selectinload(Enrollment.course))
        .where(User.id == user_id)
    )
    return result.scalar_one()



# GET /


@router.get("/", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Lista todas las empleadas con sus inscripciones. Solo admins."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.enrollments).selectinload(Enrollment.course))
        .where(User.role == "employee")
        .order_by(User.full_name)
    )
    return result.scalars().all()



# POST /




# PATCH /{user_id}


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Actualiza datos de una empleada. Solo admins."""
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes modificar tu propia cuenta desde aquí.",
        )

    # FIX: una sola consulta (el original hacía la misma query dos veces)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuaria no encontrada.")
    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes modificar cuentas de administrador.",
        )

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        # Verificar que el nuevo email no esté en uso por otra cuenta
        conflict = await db.execute(
            select(User).where(User.email == payload.email, User.id != user_id)
        )
        if conflict.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está en uso por otra cuenta.",
            )
        user.email = payload.email
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    if payload.is_active is not None:
        user.is_active = payload.is_active

    # FIX: faltaba commit()
    await db.flush()
    await db.commit()

    return await _get_user_with_enrollments(user.id, db)



# DELETE /{user_id}


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Elimina una empleada. Solo admins. No se puede eliminar a uno mismo ni a otros admins."""
    # FIX: protección contra auto-eliminación (faltaba en el original)
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propia cuenta.",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuaria no encontrada.")
    if user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No puedes eliminar cuentas de administrador.",
        )

    await db.delete(user)
    # FIX: faltaba commit()
    await db.commit()