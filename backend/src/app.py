from .routers import desarollador_router, juego_router, usuario_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.env import settings
from src.middlewares.error_middleware import ErrorHandlerMiddleware

app = FastAPI(title="Initial Structure API")
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


@app.get("/health")
def health():
    return {"status": "ok"}
