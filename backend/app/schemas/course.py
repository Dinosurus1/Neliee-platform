#Pydantic: CourseCreate, CourseOut, CourseUpdate, etc... para validacion de datos en las rutas y servicios relacionados con cursos
# app/schemas/course.py

import uuid
from pydantic import BaseModel, Field

#creacion y actualizacion de cursos (admin)
class CourseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    gdrive_video_id: str = Field(..., min_length=10, max_length=200,
                                  pattern=r'^[a-zA-Z0-9_-]+$')   # solo chars válidos de Drive
    order: int = Field(0, ge=0, le=9999)
    is_published: bool = False

class CourseUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    gdrive_video_id: str | None = Field(None, min_length=10, max_length=200,
                                         pattern=r'^[a-zA-Z0-9_-]+$')
    order: int | None = Field(None, ge=0, le=9999)
    is_published: bool | None = None


class CourseOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    gdrive_video_id: str
    order: int
    is_published: bool

    model_config = {"from_attributes": True}