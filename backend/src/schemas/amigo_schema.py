from datetime import datetime
from pydantic import BaseModel

class CreateAmigoSchema(BaseModel):
    amigo_id: int

class GetAmigoSchema(BaseModel):
    usuario_a: int
    usuario_b: int
    fecha: datetime