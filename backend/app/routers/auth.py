# app/routers/auth.py
"""
Endpoints de autenticación.
Fixes aplicados:
  1. Rate limiting en /login usando la tabla LoginAttempt.
  2. SELECT FOR UPDATE en /refresh para eliminar la race condition.
  3. Transacción única en /refresh (un solo commit).
  4. /logout revoca toda la familia del token, no solo el token presentado.
  5. [NUEVO] Refresh token migrado a httpOnly cookie — ya no viaja en el body.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Union

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from jwt import InvalidTokenError
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.devices import get_device_label
from ..core.dependencies import get_current_user, get_db
from ..core.limiter import limiter
from ..core.mail import send_2fa_code_email
from ..core.security import (
    create_access_token,
    create_pending_2fa_token,
    decode_token,
    generate_device_id,
    generate_otp_code,
    generate_refresh_token,
    hash_device_id,
    hash_otp_code,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from ..models.models import DeviceSession, LoginAttempt, RefreshToken, TwoFactorChallenge, User
from ..schemas.auth import Token, TwoFactorRequired, Verify2FARequest, ChangePasswordRequest
from ..schemas.user import UserCreate, UserOut

router = APIRouter()

_DEVICE_TRUST_DAYS = 60

# Valor de hash estable para protección de timing cuando el email no existe.
_DUMMY_HASH = hash_password("_neliee_timing_protection_sentinel_value_")

# Parámetros de rate limiting (ajusta según tu política)
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_WINDOW_MINUTES = 15


# ---------------------------------------------------------------------------
# Helpers de cookie
# ---------------------------------------------------------------------------

def _set_refresh_cookie(response: Response, token: str) -> None:
    """
    Setea el refresh token como httpOnly cookie.
    - httponly=True  → JS no puede leerla (protección XSS)
    - secure         → solo HTTPS en producción
    - samesite="lax" → protege contra CSRF en la mayoría de flujos
    - path           → scope mínimo: solo endpoints de auth
    """
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=not settings.DEBUG,          # True en prod, False en dev
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86_400,
        path="/api/v1/auth",               # La cookie solo se envía a /api/v1/auth/*
    )
def _set_device_cookie(response: Response, device_id: str) -> None:
    response.set_cookie(
        key="device_id",
        value=device_id,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=_DEVICE_TRUST_DAYS * 86_400,
        path="/api/v1/auth",
    )


async def _issue_full_session(user: User, response: Response, db: AsyncSession) -> Token:
    """Emite access + refresh token. Compartido entre /login (dispositivo conocido) y /verify-2fa."""
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "name": user.full_name},
    )
    raw_refresh_token = generate_refresh_token()
    db.add(RefreshToken(
        token_hash=hash_refresh_token(raw_refresh_token),
        family_id=uuid.uuid4(),
        user_id=user.id,
    ))
    await db.commit()
    _set_refresh_cookie(response, raw_refresh_token)
    return Token(access_token=access_token, token_type="bearer", role=user.role)


def _clear_refresh_cookie(response: Response) -> None:
    """
    Limpia la cookie del refresh token.
    Debe usar exactamente los mismos path/secure/samesite que al crearla,
    de lo contrario el browser no la elimina.
    """
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
        secure=not settings.DEBUG,
        samesite="lax",
    )


# ---------------------------------------------------------------------------
# /register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Crea un usuario nuevo.
    ⚠️  En producción protege este endpoint con require_admin o un token de invitación.
    """
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado.",
        )

    nuevo_usuario = User(
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role="employee",
    )
    db.add(nuevo_usuario)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email ya está registrado.")
    await db.refresh(nuevo_usuario)
   

    return UserOut.model_validate(nuevo_usuario)


# /login

