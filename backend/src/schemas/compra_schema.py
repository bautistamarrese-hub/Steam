from datetime import datetime
from pydantic import BaseModel, Field

class CreateCompraSchema(BaseModel):
    juego_id: int

class GetCompraSchema(BaseModel):
    id: int
    usuario_id: int
    juego_id: int
    precio_pagado: float
    fecha: datetime