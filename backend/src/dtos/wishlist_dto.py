from datetime import datetime
from pydantic import BaseModel

class CreateWishlistDTO(BaseModel): # POST
    usuario_id: int
    juego_id: int

class WishlistResponseDTO(BaseModel):
    usuario_id: int
    juego_id: int
    fecha_agregado: datetime

    model_config = {"from_attributes": True}