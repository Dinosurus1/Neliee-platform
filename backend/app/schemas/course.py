#Pydantic: CourseCreate, CourseOut, CourseUpdate, etc... para validacion de datos en las rutas y servicios relacionados con cursos
# app/schemas/course.py

import uuid
from pydantic import BaseModel

#creacion y actualizacion de cursos (admin)
class CourseCreate(BaseModel):
    title: str
    description: str | None = None
    gdrive_video_id: str
    order: int = 0
    is_published: bool = False


class CourseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    gdrive_video_id: str | None = None
    order: int | None = None
    is_published: bool | None = None


class CourseOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    gdrive_video_id: str
    order: int
    is_published: bool

    model_config = {"from_attributes": True}