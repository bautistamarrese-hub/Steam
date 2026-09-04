from sqlalchemy import func
from sqlalchemy.orm import Session

from src.db.models.desarrolladorJuego_model import Juego
from src.db.models.notificacionVenta_model import NotificacionVenta
from src.db.models.registroUsuario_model import Usuario


class NotificacionVentaService:
    PORCENTAJE_DESARROLLADOR = 0.60

    def __init__(self, db: Session):
        self.db = db

    def acreditar_venta(self, juego: Juego) -> float:
        ingreso = round(juego.precio * self.PORCENTAJE_DESARROLLADOR, 2)
        if ingreso <= 0:
            return 0.0

        # Bloquear la billetera del propietario serializa ventas simultaneas y
        # evita perder parte del saldo o del monto acumulado de la notificacion.
        propietario = (
            self.db.query(Usuario)
            .filter(Usuario.desarrollador_id == juego.desarrollador_id)
            .with_for_update()
            .first()
        )
        if not propietario:
            return 0.0

        propietario.saldo = round(propietario.saldo + ingreso, 2)
        notificacion = (
            self.db.query(NotificacionVenta)
            .filter_by(usuario_id=propietario.id, juego_id=juego.id)
            .first()
        )
        if notificacion:
            notificacion.monto_acumulado = round(
                notificacion.monto_acumulado + ingreso,
                2,
            )
            notificacion.cantidad_compras += 1
            notificacion.fecha_actualizacion = func.now()
        else:
            self.db.add(
                NotificacionVenta(
                    usuario_id=propietario.id,
                    juego_id=juego.id,
                    monto_acumulado=ingreso,
                    cantidad_compras=1,
                )
            )
        return ingreso

    def listar(self, usuario_id: int) -> list[dict]:
        return [
            {
                "id": notificacion.id,
                "juego_id": juego.id,
                "juego_titulo": juego.titulo,
                "monto_acumulado": notificacion.monto_acumulado,
                "cantidad_compras": notificacion.cantidad_compras,
                "fecha_actualizacion": notificacion.fecha_actualizacion,
            }
            for notificacion, juego in (
                self.db.query(NotificacionVenta, Juego)
                .join(Juego, Juego.id == NotificacionVenta.juego_id)
                .filter(NotificacionVenta.usuario_id == usuario_id)
                .order_by(NotificacionVenta.fecha_actualizacion.desc())
                .all()
            )
        ]

    def confirmar(self, usuario_id: int, notificacion_id: int) -> None:
        notificacion = (
            self.db.query(NotificacionVenta)
            .filter_by(id=notificacion_id, usuario_id=usuario_id)
            .first()
        )
        if not notificacion:
            raise ValueError("La notificaciÃ³n de venta no existe.")
        self.db.delete(notificacion)
        self.db.commit()
