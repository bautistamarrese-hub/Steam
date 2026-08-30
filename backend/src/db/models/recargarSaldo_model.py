from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base

if TYPE_CHECKING:
    from src.db.models.registroUsuario_model import Usuario


class Recarga(Base):
    __tablename__ = "recarga"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id"), nullable=False
    )
    monto: Mapped[float] = mapped_column(Float(precision=2), nullable=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="recargas")
