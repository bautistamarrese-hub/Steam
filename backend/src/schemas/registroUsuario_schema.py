from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Lo que envia el usuario al registrarse (Entrada)
class UsuarioCreate(BaseModel):
    email: EmailStr
    nickname: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, description="Contraseña en texto plano")


# Lo que devuelve la API al cliente (Salida)
class UsuarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    nickname: str
    saldo: float
    fecha_registro: datetime
    # NUNCA devolvemos la contraseña ni el password_hash por seguridad