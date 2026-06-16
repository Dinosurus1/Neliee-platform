
#main.py — Entry point de la aplicación FastAPI
#Plataforma Empresarial + LMS


from contextlib import asynccontextmanager
from fastapi import FastAPI, Request                                 # ← Request agregado
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware            # ← nuevo import
from .core.config import Settings
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
    title=Settings.PROJECT_NAME,
    version="1.0.0",
    description="API para la plataforma empresarial + LMS interno.",
    docs_url="/api/docs" if Settings.DEBUG else None,   # Ocultar en producción
    redoc_url="/api/redoc" if Settings.DEBUG else None,
    lifespan=lifespan,
)



# Middlewares


# CORS — ajustar ALLOWED_ORIGINS en .env para producción
app.add_middleware(
    CORSMiddleware,
    allow_origins=Settings.ALLOWED_ORIGINS,  
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],   # ← específico
    allow_headers=["Authorization", "Content-Type"],  
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
        if not Settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

# Hosts de confianza (hardening básico en producción)
if not Settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=Settings.ALLOWED_HOSTS,
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
        app,
        host="0.0.0.0",
        port=8000,
        reload=Settings.DEBUG,
        log_level="debug" if Settings.DEBUG else "info",
    )