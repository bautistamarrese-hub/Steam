from src.db.models.amigos_model import Amigos
from src.dtos.amigo_dto import AmigoResponseDTO

def to_amigo_response(amigo: Amigos) -> AmigoResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return AmigoResponseDTO.model_validate(amigo)