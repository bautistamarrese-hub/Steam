from datetime import datetime
from pydantic import BaseModel, Field

class CreateLogroSchema(BaseModel):
    juego_id: int
    nombre: str = Field(min_length=1)
    descripcion: str | None = None
    puntos: int = Field(ge=1, le=100)  # HU8: Entre 1 y 100

class GetLogroSchema(BaseModel):
    id: int
    juego_id: int
    nombre: str
    descripcion: str | None
    puntos: int

class DesbloquearLogroSchema(BaseModel):
    logro_id: int

class GetLogroDesbloqueadoSchema(BaseModel):
    usuario_id: int
    logro_id: int
    fecha: datetime