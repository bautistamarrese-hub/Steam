from datetime import date, timedelta
from typing import Literal

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.db.models.desarrolladorJuego_model import Juego
from src.db.models.comprarJuego_model import Compra
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

    def resumen_ingresos(
        self,
        usuario: Usuario,
        periodo: Literal["7d", "30d", "total"],
    ) -> dict:
        if usuario.desarrollador_id is None:
            raise ValueError("La cuenta no pertenece a un desarrollador.")

        ventas = (
            self.db.query(Compra.fecha, Compra.precio_pagado)
            .join(Juego, Juego.id == Compra.juego_id)
            .filter(Juego.desarrollador_id == usuario.desarrollador_id)
            .order_by(Compra.fecha.asc())
            .all()
        )
        ganado_total = round(
            sum(precio * self.PORCENTAJE_DESARROLLADOR for _, precio in ventas),
            2,
        )
        gastado_total = round(
            sum(
                precio
                for (precio,) in self.db.query(Compra.precio_pagado)
                .filter(Compra.usuario_id == usuario.id)
                .all()
            ),
            2,
        )

        ingresos_por_juego = [
            {
                "juego_id": juego_id,
                "titulo": titulo,
                "precio": precio,
                "cantidad_ventas": cantidad_ventas,
                "generado": round(float(total_vendido or 0) * self.PORCENTAJE_DESARROLLADOR, 2),
            }
            for juego_id, titulo, precio, cantidad_ventas, total_vendido in (
                self.db.query(
                    Juego.id,
                    Juego.titulo,
                    Juego.precio,
                    func.count(Compra.id),
                    func.coalesce(func.sum(Compra.precio_pagado), 0.0),
                )
                .outerjoin(Compra, Compra.juego_id == Juego.id)
                .filter(Juego.desarrollador_id == usuario.desarrollador_id)
                .group_by(Juego.id, Juego.titulo, Juego.precio)
                .order_by(func.coalesce(func.sum(Compra.precio_pagado), 0.0).desc(), Juego.titulo)
                .all()
            )
        ]

        por_dia: dict[date, float] = {}
        for fecha, precio in ventas:
            dia = fecha.date()
            por_dia[dia] = round(
                por_dia.get(dia, 0.0) + precio * self.PORCENTAJE_DESARROLLADOR,
                2,
            )

        hoy = date.today()
        if periodo == "7d":
            dias = [hoy - timedelta(days=offset) for offset in range(6, -1, -1)]
        elif periodo == "30d":
            dias = [hoy - timedelta(days=offset) for offset in range(29, -1, -1)]
        else:
            dias = sorted(por_dia) or [hoy]

        serie = [{"fecha": dia, "monto": por_dia.get(dia, 0.0)} for dia in dias]
        return {
            "periodo": periodo,
            "ganado_total": ganado_total,
            "gastado_total": gastado_total,
            "balance": round(ganado_total - gastado_total, 2),
            "ingreso_periodo": round(sum(punto["monto"] for punto in serie), 2),
            "serie": serie,
            "juegos": ingresos_por_juego,
        }
