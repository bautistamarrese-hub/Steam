from ..db.models.registroUsuario_model import Usuario
from ..dtos.logro_dto import UsuarioResponseDTO


class UsuarioMapper:
    @staticmethod
    def to_response_dto(usuario: Usuario) -> UsuarioResponseDTO:
        return UsuarioResponseDTO(
            id=usuario.id,
            email=usuario.email,
            nickname=usuario.nickname,
            saldo=usuario.saldo,
            fecha_registro=usuario.fecha_registro
        )