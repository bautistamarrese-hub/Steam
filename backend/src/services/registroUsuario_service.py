from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.models.amigos_model import Amigos
from src.db.models.comprarJuego_model import Compra
from src.db.models.desarrolladorJuego_model import Desarrollador, Juego
from src.db.models.desbloquearLogro_model import LogroDesbloqueado
from src.db.models.logros_model import Logro
from src.db.models.recargarSaldo_model import Recarga
from src.db.models.registroUsuario_model import Usuario
from src.db.models.wishlist_model import Wishlist


class UsuarioService:
    """Casos de uso de usuario usados por el router HTTP.

    Los routers reciben schemas de Pydantic; este servicio trabaja únicamente
    con sus atributos y con modelos SQLAlchemy.
    """

    def __init__(self, db: Session):
        self.db = db

    def registrar(self, payload) -> Usuario:
        email = str(payload.email).strip().lower()
        nickname = payload.nickname.strip()
        if self.db.query(Usuario).filter(func.lower(Usuario.email) == email).first():
            raise ValueError("El email ya está registrado.")
        if self.db.query(Usuario).filter(
            func.lower(Usuario.nickname) == nickname.lower()
        ).first():
            raise ValueError("El nickname ya está registrado.")

        desarrollador_id = None
        if payload.rol == "admin":
            nombre_estudio = (payload.estudio or f"{nickname} Studio").strip()
            desarrollador = Desarrollador(nombre=nombre_estudio, pais="Argentina")
            self.db.add(desarrollador)
            self.db.flush()

            desarrollador_id = desarrollador.id

        # El frontend actual no solicita contraseña. El rol y la relación con
        # el estudio sí se guardan para poder reconstruir la sesión al volver.
        usuario = Usuario(
            email=email,
            nickname=nickname,
            password_hash="autenticacion-pendiente",
            rol=payload.rol,
            desarrollador_id=desarrollador_id,
        )
        self.db.add(usuario)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ValueError("El email o el nickname ya están registrados.") from exc
        self.db.refresh(usuario)
        return usuario

    def listar(self, email: str | None = None) -> list[Usuario]:
        query = self.db.query(Usuario)
        if email:
            query = query.filter(func.lower(Usuario.email) == email.strip().lower())
        return query.order_by(Usuario.id.asc()).all()

    def obtener(self, usuario_id: int) -> Usuario:
        usuario = self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("El usuario no existe.")
        return usuario

    def recargar_saldo(self, usuario_id: int, payload) -> Recarga:
        usuario = self.obtener(usuario_id)
        recarga = Recarga(usuario_id=usuario_id, monto=payload.monto)
        usuario.saldo += payload.monto
        self.db.add(recarga)
        self.db.commit()
        self.db.refresh(recarga)
        return recarga

    def listar_recargas(self, usuario_id: int) -> list[Recarga]:
        self.obtener(usuario_id)
        return (
            self.db.query(Recarga)
            .filter(Recarga.usuario_id == usuario_id)
            .order_by(Recarga.fecha.desc())
            .all()
        )

    def comprar_juego(self, usuario_id: int, juego_id: int) -> Compra:
        usuario = self.obtener(usuario_id)
        juego = self.db.query(Juego).filter(Juego.id == juego_id).first()
        if not juego:
            raise ValueError("El juego no existe.")
        if self.db.query(Compra).filter_by(usuario_id=usuario_id, juego_id=juego_id).first():
            raise ValueError("El usuario ya posee este juego.")
        if usuario.saldo < juego.precio:
            raise ValueError("Saldo insuficiente para realizar la compra.")

        compra = Compra(
            usuario_id=usuario_id, juego_id=juego_id, precio_pagado=juego.precio
        )
        usuario.saldo -= juego.precio
        deseado = self.db.query(Wishlist).filter_by(
            usuario_id=usuario_id, juego_id=juego_id
        ).first()
        if deseado:
            self.db.delete(deseado)
        self.db.add(compra)
        self.db.commit()
        self.db.refresh(compra)
        return compra

    def obtener_biblioteca(self, usuario_id: int, genero: str | None = None) -> list[dict]:
        self.obtener(usuario_id)
        query = (
            self.db.query(Compra, Juego)
            .join(Juego, Compra.juego_id == Juego.id)
            .filter(Compra.usuario_id == usuario_id)
        )
        if genero:
            query = query.filter(Juego.genero == genero)
        return [
            {"juego": juego, "fecha": compra.fecha, "precio_pagado": compra.precio_pagado}
            for compra, juego in query.order_by(Compra.fecha.desc()).all()
        ]

    def agregar_a_wishlist(self, usuario_id: int, payload) -> Wishlist:
        self.obtener(usuario_id)
        juego_id = payload.juego_id
        if not self.db.query(Juego).filter(Juego.id == juego_id).first():
            raise ValueError("El juego no existe.")
        if self.db.query(Compra).filter_by(usuario_id=usuario_id, juego_id=juego_id).first():
            raise ValueError("No se puede agregar un juego ya comprado.")
        if self.db.query(Wishlist).filter_by(usuario_id=usuario_id, juego_id=juego_id).first():
            raise ValueError("El juego ya está en la wishlist.")
        item = Wishlist(usuario_id=usuario_id, juego_id=juego_id)
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def obtener_wishlist(self, usuario_id: int) -> list[Wishlist]:
        self.obtener(usuario_id)
        return (
            self.db.query(Wishlist)
            .filter(Wishlist.usuario_id == usuario_id)
            .order_by(Wishlist.fecha_agregado.asc())
            .all()
        )

    def quitar_de_wishlist(self, usuario_id: int, juego_id: int) -> None:
        item = self.db.query(Wishlist).filter_by(
            usuario_id=usuario_id, juego_id=juego_id
        ).first()
        if not item:
            raise ValueError("El juego no está en la wishlist.")
        self.db.delete(item)
        self.db.commit()

    def agregar_amigo(self, usuario_id: int, payload) -> Amigos:
        otro_id = payload.amigo_id
        self.obtener(usuario_id)
        self.obtener(otro_id)
        if usuario_id == otro_id:
            raise ValueError("Un usuario no puede agregarse a sí mismo.")
        usuario_a, usuario_b = sorted((usuario_id, otro_id))
        if self.db.query(Amigos).filter_by(
            usuario_a=usuario_a, usuario_b=usuario_b
        ).first():
            raise ValueError("Los usuarios ya son amigos.")
        amistad = Amigos(usuario_a=usuario_a, usuario_b=usuario_b)
        self.db.add(amistad)
        self.db.commit()
        self.db.refresh(amistad)
        return amistad

    def obtener_amigos(self, usuario_id: int) -> list[Usuario]:
        self.obtener(usuario_id)
        relaciones = self.db.query(Amigos).filter(
            or_(Amigos.usuario_a == usuario_id, Amigos.usuario_b == usuario_id)
        ).all()
        ids = [
            relacion.usuario_b if relacion.usuario_a == usuario_id else relacion.usuario_a
            for relacion in relaciones
        ]
        if not ids:
            return []
        return self.db.query(Usuario).filter(Usuario.id.in_(ids)).all()

    def eliminar_amigo(self, usuario_id: int, amigo_id: int) -> None:
        usuario_a, usuario_b = sorted((usuario_id, amigo_id))
        amistad = self.db.query(Amigos).filter_by(
            usuario_a=usuario_a, usuario_b=usuario_b
        ).first()
        if not amistad:
            raise ValueError("La amistad no existe.")
        self.db.delete(amistad)
        self.db.commit()

    def obtener_estadisticas(self, usuario_id: int) -> dict:
        self.obtener(usuario_id)
        compras = self.db.query(Compra).filter(Compra.usuario_id == usuario_id).all()
        desbloqueados = self.db.query(LogroDesbloqueado).filter(
            LogroDesbloqueado.usuario_id == usuario_id
        ).all()
        logro_ids = [item.logro_id for item in desbloqueados]
        puntos = 0
        if logro_ids:
            puntos = self.db.query(func.coalesce(func.sum(Logro.puntos), 0)).filter(
                Logro.id.in_(logro_ids)
            ).scalar()

        top = []
        for compra in compras:
            juego = self.db.query(Juego).filter(Juego.id == compra.juego_id).first()
            logros = self.db.query(Logro).filter(Logro.juego_id == compra.juego_id).all()
            logrados = sum(1 for logro in logros if logro.id in logro_ids)
            total = len(logros)
            top.append({
                "juego": juego,
                "total": total,
                "desbloqueados": logrados,
                "porcentaje": round(logrados * 100 / total) if total else 0,
            })
        top.sort(key=lambda item: item["porcentaje"], reverse=True)

        cantidad_amigos = self.db.query(func.count()).select_from(Amigos).filter(
            or_(Amigos.usuario_a == usuario_id, Amigos.usuario_b == usuario_id)
        ).scalar()
        return {
            "total_gastado": float(sum(compra.precio_pagado for compra in compras)),
            "cantidad_juegos": len(compras),
            "logros_desbloqueados": len(desbloqueados),
            "puntos_totales": int(puntos or 0),
            "cantidad_amigos": int(cantidad_amigos or 0),
            "top_completados": top[:5],
        }

    def obtener_logros_desbloqueados(self, usuario_id: int) -> list[LogroDesbloqueado]:
        self.obtener(usuario_id)
        return self.db.query(LogroDesbloqueado).filter(
            LogroDesbloqueado.usuario_id == usuario_id
        ).order_by(LogroDesbloqueado.fecha.desc()).all()
