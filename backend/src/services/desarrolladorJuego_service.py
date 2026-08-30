from sqlalchemy import case, desc, func
from sqlalchemy.orm import Session

from src.db.models.comprarJuego_model import Compra
from src.db.models.desarrolladorJuego_model import Desarrollador, Juego
from src.db.models.logros_model import Logro
from src.db.models.reseñas_model import Resena
from src.db.models.registroUsuario_model import Usuario


class JuegoService:
    def __init__(self, db: Session):
        self.db = db

    def crear(self, payload) -> Desarrollador:
        desarrollador = Desarrollador(nombre=payload.nombre, pais=payload.pais)
        self.db.add(desarrollador)
        self.db.commit()
        self.db.refresh(desarrollador)
        return desarrollador

    def listar_desarrolladores(self) -> list[Desarrollador]:
        return self.db.query(Desarrollador).order_by(Desarrollador.nombre.asc()).all()

    def obtener_desarrollador(self, desarrollador_id: int) -> Desarrollador:
        desarrollador = self.db.query(Desarrollador).filter(
            Desarrollador.id == desarrollador_id
        ).first()
        if not desarrollador:
            raise ValueError("El desarrollador no existe.")
        return desarrollador

    def publicar(self, payload) -> Juego:
        self.obtener_desarrollador(payload.desarrollador_id)
        if self.db.query(Juego).filter(
            Juego.desarrollador_id == payload.desarrollador_id,
            func.lower(Juego.titulo) == payload.titulo.strip().lower(),
        ).first():
            raise ValueError("El desarrollador ya publicó un juego con ese título.")
        juego = Juego(
            titulo=payload.titulo,
            desarrollador_id=payload.desarrollador_id,
            precio=payload.precio,
            fecha_lanzamiento=payload.fecha_lanzamiento,
            genero=payload.genero,
        )
        self.db.add(juego)
        self.db.commit()
        self.db.refresh(juego)
        return juego

    def obtener_juegos(self, desarrollador_id: int) -> list[Juego]:
        self.obtener_desarrollador(desarrollador_id)
        return self.db.query(Juego).filter(
            Juego.desarrollador_id == desarrollador_id
        ).all()

    def listar_juegos(self, genero: str | None = None, q: str | None = None) -> list[Juego]:
        query = self.db.query(Juego)
        if genero:
            query = query.filter(Juego.genero == genero)
        if q:
            query = query.filter(Juego.titulo.ilike(f"%{q}%"))
        return query.order_by(Juego.id.desc()).all()

    def obtener_juego(self, juego_id: int) -> Juego:
        juego = self.db.query(Juego).filter(Juego.id == juego_id).first()
        if not juego:
            raise ValueError("El juego no existe.")
        return juego

    def crear_logro(self, juego_id: int, payload) -> Logro:
        self.obtener_juego(juego_id)
        if self.db.query(Logro).filter(
            Logro.juego_id == juego_id,
            func.lower(Logro.nombre) == payload.nombre.strip().lower(),
        ).first():
            raise ValueError("Ya existe un logro con ese nombre para este juego.")
        logro = Logro(
            juego_id=juego_id,
            nombre=payload.nombre,
            descripcion=payload.descripcion,
            puntos=payload.puntos,
        )
        self.db.add(logro)
        self.db.commit()
        self.db.refresh(logro)
        return logro

    def obtener_logros(self, juego_id: int) -> list[Logro]:
        self.obtener_juego(juego_id)
        return self.db.query(Logro).filter(Logro.juego_id == juego_id).all()

    def publicar_resena(self, juego_id: int, payload) -> Resena:
        self.obtener_juego(juego_id)
        if not self.db.query(Usuario).filter(Usuario.id == payload.usuario_id).first():
            raise ValueError("El usuario no existe.")
        if not self.db.query(Compra).filter_by(
            usuario_id=payload.usuario_id, juego_id=juego_id
        ).first():
            raise ValueError("Solo se pueden reseñar juegos comprados.")
        resena = self.db.query(Resena).filter_by(
            usuario_id=payload.usuario_id, juego_id=juego_id
        ).first()
        if resena:
            resena.recomienda = payload.recomienda
            resena.texto = payload.texto
        else:
            resena = Resena(
                usuario_id=payload.usuario_id,
                juego_id=juego_id,
                recomienda=payload.recomienda,
                texto=payload.texto,
            )
            self.db.add(resena)
        self.db.commit()
        self.db.refresh(resena)
        return resena

    def obtener_resenas(self, juego_id: int) -> list[Resena]:
        self.obtener_juego(juego_id)
        return self.db.query(Resena).filter(
            Resena.juego_id == juego_id
        ).order_by(Resena.fecha.desc()).all()

    def obtener_top_ventas(self, genero: str | None = None) -> list[dict]:
        ventas = func.count(Compra.id)
        query = self.db.query(Juego, ventas.label("compras")).outerjoin(
            Compra, Compra.juego_id == Juego.id
        ).group_by(Juego.id)
        if genero:
            query = query.filter(Juego.genero == genero)
        return [
            {
                "id": juego.id,
                "titulo": juego.titulo,
                "desarrollador_id": juego.desarrollador_id,
                "precio": juego.precio,
                "fecha_lanzamiento": juego.fecha_lanzamiento,
                "genero": juego.genero,
                "compras": int(compras),
                "total_resenas": 0,
                "porcentaje_positivas": 0,
            }
            for juego, compras in query.order_by(desc("compras")).limit(10).all()
        ]

    def obtener_mejor_valorados(self, genero: str | None = None) -> list[dict]:
        total = func.count(Resena.id)
        positivas = func.sum(case((Resena.recomienda.is_(True), 1), else_=0))
        porcentaje = positivas * 100.0 / total
        query = self.db.query(
            Juego, total.label("total_resenas"), porcentaje.label("porcentaje")
        ).join(Resena, Resena.juego_id == Juego.id).group_by(Juego.id).having(total >= 20)
        if genero:
            query = query.filter(Juego.genero == genero)
        return [
            {
                "id": juego.id,
                "titulo": juego.titulo,
                "desarrollador_id": juego.desarrollador_id,
                "precio": juego.precio,
                "fecha_lanzamiento": juego.fecha_lanzamiento,
                "genero": juego.genero,
                "compras": 0,
                "total_resenas": int(total_resenas),
                "porcentaje_positivas": round(float(valor), 2),
            }
            for juego, total_resenas, valor in query.order_by(desc("porcentaje")).limit(10).all()
        ]
