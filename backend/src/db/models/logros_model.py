from typing import Optional, TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base

if TYPE_CHECKING:
    from backend.src.db.models.desarrolladorJuego_model import Juego


class Logro(Base):
    __tablename__ = "logro"

    # Restricciones del negocio a nivel de base de datos
    __table_args__ = (
        UniqueConstraint("nombre", "juego_id", name="uq_nombre_logro_juego"),
        CheckConstraint("puntos >= 1 AND puntos <= 100", name="check_puntos_rango"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    juego_id: Mapped[int] = mapped_column(Integer, ForeignKey("juego.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    puntos: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Relación con el juego al que pertenece
    juego: Mapped["Juego"] = relationship("Juego", back_populates="logros")