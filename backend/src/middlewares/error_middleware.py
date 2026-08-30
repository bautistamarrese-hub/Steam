from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from src.utils.errors import AppError

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except AppError as exc:
            return JSONResponse(
                status_code=getattr(exc, "status_code", status.HTTP_400_BAD_REQUEST),
                content={"detail": exc.message if hasattr(exc, "message") else str(exc)}
            )
        except ValueError as exc:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"detail": str(exc)}
            )
        except Exception as exc:
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": f"Internal Server Error: {str(exc)}"}
            )
