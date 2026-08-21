from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class CreateUsuarioSchema(BaseModel):
    email: EmailStr
    nickname: str = Field(min_length=3)

class RecargarSaldoSchema(BaseModel):
    monto: float = Field(ge=100.0)  # HU3: Mínimo 100

class GetUsuarioSchema(BaseModel):
    id: int
    email: EmailStr
    nickname: str
    saldo: float
    fecha_registro: datetime

class GetEstadisticasUsuarioSchema(BaseModel):
    total_gastado: float
    cantidad_juegos: int
    cantidad_logros: int
    puntos_totales: int
    cantidad_amigos: int
    top_completados: list[dict]