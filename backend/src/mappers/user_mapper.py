from src.db.models.user_model import User
from backend.src.dtos.desarollador_dto import UserResponseDTO


def to_user_response(user: User) -> UserResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return UserResponseDTO.model_validate(user)
