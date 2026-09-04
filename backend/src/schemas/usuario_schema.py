from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from src.schemas.juego_schema import GetJuegoSchema

class CreateUsuarioSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    nickname: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)
    rol: Literal["cliente", "admin"] = "cliente"
    estudio: str | None = Field(default=None, min_length=2, max_length=100)


class LoginUsuarioSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

class RecargarSaldoSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    monto: float = Field(ge=100.0, le=30000.0)
    titular: str = Field(min_length=3, max_length=100)
    vencimiento: str = Field(pattern=r"^(0[1-9]|1[0-2])/\d{2}$")

    @field_validator("titular")
    @classmethod
    def validar_titular(cls, valor: str) -> str:
        if len(valor.split()) < 2 or not all(
            caracter.isalpha() or caracter in "' -" for caracter in valor
        ):
            raise ValueError("Ingresá el nombre y apellido del titular de la tarjeta.")
        return valor

    @field_validator("vencimiento")
    @classmethod
    def validar_vencimiento(cls, valor: str) -> str:
        mes, anio_corto = (int(parte) for parte in valor.split("/"))
        hoy = date.today()
        anio = 2000 + anio_corto
        if anio < hoy.year or (anio == hoy.year and mes < hoy.month):
            raise ValueError("La tarjeta está vencida.")
        return valor

class GetUsuarioSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    nickname: str
    saldo: float
    fecha_registro: datetime
    rol: Literal["cliente", "admin", "superadmin"]
    desarrollador_id: int | None
    avatar: str | None = None


class LoginResponseSchema(BaseModel):
    usuario: GetUsuarioSchema
    access_token: str
    token_type: Literal["bearer"] = "bearer"

class ProgresoJuegoSchema(BaseModel):
    juego: GetJuegoSchema
    porcentaje: int
    desbloqueados: int
    total: int


class GetEstadisticasUsuarioSchema(BaseModel):
    total_gastado: float
    cantidad_juegos: int
    logros_desbloqueados: int
    puntos_totales: int
    cantidad_amigos: int
    top_completados: list[ProgresoJuegoSchema]
