from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base

# Usamos TYPE_CHECKING para evitar el subrayado amarillo y errores de importación circular
if TYPE_CHECKING:
    from src.db.models.registroUsuario_model import Usuario
    from src.db.models.desarrolladorJuego_model import Juego


class Wishlist(Base):
    __tablename__ = "wishlist"

    # Al tener primary_key=True en ambas, se crea una clave primaria compuesta.
    # Esto asegura que la combinación (usuario, juego) sea única.
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id"), primary_key=True)
    juego_id: Mapped[int] = mapped_column(Integer, ForeignKey("juego.id"), primary_key=True)
    
    fecha_agregado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )

    # Relaciones
    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="wishlist")
    juego: Mapped["Juego"] = relationship("Juego", back_populates="wishlist")
