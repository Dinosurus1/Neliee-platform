# app/routers/auth.py
"""
Endpoints de autenticación.
Fixes aplicados:
  1. Rate limiting en /login usando la tabla LoginAttempt.
  2. SELECT FOR UPDATE en /refresh para eliminar la race condition.
  3. Transacción única en /refresh (un solo commit).
  4. /logout revoca toda la familia del token, no solo el token presentado.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.dependencies import get_current_user, get_db
from ..core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from ..models.models import LoginAttempt, RefreshToken, User
from ..schemas.auth import Token, TokenRefresh
from ..schemas.user import UserCreate, UserOut

router = APIRouter()

# Valor de hash estable para protección de timing cuando el email no existe.
_DUMMY_HASH = hash_password("_neliee_timing_protection_sentinel_value_")

# Parámetros de rate limiting (ajusta según tu política)
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_WINDOW_MINUTES = 15


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
    await db.commit()
    await db.refresh(nuevo_usuario)

    return UserOut.model_validate(nuevo_usuario)


# ---------------------------------------------------------------------------
# /login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Autentica al usuario y devuelve Access + Refresh Token.

    Fix 1 — Rate limiting:
        Antes de intentar la autenticación, contamos los intentos fallidos
        recientes para ese email. Si superan el umbral, devolvemos 429.
        Usamos la tabla LoginAttempt que ya existía en el modelo pero no se usaba.
    """
    # ── 1. Rate limiting ────────────────────────────────────────────────────
    window_start = datetime.now(timezone.utc) - timedelta(minutes=_LOCKOUT_WINDOW_MINUTES)
    failed_count_result = await db.execute(
        select(func.count(LoginAttempt.id)).where(
            LoginAttempt.email == form_data.username,
            LoginAttempt.successful == False,  # noqa: E712 (SQLAlchemy necesita ==)
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
    #    Hacemos esto ANTES de lanzar la excepción para que quede guardado.
    login_attempt = LoginAttempt(
        user_id=user.id if user else None,
        email=form_data.username,
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

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada.",
        )

    # ── 5. Generar y persistir tokens ───────────────────────────────────────
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "name": user.full_name},
    )
    raw_refresh_token = generate_refresh_token()

    db_refresh_token = RefreshToken(
        token_hash=hash_refresh_token(raw_refresh_token),
        family_id=uuid.uuid4(),
        user_id=user.id,
    )
    db.add(db_refresh_token)
    await db.commit()

    return Token(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        role=user.role,
    )


# ---------------------------------------------------------------------------
# /refresh
# ---------------------------------------------------------------------------

@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db),
):
    """
    Genera un nuevo par de tokens usando un refresh token válido.

    Fix 2 — SELECT FOR UPDATE:
        Serializa el acceso a la fila del token. Si dos requests llegan
        simultáneamente con el mismo token, el segundo esperará a que el
        primero confirme la transacción. Cuando lea la fila, ya estará
        marcada como is_used=True y activará la detección de reuso.

    Fix 3 — Transacción única:
        is_used=True y el nuevo RefreshToken se persisten en un único commit,
        eliminando la ventana de fallo entre los dos commits originales.
    """
    hashed_rt = hash_refresh_token(token_data.refresh_token)

    # ── Bloqueo de fila para eliminar race condition ─────────────────────────
    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hashed_rt)
        .with_for_update()  # ← serializa acceso concurrente a esta fila
    )
    db_token = result.scalar_one_or_none()

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido.",
        )

    if db_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expirado.",
        )

    if db_token.is_revoked:
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no válido.",
        )

    # ── Rotar tokens en una sola transacción ────────────────────────────────
    db_token.is_used = True  # marcar viejo como consumido

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
    await db.commit()  # ← único commit: atómico

    return Token(
        access_token=new_access_token,
        refresh_token=new_raw_refresh_token,
        token_type="bearer",
        role=user.role,
    )


# ---------------------------------------------------------------------------
# /logout
# ---------------------------------------------------------------------------

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db),
):
    """
    Revoca el refresh token y toda su familia.

    Fix 4 — Revocación de familia completa:
        El código original solo revocaba el token presentado. Si un atacante
        ya había rotado el token antes del logout, el nuevo token quedaba activo.
        Ahora revocamos todos los tokens de la misma familia_id.
    """
    hashed_rt = hash_refresh_token(token_data.refresh_token)
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

    return None


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retorna los datos del usuario autenticado."""
    return UserOut.model_validate(current_user)