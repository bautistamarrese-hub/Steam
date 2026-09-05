from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.connection import Base


class SolicitudAmistad(Base):
    __tablename__ = "solicitudes_amistad"
    __table_args__ = (
        CheckConstraint("de != para", name="check_no_auto_solicitud"),
        CheckConstraint(
            "estado IN ('pendiente', 'aceptada', 'rechazada')",
            name="check_estado_solicitud",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    de: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    para: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    estado: Mapped[str] = mapped_column(
        String(20), default="pendiente", server_default="pendiente", nullable=False
    )
