from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base

if TYPE_CHECKING:
    from backend.src.db.models.registroUsuario_model import Usuario
    from backend.src.db.models.juego_model import Juego


class Resena(Base):
    __tablename__ = "resena"

    # Restricción: un usuario solo puede tener una reseña por juego
    __table_args__ = (
        UniqueConstraint("usuario_id", "juego_id", name="uq_usuario_juego_resena"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuario.id"), nullable=False)
    juego_id: Mapped[int] = mapped_column(Integer, ForeignKey("juego.id"), nullable=False)
    recomienda: Mapped[bool] = mapped_column(Boolean, nullable=False)
    texto: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="resenas")
    juego: Mapped["Juego"] = relationship("Juego", back_populates="resenas")