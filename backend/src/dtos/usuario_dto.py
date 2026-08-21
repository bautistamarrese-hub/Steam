from datetime import datetime
from pydantic import BaseModel

class CreateUsuarioDTO(BaseModel): # POST
    email: str
    nickname: str

class UpdateUsuarioDTO(BaseModel): # PUT/PATCH
    email: str | None = None
    nickname: str | None = None

class RecargarSaldoDTO(BaseModel): # POST
    monto: float

class GetUsuarioDTO(BaseModel): # GET (individual)
    id: int

class UsuarioResponseDTO(BaseModel):
    id: int
    email: str
    nickname: str
    saldo: float
    fecha_registro: datetime

    model_config = {"from_attributes": True}