from src.db.models.reseñas_model import Resena
from src.dtos.resena_dto import ResenaResponseDTO

def to_resena_response(resena: Resena) -> ResenaResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return ResenaResponseDTO.model_validate(resena)