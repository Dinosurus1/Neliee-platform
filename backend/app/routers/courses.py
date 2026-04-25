#CRUD /admin/courses + GET /courses/me
# app/routers/courses.py

#Prefix: /api/v1/courses
  #GET  /           → lista pública (publicados)
  #GET  /admin      → todos los cursos (admin)
  #POST /admin      → crear curso (admin)
  #PATCH/DELETE     → admin
  #GET  /me         → cursos de la empleada autenticada

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin
from app.models.models import Course, User
from app.schemas.course import CourseCreate, CourseOut, CourseUpdate

router = APIRouter()


# Ruta pública 
@router.get("/", response_model=list[CourseOut])
async def list_published_courses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Course).where(Course.is_published == True).order_by(Course.order)
    )
    return result.scalars().all()


# Rutas admin 
@router.get("/admin", response_model=list[CourseOut])
async def list_all_courses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Course).order_by(Course.order))
    return result.scalars().all()


@router.post("/admin", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    course = Course(**payload.model_dump())
    db.add(course)
    await db.flush()
    await db.refresh(course)
    return course


@router.patch("/admin/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: uuid.UUID,
    payload: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(course, field, value)

    await db.flush()
    await db.refresh(course)
    return course


@router.delete("/admin/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado.")
    await db.delete(course)