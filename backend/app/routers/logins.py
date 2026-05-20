#login de usuarios Schema
#router del login de usuarios 
#LoginRequest con Verify2FArequest y token response
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession 
from app.core.dependencies import get_current_user, get_db
from app.core.security import verify_password, create_access_token
from app.models.models import User
from app.schemas.auth import Token
from backend.app.schemas.user import UserOut
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

