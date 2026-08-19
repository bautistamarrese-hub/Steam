from pydantic import BaseModel, ConfigDict, EmailStr
from datetime import datetime


class CreateUsuarioDTO(BaseModel):
    email: EmailStr
    nickname: str
    password: str


class UsuarioResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    nickname: str
    saldo: float
    fecha_registro: datetime 