from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field

class CreateJuegoSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    titulo: str = Field(min_length=1)
    desarrollador_id: int
    precio: float = Field(ge=0.0)  # HU2: Mayor o igual a 0
    fecha_lanzamiento: date | None = None
    genero: str = Field(min_length=1)

class GetJuegoSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    desarrollador_id: int
    precio: float
    fecha_lanzamiento: date | None
    genero: str
    archivo_nombre: str | None = None
    archivo_url: str | None = None
    es_jugable: bool = False


class GetJuegoTopSchema(GetJuegoSchema):
    compras: int
    total_resenas: int
    porcentaje_positivas: float


class GetItemBibliotecaSchema(BaseModel):
    juego: GetJuegoSchema
    fecha: datetime
    precio_pagado: float
