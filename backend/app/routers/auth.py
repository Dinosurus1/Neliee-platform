from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_current_user, get_db
from ..core.security import (
    create_access_token, 
    verify_password, 
    hash_password,
    generate_refresh_token,
    hash_refresh_token
)
from ..core.config import settings
from ..models.models import User, RefreshToken
from ..schemas.auth import Token, TokenRefresh
from ..schemas.user import UserOut, UserCreate

router = APIRouter()

_DUMMY_HASH = hash_password("_neliee_timing_protection_sentinel_value_")


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Crea un usuario nuevo. (Ojo: ¿Debería ser público en un LMS?)"""
    # Verificar si el email ya existe
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado."
        )
    
    nuevo_usuario = User(
        full_name=user_in.full_name,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role="employee" # Por defecto
    )
    db.add(nuevo_usuario)
    await db.commit()
    await db.refresh(nuevo_usuario)
    
    return UserOut.model_validate(nuevo_usuario)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Autentica al usuario y devuelve Access y Refresh Token."""
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    hash_verificar = user.hashed_password if user else _DUMMY_HASH
    if not user or not verify_password(form_data.password, hash_verificar):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada.")

    # 1. Generar tokens
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "name": user.full_name},
    )
    raw_refresh_token = generate_refresh_token()
    
    # 2. Guardar Refresh Token en DB
    db_refresh_token = RefreshToken(
        token=hash_refresh_token(raw_refresh_token),
        user_id=user.id
    )
    db.add(db_refresh_token)
    await db.commit()

    return Token(
        access_token=access_token,
        refresh_token=raw_refresh_token, # Enviamos el crudo, la DB guarda el hash
        token_type="bearer",
        role=user.role
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh, 
    db: AsyncSession = Depends(get_db)
):
    """Genera un nuevo access token usando un refresh token válido."""
    hashed_rt = hash_refresh_token(token_data.refresh_token)
    
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == hashed_rt))
    db_token = result.scalar_one_or_none()
    
    if not db_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido.")
    
    if db_token.is_revoked or db_token.is_used:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token revocado o ya usado.")
        
    if db_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expirado.")

    # Obtener el usuario
    user_result = await db.execute(select(User).where(User.id == db_token.user_id))
    user = user_result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no válido.")

    # Rotación de tokens (seguridad extra): Marcamos el viejo como usado
    db_token.is_used = True
    
    # Generamos los nuevos
    new_access_token = create_access_token(
        subject=user.id,
        extra_claims={"role": user.role, "name": user.full_name},
    )
    new_raw_refresh_token = generate_refresh_token()
    
    new_db_token = RefreshToken(
        token=hash_refresh_token(new_raw_refresh_token),
        user_id=user.id
    )
    db.add(new_db_token)
    await db.commit()

    return Token(
        access_token=new_access_token,
        refresh_token=new_raw_refresh_token,
        token_type="bearer",
        role=user.role
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token_data: TokenRefresh, 
    db: AsyncSession = Depends(get_db)
):
    """Revoca el refresh token para cerrar sesión."""
    hashed_rt = hash_refresh_token(token_data.refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == hashed_rt))
    db_token = result.scalar_one_or_none()
    
    if db_token:
        db_token.is_revoked = True
        await db.commit()
        
    return None


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retorna los datos del usuario autenticado."""
    return UserOut.model_validate(current_user)