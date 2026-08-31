import logging

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from src.utils.errors import AppError

logger = logging.getLogger(__name__)

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except AppError as exc:
            return JSONResponse(
                status_code=getattr(exc, "status_code", status.HTTP_400_BAD_REQUEST),
                content={"detail": exc.message if hasattr(exc, "message") else str(exc)}
            )
        except UnicodeDecodeError:
            # En Windows, PostgreSQL puede devolver errores de autenticacion en
            # la pagina de codigos local y psycopg2 intenta leerlos como UTF-8.
            # El resultado original oculta la causa real con un error de codec.
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "detail": (
                        "No se pudo autenticar con PostgreSQL. Revisá el usuario y la "
                        "contraseña de DATABASE_URL en backend/.env."
                    )
                },
            )
        except ValueError as exc:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": str(exc)}
            )
        except Exception as exc:
            logger.exception("Error no controlado durante %s %s", request.method, request.url.path)
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Ocurrió un error interno en el backend."}
            )
