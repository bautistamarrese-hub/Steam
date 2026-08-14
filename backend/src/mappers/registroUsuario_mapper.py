from backend.src.db.models.registroUsuario_model import Usuario
from backend.src.dtos.registroUsuario_dto import UsuarioResponseDTO


def to_conductores_response(conductor: Usuario) -> UsuarioResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return UsuarioResponseDTO.model_validate(conductor)
