from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class CreateSolicitudAmistadSchema(BaseModel):
    de: int
    para: int


class UpdateSolicitudAmistadSchema(BaseModel):
    estado: Literal["aceptada", "rechazada"]


class GetSolicitudAmistadSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    de: int
    para: int
    fecha: datetime
    estado: Literal["pendiente", "aceptada", "rechazada"]
