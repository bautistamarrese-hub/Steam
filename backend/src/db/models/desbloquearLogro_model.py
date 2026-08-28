from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base


if TYPE_CHECKING:
    from backend.src.db.models.registroUsuario_model import Usuario
    from backend.src.db.models.logros_model import Logro


class LogroDesbloqueado(Base):
    __tablename__ = "logrodesbloqueado"

    # La clave primaria compuesta evita desbloquear
    # el mismo logro más de una vez
    usuario_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("usuarios.id"),
        primary_key=True
    )

    logro_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("logro.id"),
        primary_key=True
    )

    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship(
        "Usuario",
        back_populates="logros_desbloqueados"
    )

    logro: Mapped["Logro"] = relationship(
        "Logro",
        back_populates="desbloqueados"
    )