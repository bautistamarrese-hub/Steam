from typing import Optional
from sqlalchemy.orm import Session
from backend.src.db.models.registroUsuario_model import Usuario
from backend.src.db.models.comprarJuego_model import Compra
from backend.src.db.models.desarrolladorJuego_model import Juego


class BibliotecaService:
    def __init__(self, db: Session):
        self.db = db

    def obtener_biblioteca(self, usuario_id: int, genero: Optional[str] = None) -> list[dict]:
        usuario = self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("El usuario no existe.")

        query = (
            self.db.query(Compra)
            .join(Juego, Compra.juego_id == Juego.id)
            .filter(Compra.usuario_id == usuario_id)
        )

        if genero:
            query = query.filter(Juego.genero == genero)

        compras = query.all()

        return [
            {
                "juego_id": item.juego.id,
                "titulo": item.juego.titulo,
                "genero": item.juego.genero,
                "precio_pagado": item.precio_pagado,
                "fecha_compra": item.fecha,
            }
            for item in compras
        ]