from src.db.models.registroUsuario_model import Usuario
from src.dtos.usuario_dto import UsuarioResponseDTO

def to_usuario_response(usuario: Usuario) -> UsuarioResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return UsuarioResponseDTO.model_validate(usuario)