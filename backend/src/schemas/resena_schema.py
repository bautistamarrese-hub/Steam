from datetime import datetime
from pydantic import BaseModel, Field

class CreateResenaSchema(BaseModel):
    juego_id: int
    recomienda: bool
    texto: str | None = None

class UpdateResenaSchema(BaseModel):
    recomienda: bool | None = None
    texto: str | None = None

class GetResenaSchema(BaseModel):
    id: int
    usuario_id: int
    juego_id: int
    recomienda: bool
    texto: str | None
    fecha: datetime