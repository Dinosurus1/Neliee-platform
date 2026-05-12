#ORM: User, Course, Enrollment, etc... con SQLAlchemy y Pydantic para validacion de datos
# app/models/models.py
"""
Modelos ORM con SQLAlchemy 2.x (sintaxis Mapped / mapped_column).
Tablas: users, courses, enrollments
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base



# Helpers

def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# User

class User(Base):
    __tablename__ = "users"

    # Usamos UUID nativo de PostgreSQL para mayor robustez
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Roles: "employee" | "admin"
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="employee")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps automáticos con el servidor
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relación inversa: cursos en los que está inscrita
    enrollments: Mapped[list["Enrollment"]] = relationship(
        "Enrollment", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User {self.email} [{self.role}]>"



# Course

class Course(Base):
    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ID del video en Google Drive (el frontend arma el iframe con este dato)
    # Formato iframe: https://drive.google.com/file/d/{gdrive_video_id}/preview
    gdrive_video_id: Mapped[str] = mapped_column(String(200), nullable=False)

    # Orden de aparición en el dashboard
    order: Mapped[int] = mapped_column(default=0, nullable=False)

    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relación inversa
    enrollments: Mapped[list["Enrollment"]] = relationship(
        "Enrollment", back_populates="course", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Course '{self.title}'>"



# Enrollment  (tabla intermedia User ↔ Course con progreso)

class Enrollment(Base):
    """
    Registra qué empleada tiene acceso a qué capacitación.
    Un admin crea estas relaciones desde el panel.
    """

    __tablename__ = "enrollments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )

    # Progreso simple: False = no completado, True = completado
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relaciones ORM
    user: Mapped["User"] = relationship("User", back_populates="enrollments")
    course: Mapped["Course"] = relationship("Course", back_populates="enrollments")

    def __repr__(self) -> str:
        return f"<Enrollment user={self.user_id} course={self.course_id}>"