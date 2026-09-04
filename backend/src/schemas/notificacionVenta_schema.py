from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class GetNotificacionVentaSchema(BaseModel):
    id: int
    juego_id: int
    juego_titulo: str
    monto_acumulado: float
    cantidad_compras: int
    fecha_actualizacion: datetime


class PuntoIngresoSchema(BaseModel):
    fecha: date
    monto: float


class IngresoPorJuegoSchema(BaseModel):
    juego_id: int
    titulo: str
    precio: float
    cantidad_ventas: int
    generado: float


class GetIngresosDesarrolladorSchema(BaseModel):
    periodo: Literal["7d", "30d", "total"]
    ganado_total: float
    gastado_total: float
    balance: float
    ingreso_periodo: float
    serie: list[PuntoIngresoSchema]
    juegos: list[IngresoPorJuegoSchema]
