from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.db.connection import get_db

from src.schemas.usuario_schema import (
    CreateUsuarioSchema, GetUsuarioSchema, RecargarSaldoSchema, GetEstadisticasUsuarioSchema
)
from src.schemas.juego_schema import GetJuegoSchema
from src.schemas.wishlist_schema import CreateWishlistSchema, GetWishlistSchema
from src.schemas.logro_schema import GetLogroDesbloqueadoSchema
from src.schemas.amigo_schema import CreateAmigoSchema, GetAmigoSchema
from src.services.registroUsuario_service import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

# HU1 — Registro de usuario
@router.post("/", response_model=GetUsuarioSchema, status_code=status.HTTP_201_CREATED)
def registrar_usuario(payload: CreateUsuarioSchema, db: Session = Depends(get_db)):
    return UsuarioService(db).registrar(payload)

# HU3 — Recargar saldo
@router.post("/{id}/recargar", status_code=status.HTTP_200_OK)
def recargar_saldo(id: int, payload: RecargarSaldoSchema, db: Session = Depends(get_db)):
    return UsuarioService(db).recargar_saldo(id, payload)

# HU4 — Comprar juego
@router.post("/{id}/comprar/{juego_id}", status_code=status.HTTP_201_CREATED)
def comprar_juego(id: int, juego_id: int, db: Session = Depends(get_db)):
    return UsuarioService(db).comprar_juego(id, juego_id)

# HU5 — Biblioteca del usuario
@router.get("/{id}/biblioteca", response_model=list[GetJuegoSchema])
def obtener_biblioteca(id: int, genero: str | None = None, db: Session = Depends(get_db)):
    return UsuarioService(db).obtener_biblioteca(id, genero)

# HU6 — Agregar a Wishlist
@router.post("/{id}/wishlist", response_model=GetWishlistSchema, status_code=status.HTTP_201_CREATED)
def agregar_wishlist(id: int, payload: CreateWishlistSchema, db: Session = Depends(get_db)):
    return UsuarioService(db).agregar_a_wishlist(id, payload)

# HU6 — Obtener Wishlist
@router.get("/{id}/wishlist", response_model=list[GetWishlistSchema])
def obtener_wishlist(id: int, db: Session = Depends(get_db)):
    return UsuarioService(db).obtener_wishlist(id)

# HU9 — Desbloquear logro
@router.post("/{id}/logros/{logro_id}", response_model=GetLogroDesbloqueadoSchema, status_code=status.HTTP_201_CREATED)
def desbloquear_logro(id: int, logro_id: int, db: Session = Depends(get_db)):
    return UsuarioService(db).desbloquear_logro(id, logro_id)

# HU10 — Agregar amigo
@router.post("/{id}/amigos", response_model=GetAmigoSchema, status_code=status.HTTP_201_CREATED)
def agregar_amigo(id: int, payload: CreateAmigoSchema, db: Session = Depends(get_db)):
    return UsuarioService(db).agregar_amigo(id, payload)

# HU12 — Estadísticas del usuario
@router.get("/{id}/estadisticas", response_model=GetEstadisticasUsuarioSchema)
def obtener_estadisticas(id: int, db: Session = Depends(get_db)):
    return UsuarioService(db).obtener_estadisticas(id)