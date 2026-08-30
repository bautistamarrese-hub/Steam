from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base


if TYPE_CHECKING:
    from src.db.models.comprarJuego_model import Compra
    from src.db.models.desbloquearLogro_model import LogroDesbloqueado
    from src.db.models.recargarSaldo_model import Recarga
    from src.db.models.reseñas_model import Resena
    from src.db.models.wishlist_model import Wishlist


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

    compras: Mapped[list["Compra"]] = relationship("Compra", back_populates="usuario")
    wishlist: Mapped[list["Wishlist"]] = relationship("Wishlist", back_populates="usuario")
    resenas: Mapped[list["Resena"]] = relationship("Resena", back_populates="usuario")
    recargas: Mapped[list["Recarga"]] = relationship("Recarga", back_populates="usuario")
