from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base

# Esto le avisa a VS Code de dónde vienen las clases sin romper la ejecución
if TYPE_CHECKING:
    # ⚠️ ASEGURATE DE CAMBIAR ESTAS RUTAS POR LAS TUYAS ⚠️
    from src.db.models.registroUsuario_model import Usuario
    from src.db.models.juego_model import Juego


class Compra(Base):
    __tablename__ = "compra"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuario.id"), nullable=False)
    juego_id: Mapped[int] = mapped_column(Integer, ForeignKey("juego.id"), nullable=False)
    
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(), 
        nullable=False
    )
    
    precio_pagado: Mapped[float] = mapped_column(Float(precision=2), nullable=False)

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="compras")
    juego: Mapped["Juego"] = relationship("Juego", back_populates="compras")