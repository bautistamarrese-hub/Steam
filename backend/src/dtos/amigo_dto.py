from datetime import datetime
from pydantic import BaseModel

class CreateAmigoDTO(BaseModel): # POST
    usuario_a: int
    usuario_b: int

class AmigoResponseDTO(BaseModel):
    usuario_a: int
    usuario_b: int
    fecha: datetime

    model_config = {"from_attributes": True}