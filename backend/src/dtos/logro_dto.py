from datetime import datetime
from pydantic import BaseModel

class CreateLogroDTO(BaseModel): # POST
    juego_id: int
    nombre: str
    descripcion: str | None = None
    puntos: int

class LogroResponseDTO(BaseModel):
    id: int
    juego_id: int
    nombre: str
    descripcion: str | None
    puntos: int

    model_config = {"from_attributes": True}

class DesbloquearLogroDTO(BaseModel): # POST
    usuario_id: int
    logro_id: int

class LogroDesbloqueadoResponseDTO(BaseModel):
    usuario_id: int
    logro_id: int
    fecha: datetime

    model_config = {"from_attributes": True}