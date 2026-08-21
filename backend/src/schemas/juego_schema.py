from datetime import date
from pydantic import BaseModel, Field

class CreateJuegoSchema(BaseModel):
    titulo: str = Field(min_length=1)
    desarrollador_id: int
    precio: float = Field(ge=0.0)  # HU2: Mayor o igual a 0
    fecha_lanzamiento: date | None = None
    genero: str

class GetJuegoSchema(BaseModel):
    id: int
    titulo: str
    desarrollador_id: int
    precio: float
    fecha_lanzamiento: date | None
    genero: str