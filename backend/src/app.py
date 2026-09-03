from .routers import (
    administracion_router,
    desarollador_router,
    juego_router,
    solicitudAmistad_router,
    usuario_router,
)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from src.config.env import settings
from src.middlewares.error_middleware import ErrorHandlerMiddleware

app = FastAPI(title="Initial Structure API")
uploads_dir = Path(__file__).resolve().parents[1] / "storage"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(desarollador_router.router, prefix="/api")
app.include_router(usuario_router.router, prefix="/api")
app.include_router(juego_router.router, prefix="/api")
app.include_router(solicitudAmistad_router.router, prefix="/api")
app.include_router(administracion_router.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
