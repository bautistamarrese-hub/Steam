from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.schemas.juego_schema import GetJuegoSchema

class CreateUsuarioSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    nickname: str = Field(min_length=3, max_length=50)
    rol: Literal["cliente", "admin"] = "cliente"
    estudio: str | None = Field(default=None, min_length=2, max_length=100)

class RecargarSaldoSchema(BaseModel):
    monto: float = Field(ge=100.0)  # HU3: Mínimo 100

class GetUsuarioSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    nickname: str
    saldo: float
    fecha_registro: datetime
    rol: Literal["cliente", "admin"]
    desarrollador_id: int | None

class ProgresoJuegoSchema(BaseModel):
    juego: GetJuegoSchema
    porcentaje: int
    desbloqueados: int
    total: int


class GetEstadisticasUsuarioSchema(BaseModel):
    total_gastado: float
    cantidad_juegos: int
    logros_desbloqueados: int
    puntos_totales: int
    cantidad_amigos: int
    top_completados: list[ProgresoJuegoSchema]