@router.post("/login", response_model=Union[Token, TwoFactorRequired])
@limiter.limit("10/minute")  # Rate limiting a nivel de endpoint (opcional)
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Autentica al usuario.
    - Devuelve el access token en el body (lo lee JS para adjuntarlo a las requests).
    - El refresh token se setea como httpOnly cookie (JS nunca lo ve).

    Fix 1 — Rate limiting:
        Antes de intentar la autenticación, contamos los intentos fallidos
        recientes para ese email. Si superan el umbral, devolvemos 429.
    """
    # ── 1. Rate limiting ────────────────────────────────────────────────────
    window_start = datetime.now(timezone.utc) - timedelta(minutes=_LOCKOUT_WINDOW_MINUTES)
    failed_count_result = await db.execute(
        select(func.count(LoginAttempt.id)).where(
            LoginAttempt.email == form_data.username,
            LoginAttempt.successful == False,  # noqa: E712
            LoginAttempt.timestamp >= window_start,
        )
    )
    if (failed_count_result.scalar() or 0) >= _MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Demasiados intentos fallidos. "
                f"Intente nuevamente en {_LOCKOUT_WINDOW_MINUTES} minutos."
            ),
        )

    # ── 2. Autenticación con protección de timing ───────────────────────────
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    hash_verificar = user.hashed_password if user else _DUMMY_HASH
    password_ok = verify_password(form_data.password, hash_verificar)
    authenticated = user is not None and password_ok

    # ── 3. Registrar intento (éxito o fallo) ────────────────────────────────
    login_attempt = LoginAttempt(
        user_id=user.id if user else None,
        email=form_data.username,
        ip_address=request.client.host if request.client else None,
        successful=authenticated,
    )
    db.add(login_attempt)
    await db.commit()

    # ── 4. Responder según resultado ────────────────────────────────────────
    if not authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    assert user is not None

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada.",
        )
    if user.role in ("admin", "employee"):
        raw_device_id = request.cookies.get("device_id")
        device_recognized = False

        if raw_device_id:
            fp = hash_device_id(raw_device_id)
            ds_result = await db.execute(
                select(DeviceSession).where(
                    DeviceSession.user_id == user.id,
                    DeviceSession.device_fingerprint == fp,
                    DeviceSession.trusted_until.isnot(None),
                    DeviceSession.trusted_until > datetime.now(timezone.utc),
                )
            )
            device_session = ds_result.scalar_one_or_none()
            if device_session:
                device_recognized = True
                device_session.last_active = datetime.now(timezone.utc)
                await db.commit()

        if not device_recognized:
            # Invalida retos previos sin usar de este usuario
            await db.execute(
                update(TwoFactorChallenge)
                .where(TwoFactorChallenge.user_id == user.id, TwoFactorChallenge.is_used == False)  # noqa: E712
                .values(is_used=True)
            )

            code = generate_otp_code()
            challenge = TwoFactorChallenge(
                user_id=user.id,
                code_hash=hash_otp_code(code),
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            )
            db.add(challenge)
            await db.flush()
            await db.commit()

            pending_token = create_pending_2fa_token(user.id, challenge.id)
            await send_2fa_code_email(
                to_email=user.email,
                code=code,
                device_info=get_device_label(request),
            )

            return TwoFactorRequired(pending_token=pending_token)

    # ── 6. Dispositivo confiado: login normal ────────────────────────────────
        return await _issue_full_session(user, response, db)


@router.post("/verify-2fa", response_model=Token)
@limiter.limit("10/minute")
async def verify_2fa(
    request: Request,
    response: Response,
    payload: Verify2FARequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        claims = decode_token(payload.pending_token)
        if claims.get("purpose") != "2fa_pending":
            raise InvalidTokenError()
        user_id = uuid.UUID(claims["sub"])
        challenge_id = uuid.UUID(claims["cid"])
    except (InvalidTokenError, ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Solicitud de verificación inválida o expirada.",
        )

    result = await db.execute(
        select(TwoFactorChallenge)
        .where(TwoFactorChallenge.id == challenge_id, TwoFactorChallenge.user_id == user_id)
        .with_for_update()
    )
    challenge = result.scalar_one_or_none()

    if not challenge or challenge.is_used or challenge.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código expirado o inválido. Inicia sesión de nuevo.",
        )

    if challenge.attempts >= 5:
        challenge.is_used = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos. Inicia sesión de nuevo.",
        )

    if hash_otp_code(payload.code.strip()) != challenge.code_hash:
        challenge.attempts += 1
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Código incorrecto.")

    challenge.is_used = True

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no válido.")

    new_device_id = generate_device_id()
    db.add(DeviceSession(
        user_id=user.id,
        device_info=get_device_label(request),
        device_fingerprint=hash_device_id(new_device_id),
        trusted_until=datetime.now(timezone.utc) + timedelta(days=_DEVICE_TRUST_DAYS),
    ))

    token = await _issue_full_session(user, response, db)
    _set_device_cookie(response, new_device_id)
    return token





# /refresh


@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Genera un nuevo par de tokens usando el refresh token de la httpOnly cookie.
    El frontend no envía nada en el body — el browser adjunta la cookie automáticamente
    gracias a withCredentials: true en axiosClient.

    Fix 2 — SELECT FOR UPDATE:
        Serializa el acceso a la fila del token para eliminar race conditions.

    Fix 3 — Transacción única:
        is_used=True y el nuevo RefreshToken se persisten en un único commit.
    """
    # ── Leer refresh token de la cookie (no del body) ────────────────────────
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No hay sesión activa.",
        )

    hashed_rt = hash_refresh_token(raw_token)

    # ── Bloqueo de fila para eliminar race condition ─────────────────────────
    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hashed_rt)
        .with_for_update()
    )
    db_token = result.scalar_one_or_none()

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido.",
        )

    if db_token.expires_at < datetime.now(timezone.utc):
        _clear_refresh_cookie(response)  # limpiar cookie expirada
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expirado.",
        )

    if db_token.is_revoked:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revocado.",
        )

    if db_token.is_used:
        # Reuso detectado → revocar TODA la familia (posible robo de token)
        await db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == db_token.family_id)
            .values(is_revoked=True)
        )
        await db.commit()
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Posible reutilización de refresh token detectada. "
                "Todas las sesiones de esta familia han sido revocadas."
            ),
        )

    # ── Validar usuario ──────────────────────────────────────────────────────
    user_result = await db.execute(select(User).where(User.id == db_token.user_id))
    user = user_result.scalar_one_or_none()

    if not user or not user.is_active:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no válido.",
        )

    # ── Rotar tokens en una sola transacción ────────────────────────────────
    db_token.is_used = True

    new_access_token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "name": user.full_name},
    )
    new_raw_refresh_token = generate_refresh_token()

    new_db_token = RefreshToken(
        token_hash=hash_refresh_token(new_raw_refresh_token),
        family_id=db_token.family_id,
        user_id=user.id,
    )
    db.add(new_db_token)
    await db.commit()  # único commit: atómico

    # ── Rotar la cookie con el nuevo refresh token ───────────────────────────
    _set_refresh_cookie(response, new_raw_refresh_token)

    return Token(
        access_token=new_access_token,
        token_type="bearer",
        role=user.role,
    )


