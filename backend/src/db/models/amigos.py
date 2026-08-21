from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db.connection import Base


class Amigos(Base):
    __tablename__ = "amigos"

    # Restricción a nivel de base de datos para no ser amigo de uno mismo
    __table_args__ = (
        CheckConstraint("usuario_a != usuario_b", name="check_no_auto_amistad"),
    )

    # Clave primaria compuesta para impedir duplicados idénticos
    usuario_a: Mapped[int] = mapped_column(Integer, ForeignKey("usuario.id"), primary_key=True)
    usuario_b: Mapped[int] = mapped_column(Integer, ForeignKey("usuario.id"), primary_key=True)
    
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )