from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.connection import Base


class NotificacionVenta(Base):
    __tablename__ = "notificaciones_venta"
    __table_args__ = (
        UniqueConstraint(
            "usuario_id",
            "juego_id",
            name="uq_notificacion_venta_usuario_juego",
        ),
        CheckConstraint("monto_acumulado > 0", name="check_notificacion_venta_monto"),
        CheckConstraint("cantidad_compras > 0", name="check_notificacion_venta_cantidad"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    juego_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("juego.id", ondelete="CASCADE"),
        nullable=False,
    )
    monto_acumulado: Mapped[float] = mapped_column(Float(precision=2), nullable=False)
    cantidad_compras: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
