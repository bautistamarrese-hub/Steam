from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CreateAmigoSchema(BaseModel):
    amigo_id: int

class GetAmigoSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usuario_a: int
    usuario_b: int
    fecha: datetime
