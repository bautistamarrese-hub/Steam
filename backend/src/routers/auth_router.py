from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.dtos.auth_dto import LoginDTO, TokenDTO
from backend.src.schemas.usuario_schema import LoginSchema, TokenSchema
from src.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenSchema)
def login(payload: LoginSchema, db: Session = Depends(get_db)):
    dto = LoginDTO(**payload.model_dump())
    token: TokenDTO = AuthService(db).login(dto)
    return TokenSchema(**token.model_dump())