# ---------------------------------------------------------------------------
# /logout
# ---------------------------------------------------------------------------

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Revoca el refresh token y toda su familia, luego limpia la cookie.

    Fix 4 — Revocación de familia completa:
        Revocamos todos los tokens de la misma family_id para invalidar
        cualquier sesión paralela o token robado ya rotado.

    El frontend no envía body — el browser adjunta la cookie automáticamente.
    La cookie se limpia siempre, aunque el token no exista en BD.
    """
    raw_token = request.cookies.get("refresh_token")

    if raw_token:
        hashed_rt = hash_refresh_token(raw_token)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == hashed_rt)
        )
        db_token = result.scalar_one_or_none()

        if db_token:
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.family_id == db_token.family_id)
                .values(is_revoked=True)
            )
            await db.commit()

    # Limpiar la cookie siempre, independientemente de si el token existía
    _clear_refresh_cookie(response)

    return None

@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    
): 
    """
    Cambia la contraseña del usuario autenticado.
    Requiere enviar la contraseña actual y la nueva.
    """
    if not verify_password(payload.current_password, current_user.hashed_password):
     raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="La contraseña actual es incorrecta.",
    )

    current_user.hashed_password = hash_password(payload.new_password)
    current_user.must_change_password = False

    await db.commit()

    return {"detail": "Contraseña actualizada correctamente."}
# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)