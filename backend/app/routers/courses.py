# app/routers/courses.py
"""
CRUD de cursos.
Prefix: /api/v1/courses

GET  /           → lista pública (solo publicados)
GET  /admin      → todos los cursos (admin)
POST /admin      → crear curso (admin)
PATCH/DELETE     → admin
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_current_user, get_db, require_admin
from ..models.models import Course, User
from ..schemas.course import CourseCreate, CourseOut, CourseUpdate

router = APIRouter()


# ---------------------------------------------------------------------------
# Rutas públicas (empleadas autenticadas o cualquier usuario)
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[CourseOut])
async def list_published_courses(db: AsyncSession = Depends(get_db)):
    """Lista cursos publicados. No requiere autenticación."""
    result = await db.execute(
        select(Course)
        .where(Course.is_published == True)  # noqa: E712
        .order_by(Course.order)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Rutas admin
# ---------------------------------------------------------------------------

@router.get("/admin", response_model=list[CourseOut])
async def list_all_courses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Lista todos los cursos (publicados y no publicados). Solo admins."""
    result = await db.execute(select(Course).order_by(Course.order))
    return result.scalars().all()


@router.post("/admin", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Crea un curso nuevo. Solo admins."""
    course = Course(**payload.model_dump())
    db.add(course)
    # FIX: flush() + commit() en lugar de solo flush().
    # flush() envía el INSERT a la DB pero NO confirma la transacción.
    # Sin commit(), al cerrar la sesión el ORM hace rollback silencioso
    # y el registro desaparece. El refresh() después del commit() recarga
    # los valores generados por el servidor (created_at, id, etc.).
    await db.flush()
    await db.commit()
    await db.refresh(course)
    return course


@router.patch("/admin/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: uuid.UUID,
    payload: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Actualiza campos de un curso. Solo admins."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)

    # FIX: mismo problema — faltaba commit()
    await db.flush()
    await db.commit()
    await db.refresh(course)
    return course


@router.delete("/admin/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Elimina un curso. Solo admins."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()

    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.")

    await db.delete(course)
    # FIX: faltaba commit() — sin esto el DELETE nunca se confirma
    await db.commit()