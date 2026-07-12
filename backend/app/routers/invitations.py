# app/routers/invitations.py
"""
Flujo de invitación por correo.
Prefix: /api/v1/invitations

GET  /pending   → admin lista invitaciones pendientes (no usadas, no expiradas)
POST /send      → admin envía invitación a un email
POST /activate  → empleada activa su cuenta con el token del correo
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_db, require_admin
from ..core.mail import send_invitation_email
from ..core.security import hash_password
from ..models.models import Invitation, User
from ..schemas.invitation import ActivateAccount, InvitationCreate, InvitationOut

router = APIRouter()

_EXPIRE_DAYS = 7

# ─── helpers de token ────────────────────────────────────────────────────────

def _generate_token() -> str:
    """Token crudo de 48 bytes (url-safe). Solo viaja en el correo, nunca en DB."""
    return secrets.token_urlsafe(48)


def _hash_token(token: str) -> str:
    """SHA-256 del token. Es lo que guardamos en la DB."""
    return hashlib.sha256(token.encode()).hexdigest()


# ─────────────────────────────────────────────────────────────────────────────
# GET /pending — solo admins
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/pending", response_model=list[InvitationOut])
async def list_pending_invitations(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Lista las invitaciones que aún no se han usado y no han expirado.
    El frontend las combina con la lista de usuarios para mostrar el estado 'Pendiente'.
    """
    result = await db.execute(
        select(Invitation)
        .where(
            Invitation.is_used == False,  # noqa: E712
            Invitation.expires_at > datetime.now(timezone.utc),
        )
        .order_by(Invitation.created_at.desc())
    )
    return result.scalars().all()


# ─────────────────────────────────────────────────────────────────────────────
# POST /send — solo admins
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/send", response_model=InvitationOut, status_code=status.HTTP_201_CREATED)
async def send_invitation(
    payload: InvitationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """
    Admin envía una invitación a un email.
    Si ya existe una invitación pendiente para ese email, la invalida y crea una nueva.
    """
    # 1. Verificar que el email no tenga ya una cuenta
    existing_user = await db.execute(select(User).where(User.email == payload.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email ya tiene una cuenta registrada.",
        )

    # 2. Invalidar invitaciones previas sin usar para este email
    prev_result = await db.execute(
        select(Invitation).where(
            Invitation.email == payload.email,
            Invitation.is_used == False,  # noqa: E712
        )
    )
    for old in prev_result.scalars().all():
        old.is_used = True

    # 3. Crear nueva invitación
    raw_token = _generate_token()
    invitation = Invitation(
        email=payload.email,
        token_hash=_hash_token(raw_token),
        invited_by=current_admin.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=_EXPIRE_DAYS),
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)

    # 4. Enviar correo en background — el admin recibe el 201 de inmediato
    background_tasks.add_task(
        send_invitation_email,
        to_email=payload.email,
        raw_token=raw_token,
        invited_by_name=current_admin.full_name,
    )

    return InvitationOut.model_validate(invitation)


# ─────────────────────────────────────────────────────────────────────────────
# POST /activate — público (no requiere autenticación)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/activate", status_code=status.HTTP_200_OK)
async def activate_account(
    payload: ActivateAccount,
    db: AsyncSession = Depends(get_db),
):
    """
    Empleada activa su cuenta con el token que llegó por correo.

    Seguridad:
    - Token inválido, expirado y ya usado devuelven el MISMO mensaje genérico
      para no revelar información sobre qué tokens existen.
    - La creación del usuario y el marcado del token como usado ocurren
      en un solo commit (atómico).
    """
    token_hash = _hash_token(payload.token)

    result = await db.execute(
        select(Invitation).where(Invitation.token_hash == token_hash)
    )
    invitation = result.scalar_one_or_none()

    # Mensaje genérico: no diferenciamos "no existe" de "expirado" de "ya usado"
    # para no filtrar información sobre el estado de los tokens.
    _invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="El enlace de invitación no es válido o ya expiró. Solicita uno nuevo al administrador.",
    )

    if not invitation:
        raise _invalid
    if invitation.is_used:
        raise _invalid
    if invitation.expires_at < datetime.now(timezone.utc):
        raise _invalid

    # Race condition: alguien registró el mismo email entre el envío y la activación
    existing = await db.execute(select(User).where(User.email == invitation.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este email ya tiene una cuenta activa.",
        )

    # Crear usuario + marcar token como usado en un solo commit
    new_user = User(
        full_name=payload.full_name,
        email=invitation.email,
        hashed_password=hash_password(payload.password),
        role="employee",
        is_active=True,
    )
    db.add(new_user)
    invitation.is_used = True
    await db.commit()

    return {"detail": "Cuenta activada correctamente. Ya puedes iniciar sesión."}


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /{invitation_id} — solo admins
# ─────────────────────────────────────────────────────────────────────────────

@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Cancela una invitación pendiente marcándola como usada.
    Se guarda el registro en DB (no se elimina) para auditoría.
    Devuelve 404 si no existe o ya fue aceptada/cancelada.
    """
    result = await db.execute(
        select(Invitation).where(
            Invitation.id == invitation_id,
            Invitation.is_used == False,  # noqa: E712
        )
    )
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitación no encontrada o ya fue procesada.",
        )

    invitation.is_used = True
    await db.commit()