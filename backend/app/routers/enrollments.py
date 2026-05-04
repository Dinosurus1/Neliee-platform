# POST /admin/enroll, GET /me/enrollments
# app/routers/enrollments.py

#Prefix: /api/v1/enrollments
  #GET  /me              → cursos de la empleada autenticada
  #POST /admin           → inscribir empleada a curso (admin)
  #DELETE /admin/{id}    → quitar inscripción (admin)
  #PATCH /me/{id}/complete → marcar como completado (empleada)

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user, get_db, require_admin
from app.models.models import Enrollment, User
from app.schemas.enrollment import EnrollmentCreate, EnrollmentOut


router = APIRouter()


@router.get("/me", response_model=list[EnrollmentOut])
async def my_enrollments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.course))
        .where(Enrollment.user_id == current_user.id)
        .order_by(Enrollment.enrolled_at)
    )
    return result.scalars().all()


@router.post("/admin", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
async def enroll_user(
    payload: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    # Evitar inscripciones duplicadas
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == payload.user_id,
            Enrollment.course_id == payload.course_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="La usuaria ya está inscrita en este curso.")

    enrollment = Enrollment(user_id=payload.user_id, course_id=payload.course_id)
    db.add(enrollment)
    await db.flush()

    result = await db.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.course))
        .where(Enrollment.id == enrollment.id)
    )
    return result.scalar_one()


@router.delete("/admin/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_enrollment(
    enrollment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Enrollment).where(Enrollment.id == enrollment_id))
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada.")
    await db.delete(enrollment)


@router.patch("/me/{enrollment_id}/complete", response_model=EnrollmentOut)
async def mark_complete(
    enrollment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.course))
        .where(Enrollment.id == enrollment_id, Enrollment.user_id == current_user.id)
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada.")

    enrollment.completed = True
    enrollment.completed_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(enrollment)
    return enrollment