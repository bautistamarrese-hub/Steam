from backend.src.db.models.desbloquearLogro import Pasajero
from src.dtos.pasajero_dto import PasajeroResponseDTO


def to_pasajero_response(pasajero: Pasajero) -> PasajeroResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return PasajeroResponseDTO.model_validate(pasajero)  