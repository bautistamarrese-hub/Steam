from fastapi import FastAPI

from backend.src.routers import registroUsuario_router
from src.middlewares.error_middleware import app_error_handler
from src.routers import auth_router, user_router, pasajero_router
from src.utils.errors import AppError

app = FastAPI(title="Initial Structure API")

app.add_exception_handler(AppError, app_error_handler)

app.include_router(user_router.router, prefix="/api")
app.include_router(auth_router.router, prefix="/api")
app.include_router(pasajero_router.router, prefix="/api")
app.include_router(registroUsuario_router.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
