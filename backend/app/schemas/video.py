# app/schemas/video.py
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VideoAccessOut(BaseModel):
    """Respuesta al solicitar acceso al video de un curso."""
    embed_url: str          # URL firmada del iframe — apunta al backend, no a Drive
    expires_in_seconds: int  # Duración del token (7200 = 2 horas)


class ViewerOut(BaseModel):
    """Fila en el reporte de vistas de un curso para el admin."""
    user_id: uuid.UUID
    full_name: str
    email: str
    view_count: int
    last_viewed_at: datetime

    model_config = ConfigDict(from_attributes=True)