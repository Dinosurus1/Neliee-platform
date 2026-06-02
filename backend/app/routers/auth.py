#POST /auth/login

# app/routers/auth.py

#Router de autenticación.
#POST /api/v1/auth/login  → devuelve access_token JWT
#GET  /api/v1/auth/me     → datos del usuario autenticado


from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.dependencies import get_current_user, get_db
from ..core.security import create_access_token, verify_password
from ..models.models import User
from ..schemas.auth import Token
from ..schemas.user import UserOut

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Recibe `username` (email) y `password` en form-data (estándar OAuth2).
    Devuelve access_token + rol para que el frontend decida la redirección.
    """
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada. Contacta a la administración.",
        )

    token = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role, "name": user.full_name},
    )
    return Token(access_token=token, token_type="bearer", role=user.role)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retorna los datos del usuario autenticado."""
    return UserOut.model_validate(current_user)