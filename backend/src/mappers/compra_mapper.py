from src.db.models.comprarJuego_model import Compra
from src.dtos.compra_dto import CompraResponseDTO

def to_compra_response(compra: Compra) -> CompraResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return CompraResponseDTO.model_validate(compra)