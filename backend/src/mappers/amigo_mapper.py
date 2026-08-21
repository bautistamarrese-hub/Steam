from src.db.models.amigo import Amigo
from src.dtos.amigo_dto import AmigoResponseDTO

def to_amigo_response(amigo: Amigo) -> AmigoResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return AmigoResponseDTO.model_validate(amigo)