from pydantic import BaseModel, ConfigDict, Field

class CreateDesarrolladorSchema(BaseModel):
    nombre: str = Field(min_length=2)
    pais: str | None = None

class GetDesarrolladorSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    pais: str | None
