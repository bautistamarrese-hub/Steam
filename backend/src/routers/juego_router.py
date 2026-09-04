from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session
from src.db.connection import get_db
from src.db.models.registroUsuario_model import Usuario
from src.middlewares.auth_middleware import get_current_user, require_developer, require_same_user

from src.schemas.juego_schema import (
    CreateJuegoSchema,
    GetJuegoSchema,
    GetJuegoTopSchema,
    UpdateJuegoSchema,
)
from src.schemas.logro_schema import CreateLogroSchema, GetLogroSchema
from src.schemas.resena_schema import CreateResenaSchema, GetResenaSchema
from src.services.desarrolladorJuego_service import JuegoService

router = APIRouter(prefix="/juegos", tags=["juegos"])

# HU2 — Publicar juego
@router.post("/", response_model=GetJuegoSchema, status_code=status.HTTP_201_CREATED)
def publicar_juego(
    payload: CreateJuegoSchema,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    require_developer(usuario, payload.desarrollador_id)
    return JuegoService(db).publicar(payload)


@router.post("/{id}/archivo", response_model=GetJuegoSchema)
async def subir_archivo_juego(
    id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    servicio = JuegoService(db)
    require_developer(usuario, servicio.obtener_juego(id).desarrollador_id)
    return await servicio.guardar_archivo(id, archivo)

@router.get("/", response_model=list[GetJuegoSchema])
def listar_juegos(
    genero: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    return JuegoService(db).listar_juegos(genero, q)

# HU11 — Top ventas
@router.get("/top-ventas", response_model=list[GetJuegoTopSchema])
def top_ventas(genero: str | None = None, db: Session = Depends(get_db)):
    return JuegoService(db).obtener_top_ventas(genero)

# HU11 — Mejor valorados
@router.get("/mejor-valorados", response_model=list[GetJuegoTopSchema])
def mejor_valorados(genero: str | None = None, db: Session = Depends(get_db)):
    return JuegoService(db).obtener_mejor_valorados(genero)

@router.get("/{id}", response_model=GetJuegoSchema)
def obtener_juego(id: int, db: Session = Depends(get_db)):
    return JuegoService(db).obtener_juego(id)


@router.put("/{id}", response_model=GetJuegoSchema)
def actualizar_juego(
    id: int,
    payload: UpdateJuegoSchema,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    require_developer(usuario, payload.desarrollador_id)
    return JuegoService(db).actualizar_juego(id, payload)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_juego(
    id: int,
    desarrollador_id: int = Query(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    require_developer(usuario, desarrollador_id)
    JuegoService(db).eliminar_juego(id, desarrollador_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# HU8 — Definir logro
@router.post("/{id}/logros", response_model=GetLogroSchema, status_code=status.HTTP_201_CREATED)
def crear_logro(
    id: int,
    payload: CreateLogroSchema,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    servicio = JuegoService(db)
    require_developer(usuario, servicio.obtener_juego(id).desarrollador_id)
    return servicio.crear_logro(id, payload)

# HU8 — Obtener logros del juego
@router.get("/{id}/logros", response_model=list[GetLogroSchema])
def obtener_logros(id: int, db: Session = Depends(get_db)):
    return JuegoService(db).obtener_logros(id)

# HU7 — Publicar / Editar reseña
@router.post("/{id}/resenas", response_model=GetResenaSchema, status_code=status.HTTP_201_CREATED)
def publicar_resena(
    id: int,
    payload: CreateResenaSchema,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    require_same_user(payload.usuario_id, usuario)
    return JuegoService(db).publicar_resena(id, payload)

@router.get("/{id}/resenas", response_model=list[GetResenaSchema])
def obtener_resenas(id: int, db: Session = Depends(get_db)):
    return JuegoService(db).obtener_resenas(id)
