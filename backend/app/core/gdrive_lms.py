# app/core/gdrive_lms.py
"""
Acceso seguro a videos de Google Drive mediante tokens firmados.

Flujo:
  1. Empleada solicita ver un curso  →  backend genera token firmado (2h)
  2. Backend devuelve URL del iframe  →  /api/v1/video/{token}
  3. Frontend pone esa URL como src del iframe
  4. El endpoint /video/{token} valida el token, registra la vista y devuelve
     el HTML con el embed de Google Drive

El gdrive_video_id NUNCA sale del backend hacia el frontend.

⚠️  Limitación conocida:
    Google Drive /preview ofrece protección básica (sin botón de descarga visible)
    pero no es DRM real. Un usuario técnico puede capturar el stream desde las
    DevTools. Para DRM empresarial real se necesita Cloudflare Stream, Vimeo OTT
    o AWS CloudFront con token signing.
"""
import base64
import hashlib
import hmac
import json
import time
from typing import Any

from .config import settings

_TTL_SECONDS = 7_200  # 2 horas por defecto


def generate_video_token(
    user_id: str,
    course_id: str,
    gdrive_video_id: str,
    ttl: int = _TTL_SECONDS,
) -> str:
    """
    Genera un token HMAC-SHA256 con el payload:
      uid  → user_id
      cid  → course_id
      vid  → gdrive_video_id  (viaja dentro del token, nunca en el response directo)
      exp  → unix timestamp de expiración

    El token tiene la forma:  base64url(payload).hmac_hex
    """
    payload: dict[str, Any] = {
        "uid": user_id,
        "cid": course_id,
        "vid": gdrive_video_id,
        "exp": int(time.time()) + ttl,
    }
    # Serializar y codificar sin padding para que sea URL-safe
    data = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode()
    ).decode().rstrip("=")

    sig = hmac.new(
        settings.SECRET_KEY.encode(),
        data.encode(),
        hashlib.sha256,
    ).hexdigest()

    return f"{data}.{sig}"


def verify_video_token(token: str) -> dict | None:
    """
    Valida la firma y la expiración del token.
    Devuelve el payload si es válido, None en cualquier fallo
    (sin revelar si fue firma inválida, expiración, o formato incorrecto).
    """
    try:
        data, sig = token.rsplit(".", 1)

        expected = hmac.new(
            settings.SECRET_KEY.encode(),
            data.encode(),
            hashlib.sha256,
        ).hexdigest()

        # Comparación en tiempo constante: previene timing attacks
        if not hmac.compare_digest(sig, expected):
            return None

        # Restaurar el padding de base64 que quitamos al generar
        padding = (4 - len(data) % 4) % 4
        payload = json.loads(
            base64.urlsafe_b64decode(data + "=" * padding).decode()
        )

        if payload.get("exp", 0) < time.time():
            return None

        return payload

    except Exception:
        return None