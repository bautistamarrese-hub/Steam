from datetime import date
from typing import List, Optional

from sqlalchemy import Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base


class Desarrollador(Base):
    __tablename__ = "desarrollador"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    pais: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relación para listar los juegos del desarrollador
    juegos: Mapped[List["Juego"]] = relationship("Juego", back_populates="desarrollador")


class Juego(Base):
    __tablename__ = "juego"

    # Restricción: 'titulo' es único por desarrollador
    __table_args__ = (
        UniqueConstraint("titulo", "desarrollador_id", name="uq_titulo_desarrollador"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    desarrollador_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("desarrollador.id"), nullable=False
    )
    precio: Mapped[float] = mapped_column(Float(precision=2), nullable=False)
    fecha_lanzamiento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    genero: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relación inversa
    desarrollador: Mapped["Desarrollador"] = relationship("Desarrollador", back_populates="juegos")