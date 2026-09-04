from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.registroUsuario_model import Usuario
from src.middlewares.auth_middleware import get_current_user, get_feature_user, require_same_user
from src.schemas.amigo_schema import CreateAmigoSchema, GetAmigoSchema
from src.schemas.compra_schema import GetCompraSchema, GetRecargaSchema
from src.schemas.juego_schema import GetItemBibliotecaSchema
from src.schemas.logro_schema import GetLogroDesbloqueadoSchema, ProgresoLogroSchema
from src.schemas.notificacionVenta_schema import (
    GetIngresosDesarrolladorSchema,
    GetNotificacionVentaSchema,
)
from src.schemas.solicitudAmistad_schema import GetSolicitudAmistadSchema
from src.schemas.usuario_schema import (
    CreateUsuarioSchema,
    GetEstadisticasUsuarioSchema,
    GetUsuarioSchema,
    LoginResponseSchema,
    LoginUsuarioSchema,
    RecargarSaldoSchema,
)
from src.schemas.wishlist_schema import CreateWishlistSchema, GetWishlistSchema
from src.services.desbloquearLogro_service import DesbloqueoLogroService
from src.services.notificacionVenta_service import NotificacionVentaService
from src.services.registroUsuario_service import UsuarioService
from src.services.solicitudAmistad_service import SolicitudAmistadService
from src.utils.jwt import create_access_token

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.post("/", response_model=GetUsuarioSchema, status_code=status.HTTP_201_CREATED)
def registrar_usuario(payload: CreateUsuarioSchema, db: Session = Depends(get_db)):
    return UsuarioService(db).registrar(payload)


@router.post("/login", response_model=LoginResponseSchema)
def iniciar_sesion(payload: LoginUsuarioSchema, db: Session = Depends(get_db)):
    usuario = UsuarioService(db).iniciar_sesion(payload)
    return {
        "usuario": usuario,
        "access_token": create_access_token({"sub": str(usuario.id)}),
        "token_type": "bearer",
    }


@router.get("/", response_model=list[GetUsuarioSchema])
def listar_usuarios(email: str | None = Query(default=None), db: Session = Depends(get_db)):
    return UsuarioService(db).listar(email)


@router.get("/me", response_model=GetUsuarioSchema)
def obtener_sesion_actual(usuario: Usuario = Depends(get_current_user)):
    return usuario


@router.get("/{id}", response_model=GetUsuarioSchema)
def obtener_usuario(id: int, db: Session = Depends(get_db)):
    return UsuarioService(db).obtener(id)


@router.put("/{id}/avatar", response_model=GetUsuarioSchema)
async def actualizar_avatar(
    id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return await UsuarioService(db).guardar_avatar(id, archivo)


@router.post("/{id}/recargar", response_model=GetRecargaSchema)
def recargar_saldo(
    id: int,
    payload: RecargarSaldoSchema,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return UsuarioService(db).recargar_saldo(id, payload)


@router.get("/{id}/recargas", response_model=list[GetRecargaSchema])
def listar_recargas(
    id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return UsuarioService(db).listar_recargas(id)


@router.get(
    "/{id}/ingresos-desarrollador",
    response_model=GetIngresosDesarrolladorSchema,
)
def obtener_ingresos_desarrollador(
    id: int,
    periodo: str = Query(default="7d", pattern="^(7d|30d|total)$"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return NotificacionVentaService(db).resumen_ingresos(usuario, periodo)


@router.get(
    "/{id}/notificaciones-ventas",
    response_model=list[GetNotificacionVentaSchema],
)
def listar_notificaciones_ventas(
    id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return NotificacionVentaService(db).listar(id)


@router.delete(
    "/{id}/notificaciones-ventas/{notificacion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def confirmar_notificacion_venta(
    id: int,
    notificacion_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    NotificacionVentaService(db).confirmar(id, notificacion_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{id}/comprar/{juego_id}",
    response_model=GetCompraSchema,
    status_code=status.HTTP_201_CREATED,
)
def comprar_juego(
    id: int,
    juego_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return UsuarioService(db).comprar_juego(id, juego_id)


@router.get("/{id}/biblioteca", response_model=list[GetItemBibliotecaSchema])
def obtener_biblioteca(
    id: int, genero: str | None = Query(default=None), db: Session = Depends(get_db)
):
    return UsuarioService(db).obtener_biblioteca(id, genero)


@router.post(
    "/{id}/wishlist",
    response_model=GetWishlistSchema,
    status_code=status.HTTP_201_CREATED,
)
def agregar_wishlist(
    id: int,
    payload: CreateWishlistSchema,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return UsuarioService(db).agregar_a_wishlist(id, payload)


@router.get("/{id}/wishlist", response_model=list[GetWishlistSchema])
def obtener_wishlist(
    id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return UsuarioService(db).obtener_wishlist(id)


@router.delete("/{id}/wishlist/{juego_id}", status_code=status.HTTP_204_NO_CONTENT)
def quitar_wishlist(
    id: int,
    juego_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    UsuarioService(db).quitar_de_wishlist(id, juego_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{id}/logros/{logro_id}",
    response_model=GetLogroDesbloqueadoSchema,
    status_code=status.HTTP_201_CREATED,
)
def desbloquear_logro(
    id: int,
    logro_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return DesbloqueoLogroService(db).desbloquear_logro(id, logro_id)


@router.post(
    "/{id}/juegos/{juego_id}/progreso",
    response_model=list[GetLogroDesbloqueadoSchema],
)
def registrar_progreso_logros(
    id: int,
    juego_id: int,
    payload: ProgresoLogroSchema,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return DesbloqueoLogroService(db).registrar_progreso(
        id,
        juego_id,
        payload.evento,
        payload.valor,
    )


@router.get("/{id}/logros", response_model=list[GetLogroDesbloqueadoSchema])
def obtener_logros_desbloqueados(id: int, db: Session = Depends(get_db)):
    return UsuarioService(db).obtener_logros_desbloqueados(id)


@router.post(
    "/{id}/amigos", response_model=GetAmigoSchema, status_code=status.HTTP_201_CREATED
)
def agregar_amigo(
    id: int,
    payload: CreateAmigoSchema,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return UsuarioService(db).agregar_amigo(id, payload)


@router.get("/{id}/amigos", response_model=list[GetUsuarioSchema])
def obtener_amigos(id: int, db: Session = Depends(get_db)):
    return UsuarioService(db).obtener_amigos(id)


@router.get(
    "/{id}/solicitudes/recibidas", response_model=list[GetSolicitudAmistadSchema]
)
def solicitudes_recibidas(
    id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return SolicitudAmistadService(db).recibidas(id)


@router.get("/{id}/solicitudes/recibidas/cantidad", response_model=int)
def cantidad_solicitudes_recibidas(
    id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return SolicitudAmistadService(db).cantidad_recibidas(id)


@router.get(
    "/{id}/solicitudes/enviadas", response_model=list[GetSolicitudAmistadSchema]
)
def solicitudes_enviadas(
    id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    return SolicitudAmistadService(db).enviadas(id)


@router.delete("/{id}/amigos/{amigo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_amigo(
    id: int,
    amigo_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    require_same_user(id, usuario)
    UsuarioService(db).eliminar_amigo(id, amigo_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{id}/estadisticas", response_model=GetEstadisticasUsuarioSchema)
def obtener_estadisticas(id: int, db: Session = Depends(get_db)):
    return UsuarioService(db).obtener_estadisticas(id)
