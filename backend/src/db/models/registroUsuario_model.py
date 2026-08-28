from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base


if TYPE_CHECKING:
    from backend.src.db.models.desbloquearLogro_model import LogroDesbloqueado


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False
    )

    nickname: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    saldo: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )

    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Logros desbloqueados por el usuario
    logros_desbloqueados: Mapped[list["LogroDesbloqueado"]] = relationship(
        "LogroDesbloqueado",
        back_populates="usuario"
    )