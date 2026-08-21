from datetime import datetime
from pydantic import BaseModel

class CreateResenaDTO(BaseModel): # POST
    usuario_id: int
    juego_id: int
    recomienda: bool
    texto: str | None = None

class UpdateResenaDTO(BaseModel): # PUT/PATCH
    recomienda: bool | None = None
    texto: str | None = None

class GetResenaDTO(BaseModel): # GET (individual)
    id: int

class ResenaResponseDTO(BaseModel):
    id: int
    usuario_id: int
    juego_id: int
    recomienda: bool
    texto: str | None
    fecha: datetime

    model_config = {"from_attributes": True}