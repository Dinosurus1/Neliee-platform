from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# 👇 1. Importamos la INSTANCIA 'settings', no la clase
from .core.config import settings
from .db.database import engine
from .db.init_db import init_db
from .routers import auth, users, courses, enrollments


# Lifespan: startup / shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea las tablas y ejecuta el seed inicial al arrancar."""
    await init_db()
    yield
    # Cleanup al apagar (cerrar conexiones, etc.)
    await engine.dispose()


# Instancia principal
app = FastAPI(
    title=settings.PROJECT_NAME,  # ← Usando la instancia
    version="1.0.0",
    description="API para la plataforma empresarial + LMS interno.",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)


# Middlewares

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],  # Añadí Accept, útil para Axios
)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Agrega headers de seguridad HTTP a todas las respuestas."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["X-XSS-Protection"] = "0"
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# Hosts de confianza 
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )


# Routers

API_PREFIX = "/api/v1"

app.include_router(auth.router,        prefix=f"{API_PREFIX}/auth",         tags=["Auth"])
app.include_router(users.router,       prefix=f"{API_PREFIX}/admin/users",   tags=["Admin · Users"])
app.include_router(courses.router,     prefix=f"{API_PREFIX}/courses",       tags=["Courses"])
app.include_router(enrollments.router, prefix=f"{API_PREFIX}/enrollments",   tags=["Enrollments"])


# Health check

@app.get("/health", tags=["Health"], include_in_schema=False)
async def health_check():
    return JSONResponse({"status": "ok", "version": "1.0.0"})


# Punto de entrada para desarrollo local

if __name__ == "__main__":
    import uvicorn
    
    
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info",
    )