# app/routers/enrollments.py
"""
Gestión de inscripciones.
Prefix: /api/v1/enrollments

GET    /me                    → inscripciones de la empleada autenticada
POST   /admin                 → inscribir empleada a curso (admin)
DELETE /admin/{id}            → quitar inscripción (admin)
PATCH  /me/{id}/complete      → marcar como completado (empleada)
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from ..core.dependencies import get_current_user, get_db, require_admin
from ..models.models import Course, Enrollment, User
from ..schemas.enrollment import EnrollmentCreate, EnrollmentOut

router = APIRouter()



# Empleada: ver sus inscripciones


@router.get("/me", response_model=list[EnrollmentOut])
async def my_enrollments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna las inscripciones y progreso de la usuaria autenticada."""
    result = await db.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.course))
        .where(Enrollment.user_id == current_user.id)
        .order_by(Enrollment.enrolled_at)
    )
    return result.scalars().all()



# Admin: gestionar inscripciones

@router.post("/admin", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
async def enroll_user(
    payload: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Inscribe a una empleada en un curso. Solo admins."""

    # FIX: verificar que el usuario existe antes de inscribir.
    # Sin esta comprobación, un user_id inválido produce un error 500
    # de constraint de FK en lugar de un 404 claro.
    user_result = await db.execute(select(User).where(User.id == payload.user_id))
    if not user_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )

    # FIX: verificar que el curso existe
    course_result = await db.execute(select(Course).where(Course.id == payload.course_id))
    if not course_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado.",
        )

    # Evitar inscripciones duplicadas (también cubierto por UniqueConstraint en el modelo)
    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == payload.user_id,
            Enrollment.course_id == payload.course_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La usuaria ya está inscrita en este curso.",
        )

    enrollment = Enrollment(user_id=payload.user_id, course_id=payload.course_id)
    db.add(enrollment)
    try:
        await db.flush()
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La usuaria ya está inscrita en este curso.",
        )

    # Recargar con relación course para el response
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
    """Elimina una inscripción. Solo admins."""
    result = await db.execute(
        select(Enrollment).where(Enrollment.id == enrollment_id)
    )
    enrollment = result.scalar_one_or_none()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inscripción no encontrada.",
        )

    await db.delete(enrollment)
    await db.commit()


# Empleada: marcar curso como completado


@router.patch("/me/{enrollment_id}/complete", response_model=EnrollmentOut)
async def mark_complete(
    enrollment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marca una inscripción como completada.
    Solo puede hacerlo la propia usuaria (IDOR check: Enrollment.user_id == current_user.id).
    """
    result = await db.execute(
        select(Enrollment)
        .options(selectinload(Enrollment.course))
        # La condición user_id previene que una usuaria complete inscripciones ajenas
        .where(Enrollment.id == enrollment_id, Enrollment.user_id == current_user.id)
    )
    enrollment = result.scalar_one_or_none()

    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inscripción no encontrada.",
        )

    # FIX: idempotencia — si ya está completada, no hacemos nada (ni un commit innecesario)
    if enrollment.completed:
        return enrollment

    enrollment.completed = True
    enrollment.completed_at = datetime.now(timezone.utc)

    # FIX: faltaba commit()
    await db.flush()
    await db.commit()
    await db.refresh(enrollment)
    return enrollment