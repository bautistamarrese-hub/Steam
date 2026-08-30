from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class CreateCompraSchema(BaseModel):
    juego_id: int

class GetCompraSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    juego_id: int
    precio_pagado: float
    fecha: datetime


class GetRecargaSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    monto: float
    fecha: datetime
