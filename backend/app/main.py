# app/main.py
"""
Punto de entrada de la aplicación FastAPI.
"""
from contextlib import asynccontextmanager

from .core.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from .core.config import settings
from .db.database import engine
from .db.init_db import init_db
from .routers import auth, courses, enrollments, users, invitations




# Lifespan


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa tablas y seed al arrancar; libera recursos al apagar."""
    await init_db()
    yield
    await engine.dispose()



# Instancia principal


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="API para la plataforma empresarial + LMS interno.",
    # FIX: docs solo en DEBUG. En producción no exponemos la documentación interactiva.
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    openapi_url="/api/openapi.json" if settings.DEBUG else None,  # ← también ocultar el schema
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler) #type: ignore [arg-type]

# Middlewares  (se aplican en orden inverso: el último añadido es el más externo)

# 1. CORS (más interno — después del host check y los headers de seguridad)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# 2. Security Headers
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Agrega headers de seguridad HTTP a todas las respuestas.

    FIX — Se agregó Content-Security-Policy (CSP):
        Era el único header de seguridad crítico que faltaba.
        Sin CSP, un XSS puede leer el access token desde JS y enviarlo
        a un servidor externo aunque use HttpOnly en cookies.
        Como el LMS usa iframes de Google Drive, se permite explícitamente
        frame-src https://drive.google.com y nada más.
    """

    # CSP separado en variable para facilitar ajustes futuros
    _CSP = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "       # unsafe-inline solo si el frontend lo requiere
        "img-src 'self' data: https:; "
        "frame-src https://drive.google.com; "      # Google Drive para los videos del LMS
        "connect-src 'self'; "
        "font-src 'self'; "
        "object-src 'none'; "                       # bloquea Flash y plugins
        "base-uri 'self'; "                         # evita base-tag hijacking
        "form-action 'self';"                       # evita envío de formularios a terceros
    )

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        response.headers["Content-Security-Policy"] = self._CSP
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # X-XSS-Protection: 0 es CORRECTO — deshabilita el XSS auditor roto de IE/Chrome antiguo
        response.headers["X-XSS-Protection"] = "0"

        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"  # FIX: 2 años + preload
            )

        return response


app.add_middleware(SecurityHeadersMiddleware)


# 3. Trusted Host (más externo en producción — primer filtro)
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

API_PREFIX = "/api/v1"

app.include_router(auth.router,        prefix=f"{API_PREFIX}/auth",        tags=["Auth"])
app.include_router(users.router,       prefix=f"{API_PREFIX}/admin/users", tags=["Admin · Users"])
app.include_router(courses.router,     prefix=f"{API_PREFIX}/courses",     tags=["Courses"])
app.include_router(enrollments.router, prefix=f"{API_PREFIX}/enrollments", tags=["Enrollments"])
app.include_router(invitations.router,prefix=f"{API_PREFIX}/invitations",tags=["Invitations"],
)

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"], include_in_schema=False)
async def health_check():
    # FIX: no exponer la versión en producción (fingerprinting)
    payload = {"status": "ok"}
    if settings.DEBUG:
        payload["version"] = "1.0.0"
    return JSONResponse(payload)


# ---------------------------------------------------------------------------
# Desarrollo local
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",  # FIX: 127.0.0.1 en lugar de 0.0.0.0 — no exponer a la red local
        port=8000,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )