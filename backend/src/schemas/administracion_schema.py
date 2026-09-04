from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.schemas.usuario_schema import GetUsuarioSchema


class UpdateUsuarioAdminSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr | None = None
    nickname: str | None = Field(default=None, min_length=3, max_length=50)
    saldo: float | None = Field(default=None, ge=0.0)
    rol: Literal["cliente", "admin"] | None = None
    estudio: str | None = Field(default=None, min_length=2, max_length=100)
    password: str | None = Field(default=None, min_length=6, max_length=128)


class GetUsuarioAdminSchema(GetUsuarioSchema):
    cantidad_juegos_comprados: int
