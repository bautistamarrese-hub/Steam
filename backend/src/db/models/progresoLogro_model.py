from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.connection import Base


class ProgresoLogro(Base):
    __tablename__ = "progreso_logro"
    __table_args__ = (
        UniqueConstraint("usuario_id", "juego_id", "evento", name="uq_progreso_usuario_juego_evento"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
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
        index=True,
    )
    evento: Mapped[str] = mapped_column(String(100), nullable=False)
    valor: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
