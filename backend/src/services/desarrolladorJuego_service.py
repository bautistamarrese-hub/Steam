from sqlalchemy.orm import Session
from ..db.models.desarrolladorJuego_model import Juego, Desarrollador
from ..dtos.juego_dto import CreateJuegoDTO


class JuegoService:
    def __init__(self, db: Session):
        self.db = db

    def publicar_juego(self, desarrollador_id: int, juego_dto: CreateJuegoDTO) -> Juego:
        # 1. Validar que el desarrollador existe
        desarrollador = (
            self.db.query(Desarrollador)
            .filter(Desarrollador.id == desarrollador_id)
            .first()
        )
        if not desarrollador:
            raise ValueError("El desarrollador especificado no existe.")

        # 2. Validar precio mayor o igual a 0
        if juego_dto.precio < 0:
            raise ValueError("El precio debe ser mayor o igual a 0.")

        # 3. Validar que el título sea único para este desarrollador
        juego_existente = (
            self.db.query(Juego)
            .filter(
                Juego.desarrollador_id == desarrollador_id,
                Juego.titulo == juego_dto.titulo,
            )
            .first()
        )
        if juego_existente:
            raise ValueError("Este desarrollador ya tiene un juego con ese título.")

        # Guardar en base de datos
        nuevo_juego = Juego(
            titulo=juego_dto.titulo,
            desarrollador_id=desarrollador_id,
            precio=juego_dto.precio,
            fecha_lanzamiento=juego_dto.fecha_lanzamiento,
            genero=juego_dto.genero,
        )

        self.db.add(nuevo_juego)
        self.db.commit()
        self.db.refresh(nuevo_juego)
        return nuevo_juego

    def obtener_juegos_por_desarrollador(self, desarrollador_id: int) -> list[Juego]:
        # Validar que el desarrollador existe
        desarrollador = (
            self.db.query(Desarrollador)
            .filter(Desarrollador.id == desarrollador_id)
            .first()
        )
        if not desarrollador:
            raise ValueError("El desarrollador especificado no existe.")

        return desarrollador.juegos