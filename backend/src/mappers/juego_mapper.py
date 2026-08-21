from src.db.models.desarrolladorJuego_model import Juego
from src.dtos.juego_dto import JuegoResponseDTO

def to_juego_response(juego: Juego) -> JuegoResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return JuegoResponseDTO.model_validate(juego)