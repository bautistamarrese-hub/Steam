from typing import Optional
from sqlalchemy.orm import Session
from backend.src.db.models.registroUsuario_model import Usuario
from backend.src.db.models.juego_model import Juego
from backend.src.db.models.compra_model import Compra
from backend.src.db.models.resena_model import Resena


class ResenaService:
    def __init__(self, db: Session):
        self.db = db

    def crear_o_actualizar_resena(
        self, usuario_id: int, juego_id: int, recomienda: bool, texto: Optional[str] = None
    ) -> Resena:
        if not self.db.query(Usuario).filter(Usuario.id == usuario_id).first():
            raise ValueError("El usuario no existe.")
        if not self.db.query(Juego).filter(Juego.id == juego_id).first():
            raise ValueError("El juego no existe.")

        # Verificar si compró el juego
        comprado = (
            self.db.query(Compra)
            .filter(Compra.usuario_id == usuario_id, Compra.juego_id == juego_id)
            .first()
        )
        if not comprado:
            raise ValueError("Solo los usuarios que compraron el juego pueden publicar una reseña.")

        # Buscar si ya existe una reseña para actualizarla
        resena = (
            self.db.query(Resena)
            .filter(Resena.usuario_id == usuario_id, Resena.juego_id == juego_id)
            .first()
        )

        if resena:
            resena.recomienda = recomienda
            resena.texto = texto
        else:
            resena = Resena(
                usuario_id=usuario_id,
                juego_id=juego_id,
                recomienda=recomienda,
                texto=texto
            )
            self.db.add(resena)

        self.db.commit()
        self.db.refresh(resena)
        return resena