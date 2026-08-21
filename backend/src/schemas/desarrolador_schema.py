from pydantic import BaseModel, Field

class CreateDesarrolladorSchema(BaseModel):
    nombre: str = Field(min_length=2)
    pais: str | None = None

class GetDesarrolladorSchema(BaseModel):
    id: int
    nombre: str
    pais: str | None