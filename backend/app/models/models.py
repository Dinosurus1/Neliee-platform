#ORM: User, Course, Enrollment, etc... con SQLAlchemy y Pydantic para validacion de datos
# app/models/models.py
"""
Modelos ORM con SQLAlchemy 2.x (sintaxis Mapped / mapped_column).
Tablas: users, courses, enrollments
"""



import uuid
from datetime import datetime, timezone, timedelta

from typing import List
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, func, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base
from ..core.config import settings


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
    enrollments: Mapped[List["Enrollment"]] = relationship(
        "Enrollment", back_populates="user", cascade="all, delete-orphan"
    )
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
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
    description: Mapped[str|None]  = mapped_column(Text, nullable=True)

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
    enrollments: Mapped[List["Enrollment"]] = relationship(
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
    completed_at: Mapped[datetime| None] = mapped_column(
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
    
class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4

    )
    user_id: Mapped[uuid.UUID| None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    tfa_code: Mapped[str|None] = mapped_column(String(6), nullable=True)
    expires_at: Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    successful: Mapped[bool] = mapped_column(Boolean, nullable=False)

    def __repr__(self) -> str:
        status = "SUCCESS" if self.successful else "FAILURE"
        return f"<LoginAttempt {self.email} at {self.timestamp} - {status}>"

class DeviceSession(Base):
    __tablename__ = "device_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    device_info: Mapped[str] = mapped_column(String(255), nullable=False)
    last_active: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<DeviceSession user_id={self.user_id} device='{self.device_info}'>"
    
    
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    family_id: Mapped [uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(512), 
        unique=True, 
        index=True, 
        nullable=False)
    
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), 
        nullable=False
    )
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")

    def __repr__(self) -> str:
        return f"<RefreshToken id={self.id} user_id={self.user_id} revoked={self.is_revoked}>"
        
        
class Invitation(Base):
    """
    Token de invitación enviado por un admin para que una empleada active su cuenta.
    El token crudo viaja en el correo; aquí guardamos solo su hash SHA-256.
    """
    __tablename__ = "invitations"
 
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
 
    # Email al que se envió la invitación
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
 
    # SHA-256 del token crudo (64 hex chars)
    token_hash: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
 
    # Admin que envió la invitación (SET NULL si el admin se elimina)
    invited_by: Mapped[uuid.UUID| None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
 
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
 
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
 
    # Relación de lectura (sin back_populates — solo la necesitamos en una dirección)
    invited_by_user: Mapped["User|None"] = relationship(
        "User", foreign_keys=[invited_by]
    )
 
    def __repr__(self) -> str:
        return f"<Invitation email={self.email} used={self.is_used}>"


# ─────────────────────────────────────────────────────────────────────────────
# INSTRUCCIONES: pegar al final de app/models/models.py
# También añadir Index al import de sqlalchemy si no está:
#   from sqlalchemy import ..., Index
# ─────────────────────────────────────────────────────────────────────────────


class VideoView(Base):
    """
    Registra cada vez que una empleada carga el video embed de un curso.
    Permite al admin ver quién vio qué, cuántas veces y cuándo.
    Se crea una fila por cada carga del iframe (no por cada segundo de reproducción).
    """
    __tablename__ = "video_views"
    __table_args__ = (
        # Índice compuesto para las queries más frecuentes del admin:
        # "todos los viewers de un curso" y "todo lo que vio una usuaria"
        Index("ix_video_view_course_user", "course_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
    )
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User")
    course: Mapped["Course"] = relationship("Course")

    def __repr__(self) -> str:
        return f"<VideoView user={self.user_id} course={self.course_id}>"