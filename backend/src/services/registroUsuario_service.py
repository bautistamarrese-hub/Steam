from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ..db.models.registroUsuario_model import Usuario
from ..dtos.logro_dto import CreateUsuarioDTO, UsuarioResponseDTO
from ..mappers.registroUsuario_mapper import UsuarioMapper
from ..repositories.registroUsuario_repository import UsuarioRepository

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UsuarioService:
    def __init__(self, db: Session):
        self.repo = UsuarioRepository(db)

    def registrar_usuario(self, dto: CreateUsuarioDTO) -> UsuarioResponseDTO:
        # 1. Validar que el email sea único
        if self.repo.get_by_email(dto.email):
            raise ValueError("El email ya está registrado")

        # 2. Validar que el nickname sea único
        if self.repo.get_by_nickname(dto.nickname):
            raise ValueError("El nickname ya está registrado")

        # 3. Encriptar la contraseña
        hashed_password = pwd_context.hash(dto.password)

        # 4. Crear la entidad del modelo
        nuevo_usuario = Usuario(
            email=dto.email,
            nickname=dto.nickname,
            password_hash=hashed_password
        )

        # 5. Guardar en la base de datos a través del repositorio
        usuario_guardado = self.repo.save(nuevo_usuario)

        # 6. Mapear la entidad guardada al DTO de respuesta
        return UsuarioMapper.to_response_dto(usuario_guardado)