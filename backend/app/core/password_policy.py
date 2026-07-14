"""
Política de contraseñas centralizada — usada por UserCreate y ActivateAccount
para evitar que ambos validadores diverjan.
"""

_COMMON_PASSWORDS = {
    "12345678", "123456789", "password", "Password1", "password1",
    "qwertyui", "11111111", "abc12345", "admin1234", "Admin1234",
    "letmein1", "iloveyou", "123123123", "qwerty123",
}


def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres.")
    if len(v) > 100:
        raise ValueError("La contraseña no puede superar 100 caracteres.")
    if not any(c.isupper() for c in v):
        raise ValueError("La contraseña debe contener al menos una mayúscula.")
    if not any(c.islower() for c in v):
        raise ValueError("La contraseña debe contener al menos una minúscula.")
    if not any(c.isdigit() for c in v):
        raise ValueError("La contraseña debe contener al menos un número.")
    if v.lower() in _COMMON_PASSWORDS:
        raise ValueError("Esta contraseña es demasiado común. Elige una más segura.")
    return v