from src.db.models.desarrollador import Desarrollador
from src.dtos.desarrollador_dto import DesarrolladorResponseDTO

def to_desarrollador_response(desarrollador: Desarrollador) -> DesarrolladorResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return DesarrolladorResponseDTO.model_validate(desarrollador)