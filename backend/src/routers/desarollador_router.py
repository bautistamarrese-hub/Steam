from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from src.db.connection import get_db

from ..schemas.desarrolador_schema import CreateDesarrolladorSchema, GetDesarrolladorSchema
from src.schemas.juego_schema import GetJuegoSchema
from ..services.desarrolladorJuego_service import JuegoService

router = APIRouter(prefix="/desarrolladores", tags=["desarrolladores"])

@router.post("/", response_model=GetDesarrolladorSchema, status_code=status.HTTP_201_CREATED)
def crear_desarrollador(payload: CreateDesarrolladorSchema, db: Session = Depends(get_db)):
    return JuegoService(db).crear(payload)

# HU2 — Listar juegos del desarrollador
@router.get("/{id}/juegos", response_model=list[GetJuegoSchema])
def listar_juegos_desarrollador(id: int, db: Session = Depends(get_db)):
    return JuegoService(db).obtener_juegos(id)