from fastapi import Request


def get_device_label(request: Request) -> str:
    """Nombre legible del dispositivo, para mostrar en el correo de verificación."""
    ua = request.headers.get("user-agent", "Desconocido")
    return ua[:255]