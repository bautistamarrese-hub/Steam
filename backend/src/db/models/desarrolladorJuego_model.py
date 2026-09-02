from datetime import date
from typing import List, Optional, TYPE_CHECKING

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.connection import Base

if TYPE_CHECKING:
    from src.db.models.comprarJuego_model import Compra
    from src.db.models.logros_model import Logro
    from src.db.models.reseñas_model import Resena
    from src.db.models.wishlist_model import Wishlist


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
    descripcion: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resumen: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    imagen: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    galeria: Mapped[Optional[list[str]]] = mapped_column(JSON, nullable=True)
    archivo_nombre: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    archivo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    es_jugable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relación inversa
    desarrollador: Mapped["Desarrollador"] = relationship("Desarrollador", back_populates="juegos")
    compras: Mapped[List["Compra"]] = relationship("Compra", back_populates="juego")
    wishlist: Mapped[List["Wishlist"]] = relationship("Wishlist", back_populates="juego")
    resenas: Mapped[List["Resena"]] = relationship("Resena", back_populates="juego")
    logros: Mapped[List["Logro"]] = relationship("Logro", back_populates="juego")
