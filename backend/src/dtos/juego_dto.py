from datetime import date
from pydantic import BaseModel

class CreateJuegoDTO(BaseModel): # POST
    titulo: str
    desarrollador_id: int
    precio: float
    fecha_lanzamiento: date | None = None
    genero: str

class UpdateJuegoDTO(BaseModel): # PUT/PATCH
    titulo: str | None = None
    precio: float | None = None
    genero: str | None = None

class GetJuegoDTO(BaseModel): # GET (individual)
    id: int

class JuegoResponseDTO(BaseModel):
    id: int
    titulo: str
    desarrollador_id: int
    precio: float
    fecha_lanzamiento: date | None
    genero: str

    model_config = {"from_attributes": True}