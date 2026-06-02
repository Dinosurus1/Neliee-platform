#pydantic: EnrollmentCreate, EnrollmentOut, EnrollmentUpdate, etc... para validacion de datos en las rutas y servicios relacionados con inscripciones
# app/schemas/enrollment.py
import uuid
from datetime import datetime
from pydantic import BaseModel
from .course import CourseOut

#creacion de inscripcion (admin), no se necesita update porque solo se puede marcar como completada, lo cual se hace con un endpoint específico
class EnrollmentCreate(BaseModel):
    user_id: uuid.UUID
    course_id: uuid.UUID


class EnrollmentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    completed: bool
    completed_at: datetime | None
    enrolled_at: datetime
    course: CourseOut

    model_config = {"from_attributes": True}