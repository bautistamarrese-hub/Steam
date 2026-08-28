from sqlalchemy.orm import Session
from ..db.models.desarrolladorJuego_model import Juego, Desarrollador
from ..db.models.logros_model import Logro
from ..dtos.juego_dto import CreateJuegoDTO


class JuegoService:
    def __init__(self, db: Session):
        self.db = db


    def publicar_juego(
        self,
        desarrollador_id: int,
        juego_dto: CreateJuegoDTO
    ) -> Juego:

        desarrollador = (
            self.db.query(Desarrollador)
            .filter(Desarrollador.id == desarrollador_id)
            .first()
        )

        if not desarrollador:
            raise ValueError(
                "El desarrollador especificado no existe."
            )

        if juego_dto.precio < 0:
            raise ValueError(
                "El precio debe ser mayor o igual a 0."
            )

        juego_existente = (
            self.db.query(Juego)
            .filter(
                Juego.desarrollador_id == desarrollador_id,
                Juego.titulo == juego_dto.titulo,
            )
            .first()
        )

        if juego_existente:
            raise ValueError(
                "Este desarrollador ya tiene un juego con ese título."
            )

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


    def obtener_juegos_por_desarrollador(
        self,
        desarrollador_id: int
    ) -> list[Juego]:

        desarrollador = (
            self.db.query(Desarrollador)
            .filter(Desarrollador.id == desarrollador_id)
            .first()
        )

        if not desarrollador:
            raise ValueError(
                "El desarrollador especificado no existe."
            )

        return desarrollador.juegos


    # HU8 — Crear logro
    def crear_logro(
        self,
        juego_id: int,
        payload
    ) -> Logro:

        juego = (
            self.db.query(Juego)
            .filter(Juego.id == juego_id)
            .first()
        )

        if not juego:
            raise ValueError("El juego no existe.")

        if payload.juego_id != juego_id:
            raise ValueError(
                "El juego_id enviado no coincide con el juego de la URL."
            )

        if payload.puntos < 1 or payload.puntos > 100:
            raise ValueError(
                "Los puntos del logro deben estar entre 1 y 100."
            )

        logro_existente = (
            self.db.query(Logro)
            .filter(
                Logro.juego_id == juego_id,
                Logro.nombre == payload.nombre
            )
            .first()
        )

        if logro_existente:
            raise ValueError(
                "Ya existe un logro con ese nombre para este juego."
            )

        nuevo_logro = Logro(
            juego_id=juego_id,
            nombre=payload.nombre,
            descripcion=payload.descripcion,
            puntos=payload.puntos
        )

        self.db.add(nuevo_logro)
        self.db.commit()
        self.db.refresh(nuevo_logro)

        return nuevo_logro


    # HU8 — Obtener logros
    def obtener_logros(
        self,
        juego_id: int
    ) -> list[Logro]:

        juego = (
            self.db.query(Juego)
            .filter(Juego.id == juego_id)
            .first()
        )

        if not juego:
            raise ValueError("El juego no existe.")

        return (
            self.db.query(Logro)
            .filter(Logro.juego_id == juego_id)
            .all()
        )