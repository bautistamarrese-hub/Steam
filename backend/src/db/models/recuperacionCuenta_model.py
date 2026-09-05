from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.connection import Base


class RecuperacionCuenta(Base):
    __tablename__ = "recuperacion_cuenta"

    usuario_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True,
    )
    pregunta_1: Mapped[str] = mapped_column(String(200), nullable=False)
    respuesta_1_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    pregunta_2: Mapped[str] = mapped_column(String(200), nullable=False)
    respuesta_2_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
