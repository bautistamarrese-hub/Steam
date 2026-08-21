from .routers import desarollador_router, juego_router, usuario_router
from fastapi import FastAPI

from src.middlewares.error_middleware import app_error_handler
from src.routers import registroUsuario_router
from src.utils.errors import AppError

app = FastAPI(title="Initial Structure API")

app.add_exception_handler(AppError, app_error_handler)

app.include_router(desarollador_router.router, prefix="/api")
app.include_router(usuario_router.router, prefix="/api")
app.include_router(juego_router.router, prefix="/api")
app.include_router(registroUsuario_router.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
