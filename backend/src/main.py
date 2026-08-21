import uvicorn

from src.config.env import settings

if __name__ == "__main__":
    uvicorn.run("src.app:app", host="0.0.0.0", port=settings.PORT, reload=True)
app.include_router(usuario_router.router)
app.include_router(desarrollador_router.router)
app.include_router(juego_router.router)