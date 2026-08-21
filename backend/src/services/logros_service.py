from typing import Optional
from sqlalchemy.orm import Session
from backend.src.db.models.juego_model import Juego
from backend.src.db.models.logro_model import Logro


class LogroService:
    def __init__(self, db: Session):
        self.db = db

    def crear_logro(
        self, juego_id: int, nombre: str, descripcion: Optional[str], puntos: int
    ) -> Logro:
        if not self.db.query(Juego).filter(Juego.id == juego_id).first():
            raise ValueError("El juego no existe.")

        if puntos < 1 or puntos > 100:
            raise ValueError("Los puntos deben estar entre 1 y 100.")

        # Nombre único por juego
        existente = (
            self.db.query(Logro)
            .filter(Logro.juego_id == juego_id, Logro.nombre == nombre)
            .first()
        )
        if existente:
            raise ValueError("Ya existe un logro con ese nombre para este juego.")

        nuevo_logro = Logro(
            juego_id=juego_id,
            nombre=nombre,
            descripcion=descripcion,
            puntos=puntos
        )
        self.db.add(nuevo_logro)
        self.db.commit()
        self.db.refresh(nuevo_logro)
        return nuevo_logro

    def obtener_logros_de_juego(self, juego_id: int) -> list[Logro]:
        if not self.db.query(Juego).filter(Juego.id == juego_id).first():
            raise ValueError("El juego no existe.")

        return self.db.query(Logro).filter(Logro.juego_id == juego_id).all()