from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.registroUsuario_model import Usuario
from src.middlewares.auth_middleware import get_current_user
from src.schemas.administracion_schema import UpdateUsuarioAdminSchema
from src.schemas.juego_schema import GetJuegoSchema, UpdateJuegoSchema
from src.schemas.usuario_schema import GetUsuarioSchema
from src.services.administracion_service import AdministracionService


router = APIRouter(prefix="/administracion", tags=["administracion"])


@router.put("/usuarios/{usuario_id}", response_model=GetUsuarioSchema)
def actualizar_usuario(
    usuario_id: int,
    payload: UpdateUsuarioAdminSchema,
    db: Session = Depends(get_db),
    administrador: Usuario = Depends(get_current_user),
):
    return AdministracionService(db, administrador).actualizar_usuario(usuario_id, payload)


@router.delete("/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    administrador: Usuario = Depends(get_current_user),
):
    AdministracionService(db, administrador).eliminar_usuario(usuario_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/juegos/{juego_id}", response_model=GetJuegoSchema)
def actualizar_juego(
    juego_id: int,
    payload: UpdateJuegoSchema,
    db: Session = Depends(get_db),
    administrador: Usuario = Depends(get_current_user),
):
    return AdministracionService(db, administrador).actualizar_juego(juego_id, payload)


@router.delete("/juegos/{juego_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_juego(
    juego_id: int,
    db: Session = Depends(get_db),
    administrador: Usuario = Depends(get_current_user),
):
    AdministracionService(db, administrador).eliminar_juego(juego_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
