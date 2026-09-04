from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CreateLogroSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str = Field(min_length=1)
    descripcion: str | None = None
    puntos: int = Field(ge=1, le=100)
    requisito_evento: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        pattern=r"^[a-z0-9_:-]+$",
    )
    requisito_valor: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validar_requisito(self):
        if (self.requisito_evento is None) != (self.requisito_valor is None):
            raise ValueError("La clave y el valor objetivo del requisito deben enviarse juntos.")
        return self


class GetLogroSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    juego_id: int
    nombre: str
    descripcion: str | None
    puntos: int
    requisito_evento: str | None
    requisito_valor: float | None


class ProgresoLogroSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    evento: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9_:-]+$")
    valor: float = Field(ge=0)


class DesbloquearLogroSchema(BaseModel):
    logro_id: int


class GetLogroDesbloqueadoSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usuario_id: int
    logro_id: int
    fecha: datetime
