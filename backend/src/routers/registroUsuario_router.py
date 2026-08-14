from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from backend.src.dtos.registroUsuario_dto import CreateUsuarioDTO, UsuarioResponseDTO
from backend.src.schemas.registroUsuario_schema import CreateUsuarioSchema
from backend.src.services.registroUsuario_service import UsuarioService

router = APIRouter(prefix="/Usuario", tags=["Usuario"])


@router.post("/", response_model=UsuarioResponseDTO, status_code=status.HTTP_201_CREATED)
def create_conductor(payload: CreateUsuarioSchema, db: Session = Depends(get_db)):
    """Crea un nuevo conductor."""
    dto = CreateUsuarioDTO(**payload.model_dump())
    return UsuarioService(db).create(dto)

@router.get("/{conductor_id}", response_model=UsuarioResponseDTO)
def get_conductor(conductor_id: int, db: Session = Depends(get_db)):
    result = UsuarioService(db).get_by_id(conductor_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conductor no encontrado")
    return result

@router.put("/{conductor_id}", response_model=UsuarioResponseDTO)
def update_conductor(conductor_id: int, payload: CreateUsuarioSchema, db: Session = Depends(get_db)):
    dto = CreateUsuarioDTO(**payload.model_dump())
    result = UsuarioService(db).update(conductor_id, dto)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conductor no encontrado")
    return result

@router.delete("/{conductor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conductor(conductor_id: int, db: Session = Depends(get_db)):
    deleted = UsuarioService(db).delete(conductor_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conductor no encontrado")
