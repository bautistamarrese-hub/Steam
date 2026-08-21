from typing import Optional
from sqlalchemy.orm import Session

from ..db.models.registroUsuario_model import Usuario


class UsuarioRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> Optional[Usuario]:
        return self.db.query(Usuario).filter(Usuario.email == email).first()

    def get_by_nickname(self, nickname: str) -> Optional[Usuario]:
        return self.db.query(Usuario).filter(Usuario.nickname == nickname).first()

    def save(self, usuario: Usuario) -> Usuario:
        self.db.add(usuario)
        self.db.commit()
        self.db.refresh(usuario)
        return usuario