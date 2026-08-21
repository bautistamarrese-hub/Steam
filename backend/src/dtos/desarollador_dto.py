from pydantic import BaseModel

class CreateDesarrolladorDTO(BaseModel): # POST
    nombre: str
    pais: str | None = None

class UpdateDesarrolladorDTO(BaseModel): # PUT/PATCH
    nombre: str | None = None
    pais: str | None = None

class GetDesarrolladorDTO(BaseModel): # GET (individual)
    id: int

class DesarrolladorResponseDTO(BaseModel):
    id: int
    nombre: str
    pais: str | None

    model_config = {"from_attributes": True}