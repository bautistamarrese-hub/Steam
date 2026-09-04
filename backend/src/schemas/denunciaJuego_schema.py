from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CreateDenunciaJuegoSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    motivo: str = Field(min_length=10, max_length=1000)


class ResolverDenunciaJuegoSchema(BaseModel):
    estado: Literal["aceptada", "rechazada"]


class GetDenunciaJuegoSchema(BaseModel):
    id: int
    usuario_id: int
    usuario_nickname: str
    juego_id: int
    juego_titulo: str
    motivo: str
    estado: Literal["pendiente", "aceptada", "rechazada"]
    fecha: datetime
    fecha_resolucion: datetime | None
