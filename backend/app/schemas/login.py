#Login del schemas 
#que contenga:
#LoginRequest: Solo debe tener email (tipo str o EmailStr) y password (tipo str).

#Verify2FARequest: Debe tener email (str), tfa_code (str de longitud 6) y device_fingerprint (str).

#TokenResponse: Debe tener access_token (str) y token_type (str).
from pydantic import BaseModel, EmailStr, constr

