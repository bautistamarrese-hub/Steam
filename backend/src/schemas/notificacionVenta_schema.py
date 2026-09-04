from datetime import datetime

from pydantic import BaseModel


class GetNotificacionVentaSchema(BaseModel):
    id: int
    juego_id: int
    juego_titulo: str
    monto_acumulado: float
    cantidad_compras: int
    fecha_actualizacion: datetime
