from sqlalchemy.orm import Session

from backend.src.dtos.desarollador_dto import CreateUserDTO, UserResponseDTO
from src.mappers.user_mapper import to_user_response
from src.repositories.user_repository import UserRepository
from src.utils.hash import hash_password


class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def create(self, dto: CreateUserDTO) -> UserResponseDTO:
        """Ejemplo completo: hashea la password, crea el user y devuelve el DTO de respuesta."""
        password_hash = hash_password(dto.password)
        user = self.repo.create(
            email=dto.email,
            password_hash=password_hash,
            age=dto.age,
        )
        return to_user_response(user)

    def get_by_id(self, user_id: int) -> UserResponseDTO:
        # TODO: buscar el user. Si no existe, lanzar NotFoundError. Devolver UserResponseDTO.
        ...

    def list_all(self) -> list[UserResponseDTO]:
        # TODO: devolver lista de UserResponseDTO
        ...

    def update(self, user_id: int, dto) -> UserResponseDTO:
        # TODO: validar existencia, aplicar cambios desde dto, devolver el DTO actualizado.
        ...

    def delete(self, user_id: int) -> None:
        # TODO: borrar el user. Si no existe, NotFoundError.
        ...
