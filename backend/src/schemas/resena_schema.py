from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class CreateResenaSchema(BaseModel):
    usuario_id: int
    recomienda: bool
    texto: str | None = None

class UpdateResenaSchema(BaseModel):
    recomienda: bool | None = None
    texto: str | None = None

class GetResenaSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    juego_id: int
    recomienda: bool
    texto: str | None
    fecha: datetime
