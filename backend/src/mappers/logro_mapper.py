from src.db.models.logro import Logro, LogroDesbloqueado
from src.dtos.logro_dto import LogroResponseDTO, LogroDesbloqueadoResponseDTO

def to_logro_response(logro: Logro) -> LogroResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return LogroResponseDTO.model_validate(logro)

def to_logro_desbloqueado_response(logro_desbloqueado: LogroDesbloqueado) -> LogroDesbloqueadoResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return LogroDesbloqueadoResponseDTO.model_validate(logro_desbloqueado)