#pydantic: Token, LoginRquest
from pydantic import BaseModel
 
 
class Token(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str
    role: str  # "employee" | "admin"
class TokenRefresh(BaseModel):
    refresh_token: str
