from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CreateWishlistSchema(BaseModel):
    juego_id: int

class GetWishlistSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usuario_id: int
    juego_id: int
    fecha_agregado: datetime
