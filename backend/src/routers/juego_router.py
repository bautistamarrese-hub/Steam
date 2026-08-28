from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from src.db.connection import get_db

from src.schemas.juego_schema import CreateJuegoSchema, GetJuegoSchema
from src.schemas.logro_schema import CreateLogroSchema, GetLogroSchema
from src.schemas.resena_schema import CreateResenaSchema, GetResenaSchema
from src.services.desarrolladorJuego_service import JuegoService

router = APIRouter(prefix="/juegos", tags=["juegos"])

# HU2 — Publicar juego
@router.post("/", response_model=GetJuegoSchema, status_code=status.HTTP_201_CREATED)
def publicar_juego(payload: CreateJuegoSchema, db: Session = Depends(get_db)):
    return JuegoService(db).publicar(payload)

# HU11 — Top ventas
@router.get("/top-ventas", response_model=list[GetJuegoSchema])
def top_ventas(genero: str | None = None, db: Session = Depends(get_db)):
    return JuegoService(db).obtener_top_ventas(genero)

# HU11 — Mejor valorados
@router.get("/mejor-valorados", response_model=list[GetJuegoSchema])
def mejor_valorados(genero: str | None = None, db: Session = Depends(get_db)):
    return JuegoService(db).obtener_mejor_valorados(genero)

# HU8 — Definir logro
@router.post("/{id}/logros", response_model=GetLogroSchema, status_code=status.HTTP_201_CREATED)
def crear_logro(id: int, payload: CreateLogroSchema, db: Session = Depends(get_db)):
    return JuegoService(db).crear_logro(id, payload)

# HU8 — Obtener logros del juego
@router.get("/{id}/logros", response_model=list[GetLogroSchema])
def obtener_logros(id: int, db: Session = Depends(get_db)):
    return JuegoService(db).obtener_logros(id)

# HU7 — Publicar / Editar reseña
@router.post("/{id}/resenas", response_model=GetResenaSchema, status_code=status.HTTP_201_CREATED)
def publicar_resena(id: int, payload: CreateResenaSchema, db: Session = Depends(get_db)):
    return JuegoService(db).publicar_resena(id, payload)