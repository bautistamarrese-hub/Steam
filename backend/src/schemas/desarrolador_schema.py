from pydantic import BaseModel, ConfigDict, Field

class CreateDesarrolladorSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    nombre: str = Field(min_length=2)
    pais: str | None = None

class GetDesarrolladorSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    pais: str | None
