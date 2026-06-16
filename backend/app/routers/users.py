# CRUD /admin/users (rol admin)
# app/routers/users.py

#CRUD de usuarios — solo accesible por admins.
#Prefix: /api/v1/admin/users

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ..core.dependencies import get_db, require_admin
from ..core.security import hash_password
from ..models.models import Enrollment, User
from ..schemas.user import UserCreate, UserOut, UserUpdate


router = APIRouter()

# Endpoints
@router.get("/", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
    select(User)
    .options(
        selectinload(User.enrollments).selectinload(Enrollment.course)
    )
    .where(User.role == "employee")
    .order_by(User.full_name)
)
    return result.scalars().all()

# Solo admins pueden crear/editar/eliminar usuarios, no pueden cambiar roles ni eliminar admins existentes
@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    # Verificar email único
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El email ya está registrado.")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="employee",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user, attribute_names=["enrollments"])
    return user

# Solo admins pueden editar usuarios, no pueden cambiar roles ni eliminar admins existentes
@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="No puedes modificar tu propia cuenta desde aquí.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuaria no encontrada.")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="No puedes modificar cuentas de administrador.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuaria no encontrada.")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.email is not None:
        user.email = payload.email
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    if payload.is_active is not None:
        user.is_active = payload.is_active

    await db.flush()
    await db.refresh(user, attribute_names=["enrollments"])
    return user

#El endpoint de eliminación es opcional, se puede deshabilitar para evitar borrados accidentales. Si se implementa, solo admins pueden eliminar usuarios, no pueden eliminar admins existentes.
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuaria no encontrada.")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="No puedes eliminar cuentas de administrador.")
    await db.delete(user)