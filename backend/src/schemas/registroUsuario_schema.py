from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CreateUsuarioSchema(BaseModel):
    email: EmailStr = Field(
        ..., 
        description="Correo electrónico del usuario",
        json_schema_extra={"example": "usuario@ejemplo.com"}
    )
    nickname: str = Field(
        ..., 
        min_length=3, 
        max_length=50,
        description="Nombre de usuario público",
        json_schema_extra={"example": "juanperez123"}
    )
    password: str = Field(
        ..., 
        min_length=8,
        description="Contraseña secreta (mínimo 8 caracteres)",
        json_schema_extra={"example": "MiClaveSegura99!"}
    )
    
# Lo que devuelve la API al cliente (Salida)
class ResponseUsuarioSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    nickname: str
    saldo: float
    fecha_registro: datetime
    # NUNCA devolvemos la contraseña ni el password_hash por seguridad