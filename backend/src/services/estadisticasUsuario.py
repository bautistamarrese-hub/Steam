from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from backend.src.db.models.registroUsuario_model import Usuario
from backend.src.db.models.comprarJuego_model import Compra
from backend.src.db.models.desbloquearLogro_model import LogroDesbloqueado
from backend.src.db.models.logros_model import Logro
from backend.src.db.models.amigos_model import Amigos


class EstadisticasUsuarioService:
    def __init__(self, db: Session):
        self.db = db

    def obtener_estadisticas(self, usuario_id: int) -> dict:
        usuario = self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("El usuario no existe.")

        # 1. Total gastado y cantidad de juegos comprados
        compras_stats = (
            self.db.query(
                func.count(Compra.id).label("total_juegos"),
                func.coalesce(func.sum(Compra.precio_pagado), 0.0).label("total_gastado")
            )
            .filter(Compra.usuario_id == usuario_id)
            .first()
        )

        # 2. Cantidad de logros desbloqueados y puntos acumulados
        logros_stats = (
            self.db.query(
                func.count(LogroDesbloqueado.logro_id).label("total_logros"),
                func.coalesce(func.sum(Logro.puntos), 0).label("total_puntos")
            )
            .join(Logro, LogroDesbloqueado.logro_id == Logro.id)
            .filter(LogroDesbloqueado.usuario_id == usuario_id)
            .first()
        )

        # 3. Cantidad de amigos
        total_amigos = (
            self.db.query(func.count(Amigos.usuario_a))
            .filter(or_(Amigos.usuario_a == usuario_id, Amigos.usuario_b == usuario_id))
            .scalar()
        )

        # 4. Top 5 juegos más completados (%)
        juegos_comprados = (
            self.db.query(Compra.juego_id)
            .filter(Compra.usuario_id == usuario_id)
            .all()
        )

        progreso_juegos = []
        for (juego_id,) in juegos_comprados:
            total_logros_juego = (
                self.db.query(func.count(Logro.id))
                .filter(Logro.juego_id == juego_id)
                .scalar()
            )

            if total_logros_juego > 0:
                logros_usuario = (
                    self.db.query(func.count(LogroDesbloqueado.logro_id))
                    .join(Logro, LogroDesbloqueado.logro_id == Logro.id)
                    .filter(
                        LogroDesbloqueado.usuario_id == usuario_id,
                        Logro.juego_id == juego_id
                    )
                    .scalar()
                )
                porcentaje = (logros_usuario / total_logros_juego) * 100
                progreso_juegos.append({
                    "juego_id": juego_id,
                    "porcentaje_completado": round(porcentaje, 2)
                })

        progreso_juegos.sort(key=lambda x: x["porcentaje_completado"], reverse=True)
        top_5_completados = progreso_juegos[:5]

        return {
            "usuario_id": usuario_id,
            "total_juegos_comprados": compras_stats.total_juegos,
            "total_gastado": float(compras_stats.total_gastado),
            "total_logros_desbloqueados": logros_stats.total_logros,
            "total_puntos_logros": logros_stats.total_puntos,
            "cantidad_amigos": total_amigos,
            "top_5_juegos_completados": top_5_completados
        }