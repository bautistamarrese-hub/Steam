from typing import Literal

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.registroUsuario_model import Usuario
from src.middlewares.auth_middleware import get_current_user
from src.schemas.administracion_schema import GetUsuarioAdminSchema, UpdateUsuarioAdminSchema
from src.schemas.denunciaJuego_schema import GetDenunciaJuegoSchema, ResolverDenunciaJuegoSchema
from src.schemas.juego_schema import GetJuegoSchema, UpdateJuegoSchema
from src.schemas.logro_schema import CreateLogroSchema, GetLogroSchema
from src.schemas.usuario_schema import GetUsuarioSchema
from src.services.administracion_service import AdministracionService
from src.services.denunciaJuego_service import DenunciaJuegoService


router = APIRouter(prefix="/administracion", tags=["administracion"])


@router.get("/usuarios", response_model=list[GetUsuarioAdminSchema])
def listar_usuarios(
    db: Session = Depends(get_db),
    administrador: Usuario = Depends(get_current_user),
):
    return AdministracionService(db, administrador).listar_usuarios()


@router.get("/denuncias", response_model=list[GetDenunciaJuegoSchema])
def listar_denuncias(
    estado: Literal["pendiente", "aceptada", "rechazada"] | None = Query(default=None),
    db: Session = Depends(get_db),
    administrador: Usuario = Depends(get_current_user),
):
    return DenunciaJuegoService(db).listar(administrador, estado)


@router.put("/denuncias/{denuncia_id}", response_model=GetDenunciaJuegoSchema)
def resolver_denuncia(
    denuncia_id: int,
    payload: ResolverDenunciaJuegoSchema,
    db: Session = Depends(get_db),
    administrador: Usuario = Depends(get_current_user),
):
    return DenunciaJuegoService(db).resolver(denuncia_id, payload.estado, administrador)


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


@router.post("/juegos/{juego_id}/archivo", response_model=GetJuegoSchema)
async def subir_archivo_juego(
    juego_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    administrador: Usuario = Depends(get_current_user),
):
    return await AdministracionService(db, administrador).guardar_archivo_juego(
        juego_id,
        archivo,
    )


@router.post(
    "/juegos/{juego_id}/logros",
    response_model=GetLogroSchema,
    status_code=status.HTTP_201_CREATED,
)
def crear_logro(
    juego_id: int,
    payload: CreateLogroSchema,
    db: Session = Depends(get_db),
    administrador: Usuario = Depends(get_current_user),
):
    return AdministracionService(db, administrador).crear_logro(juego_id, payload)


@router.delete("/juegos/{juego_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_juego(
    juego_id: int,
    db: Session = Depends(get_db),
    administrador: Usuario = Depends(get_current_user),
):
    AdministracionService(db, administrador).eliminar_juego(juego_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
