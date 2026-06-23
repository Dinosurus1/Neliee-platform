# app/schemas/auth.py
from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str  # "employee" | "admin"
    # refresh_token eliminado del body — ahora viaja como httpOnly cookie.
    # El frontend nunca lo ve ni lo almacena en JS.


# TokenRefresh eliminado — ya no se recibe el refresh token en el body.
# El backend lo lee directamente de request.cookies.get("refresh_token").