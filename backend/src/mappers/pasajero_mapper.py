from src.db.models.pasajero_model import Pasajero
from backend.src.dtos.compra_dto import PasajeroResponseDTO


def to_pasajero_response(pasajero: Pasajero) -> PasajeroResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return PasajeroResponseDTO.model_validate(pasajero)