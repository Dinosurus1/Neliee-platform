# app/core/mail.py
"""
Utilidad de envío de correos usando fastapi-mail.
Las credenciales vienen de config.py (MAIL_* variables en .env).
"""
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from .config import settings

_conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=True,   # Gmail/SMTP estándar usa STARTTLS en 587
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)

_fm = FastMail(_conf)


async def send_invitation_email(
    to_email: str,
    raw_token: str,
    invited_by_name: str,
) -> None:
    """
    Envía el correo de invitación con el enlace de activación.
    Se llama desde BackgroundTasks para no bloquear el response al admin.
    """
    activate_url = f"{settings.FRONTEND_URL}/activate?token={raw_token}"

    body = f"""
    <html>
    <body style="font-family:sans-serif;color:#333;max-width:520px;margin:auto;padding:32px 24px;">
      <h2 style="color:#1D9E75;">Bienvenida a {settings.PROJECT_NAME}</h2>
      <p><strong>{invited_by_name}</strong> te invitó a acceder a la plataforma de capacitación.</p>
      <p>Haz clic en el botón para crear tu contraseña y activar tu cuenta:</p>
      <p style="margin:28px 0;">
        <a href="{activate_url}"
           style="background:#1D9E75;color:#fff;padding:12px 28px;
                  border-radius:8px;text-decoration:none;font-weight:500;font-size:15px;">
          Activar mi cuenta
        </a>
      </p>
      <p style="color:#888;font-size:13px;margin-top:32px;border-top:1px solid #eee;padding-top:16px;">
        Este enlace expira en <strong>7 días</strong>.<br>
        Si no esperabas esta invitación, puedes ignorar este correo sin problema.
      </p>
    </body>
    </html>
    """

    message = MessageSchema(
        subject=f"Invitación a {settings.PROJECT_NAME}",
        recipients=[to_email],
        body=body,
        subtype=MessageType.html,
    )

    await _fm.send_message(message)