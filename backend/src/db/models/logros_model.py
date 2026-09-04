from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base

if TYPE_CHECKING:
    from src.db.models.desarrolladorJuego_model import Juego
    from src.db.models.desbloquearLogro_model import LogroDesbloqueado


class Logro(Base):
    __tablename__ = "logro"

    # Restricciones del negocio a nivel de base de datos
    __table_args__ = (
        UniqueConstraint("nombre", "juego_id", name="uq_nombre_logro_juego"),
        CheckConstraint("puntos >= 1 AND puntos <= 100", name="check_puntos_rango"),
        CheckConstraint(
            "(requisito_evento IS NULL AND requisito_valor IS NULL) OR "
            "(requisito_evento IS NOT NULL AND requisito_valor > 0)",
            name="check_requisito_logro_completo",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    juego_id: Mapped[int] = mapped_column(Integer, ForeignKey("juego.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    puntos: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    requisito_evento: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    requisito_valor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relación con el juego al que pertenece
    juego: Mapped["Juego"] = relationship("Juego", back_populates="logros")

    desbloqueados: Mapped[list["LogroDesbloqueado"]] = relationship(
        "LogroDesbloqueado",
        back_populates="logro",
    )
