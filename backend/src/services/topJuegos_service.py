from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from backend.src.db.models.juego_model import Juego
from backend.src.db.models.compra_model import Compra
from backend.src.db.models.resena_model import Resena


class TopJuegosService:
    def __init__(self, db: Session):
        self.db = db

    def obtener_top_ventas(self, genero: Optional[str] = None, limite: int = 10) -> list[dict]:
        query = (
            self.db.query(
                Juego.id,
                Juego.titulo,
                Juego.genero,
                func.count(Compra.id).label("total_ventas")
            )
            .join(Compra, Juego.id == Compra.juego_id)
            .group_by(Juego.id)
        )

        if genero:
            query = query.filter(Juego.genero == genero)

        resultados = query.order_by(desc("total_ventas")).limit(limite).all()

        return [
            {"juego_id": r.id, "titulo": r.titulo, "genero": r.genero, "total_ventas": r.total_ventas}
            for r in resultados
        ]

    def obtener_mejor_valorados(self, genero: Optional[str] = None, limite: int = 10) -> list[dict]:
        query = (
            self.db.query(
                Juego.id,
                Juego.titulo,
                Juego.genero,
                (
                    func.sum(case((Resena.recomienda == True, 1), else_=0)) * 100.0 / func.count(Resena.id)
                ).label("porcentaje_positivo")
            )
            .join(Resena, Juego.id == Resena.juego_id)
            .group_by(Juego.id)
            .having(func.count(Resena.id) >= 20)
        )

        if genero:
            query = query.filter(Juego.genero == genero)

        resultados = query.order_by(desc("porcentaje_positivo")).limit(limite).all()

        return [
            {
                "juego_id": r.id,
                "titulo": r.titulo,
                "genero": r.genero,
                "porcentaje_positivo": round(r.porcentaje_positivo, 2)
            }
            for r in resultados
        ]