from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from ..dtos.registroUsuario_dto import CreateUsuarioDTO, UsuarioResponseDTO
from ..schemas.registroUsuario_schema import CreateUsuarioSchema
from ..services.registroUsuario_service import UsuarioService

router = APIRouter(prefix="/Usuario", tags=["Usuario"])


@router.post(
    "/registro",
    response_model=UsuarioResponseDTO,
    status_code=status.HTTP_201_CREATED
)
def registrar_usuario(
    usuario_in: CreateUsuarioSchema,
    db: Session = Depends(get_db)
):
    # Inicializamos el servicio pasándole la sesión de la base de datos
    service = UsuarioService(db)

    try:
        # Convertimos los datos del Schema de entrada al DTO que usará la lógica de negocio
        usuario_dto = CreateUsuarioDTO(
            email=usuario_in.email,
            nickname=usuario_in.nickname,
            password=usuario_in.password
        )

        # Delegamos la creación, validación y hasheo de clave al servicio
        nuevo_usuario = service.registrar_usuario(usuario_dto)
        
        return nuevo_usuario

    except ValueError as e:
        # Atrapamos errores de negocio (ej. "Email ya registrado") que lance el servicio
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )