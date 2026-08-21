from datetime import datetime
from pydantic import BaseModel

class CreateWishlistSchema(BaseModel):
    juego_id: int

class GetWishlistSchema(BaseModel):
    usuario_id: int
    juego_id: int
    fecha_agregado: datetime