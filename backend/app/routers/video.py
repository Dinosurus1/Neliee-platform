# app/routers/video.py
"""
Endpoints de acceso seguro a videos.
Prefix: /api/v1

GET  /courses/{course_id}/watch           → empleada obtiene URL firmada del embed
GET  /video/{token}                       → serve el HTML del iframe (logs la vista)
GET  /admin/courses/{course_id}/viewers   → admin ve quién vio el curso y cuándo
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.dependencies import get_current_user, get_db, require_admin
from ..core.gdrive_lms import generate_video_token, verify_video_token
from ..models.models import Course, Enrollment, User, VideoView
from ..schemas.video import VideoAccessOut, ViewerOut

router = APIRouter()


# GET /courses/{course_id}/watch — empleada autenticada


@router.get("/courses/{course_id}/watch", response_model=VideoAccessOut)
async def get_video_access(
    course_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve una URL de embed válida por 2 horas.
    Comprobaciones: curso publicado + empleada inscrita.
    El gdrive_video_id va cifrado dentro del token, nunca en la respuesta.
    """
    # 1. Curso existe y está publicado
    course_result = await db.execute(
        select(Course).where(
            Course.id == course_id,
            Course.is_published == True,  # noqa: E712
        )
    )
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.")

    # 2. Empleada inscrita en el curso
    enrollment_result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
        )
    )
    if not enrollment_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este curso.",
        )

    # 3. Generar token firmado
    token = generate_video_token(
        user_id=str(current_user.id),
        course_id=str(course_id),
        gdrive_video_id=course.gdrive_video_id,
    )

    # url_for construye la URL completa usando el host real de la request
    embed_url = str(request.url_for("serve_video_embed", token=token))

    return VideoAccessOut(embed_url=embed_url, expires_in_seconds=7_200)



# GET /video/{token} — endpoint del iframe (sin autenticación, el token es el guard)


_HTML_ERROR = """<html>
<body style="margin:0;background:#111;color:#fff;display:flex;height:100vh;
             align-items:center;justify-content:center;font-family:sans-serif">
  <p>Enlace inválido o expirado. Vuelve al curso y recarga la página.</p>
</body></html>"""

_HTML_EMBED = """<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{{margin:0;padding:0;box-sizing:border-box}}
    body{{background:#000;width:100vw;height:100vh;overflow:hidden}}
    iframe{{width:100%;height:100%;border:none;display:block}}
  </style>
</head>
<body>
  <iframe
    src="https://drive.google.com/file/d/{video_id}/preview"
    allow="autoplay; fullscreen"
    allowfullscreen
    referrerpolicy="no-referrer">
  </iframe>
</body>
</html>"""


@router.get("/video/{token}", response_class=HTMLResponse, name="serve_video_embed", include_in_schema=False)
async def serve_video_embed(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Valida el token y sirve el HTML con el embed de Google Drive.
    Este endpoint ES el src del iframe en el frontend.
    Cada carga registra una VideoView en la DB.

    Headers de seguridad devueltos:
    - Content-Security-Policy: frame-ancestors → solo el frontend puede embeber este iframe
    - Cache-Control: no-store → cada carga valida el token de nuevo
    - X-Frame-Options: no se usa (reemplazado por CSP frame-ancestors en navegadores modernos)
    """
    payload = verify_video_token(token)

    if not payload:
        return HTMLResponse(
            content=_HTML_ERROR,
            status_code=status.HTTP_403_FORBIDDEN,
            headers={"Cache-Control": "no-store"},
        )

    # Registrar la vista (fire-and-forget dentro de la misma request)
    view = VideoView(
        user_id=uuid.UUID(payload["uid"]),
        course_id=uuid.UUID(payload["cid"]),
    )
    db.add(view)
    await db.commit()

    return HTMLResponse(
        content=_HTML_EMBED.format(video_id=payload["vid"]),
        headers={
            # Impide que este HTML sea embebido desde otro dominio
            "Content-Security-Policy": f"frame-ancestors {settings.FRONTEND_URL}",
            # Sin caché: cada carga del iframe debe pasar por aquí
            "Cache-Control": "no-store",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /admin/courses/{course_id}/viewers — solo admins
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/courses/{course_id}/viewers", response_model=list[ViewerOut])
async def list_course_viewers(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Admin ve qué empleadas vieron el video del curso, cuántas veces y cuándo fue la última.
    """
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    if not course_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.")

    result = await db.execute(
        select(
            User.id.label("user_id"),
            User.full_name,
            User.email,
            func.count(VideoView.id).label("view_count"),
            func.max(VideoView.viewed_at).label("last_viewed_at"),
        )
        .join(VideoView, VideoView.user_id == User.id)
        .where(VideoView.course_id == course_id)
        .group_by(User.id, User.full_name, User.email)
        .order_by(func.max(VideoView.viewed_at).desc())
    )

    return [ViewerOut.model_validate(row._asdict()) for row in result.all()]