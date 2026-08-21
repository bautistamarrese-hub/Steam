from datetime import datetime
from pydantic import BaseModel

class CreateCompraDTO(BaseModel): # POST
    usuario_id: int
    juego_id: int

class GetCompraDTO(BaseModel): # GET (individual)
    id: int

class CompraResponseDTO(BaseModel):
    id: int
    usuario_id: int
    juego_id: int
    fecha: datetime
    precio_pagado: float

    model_config = {"from_attributes": True}