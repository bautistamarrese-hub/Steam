from pathlib import Path
import unicodedata
from urllib.parse import quote
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.models.amigos_model import Amigos
from src.db.models.comprarJuego_model import Compra
from src.db.models.desarrolladorJuego_model import Desarrollador, Juego
from src.db.models.desbloquearLogro_model import LogroDesbloqueado
from src.db.models.logros_model import Logro
from src.db.models.recargarSaldo_model import Recarga
from src.db.models.recuperacionCuenta_model import RecuperacionCuenta
from src.db.models.registroUsuario_model import Usuario
from src.db.models.wishlist_model import Wishlist
from src.services.notificacionVenta_service import NotificacionVentaService
from src.utils.hash import hash_password, verify_password


class UsuarioService:
    """Casos de uso de usuario usados por el router HTTP.

    Los routers reciben schemas de Pydantic; este servicio trabaja únicamente
    con sus atributos y con modelos SQLAlchemy.
    """

    STORAGE_ROOT = Path(__file__).resolve().parents[2] / "storage"
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

        # El rol y la relación con el estudio se guardan para poder reconstruir
        # la sesión al volver a ingresar.
        usuario = Usuario(
            email=email,
            nickname=nickname,
            password_hash=hash_password(payload.password),
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

    def iniciar_sesion(self, payload) -> Usuario:
        email = str(payload.email).strip().lower()
        usuario = (
            self.db.query(Usuario)
            .filter(func.lower(Usuario.email) == email)
            .first()
        )
        if not usuario or not verify_password(payload.password, usuario.password_hash):
            raise ValueError("Email o contraseña incorrectos.")
        return usuario

    @staticmethod
    def _normalizar_respuesta(respuesta: str) -> str:
        normalizada = unicodedata.normalize("NFKC", respuesta).strip().casefold()
        if not normalizada:
            raise ValueError("Las respuestas son obligatorias.")
        if any(caracter.isspace() for caracter in normalizada):
            raise ValueError("Cada respuesta debe tener una sola palabra, sin espacios.")
        return normalizada

    @staticmethod
    def _normalizar_pregunta(pregunta: str) -> str:
        return unicodedata.normalize("NFKC", pregunta).strip()

    def actualizar_cuenta(self, usuario_id: int, payload) -> Usuario:
        usuario = self.obtener(usuario_id)
        email = str(payload.email).strip().lower() if payload.email is not None else None
        nickname = payload.nickname.strip() if payload.nickname is not None else None
        if email is None and nickname is None and payload.password_nueva is None:
            raise ValueError("Indicá un nuevo email, nickname o una nueva contraseña.")

        if email is not None:
            duplicado = (
                self.db.query(Usuario)
                .filter(
                    Usuario.id != usuario_id,
                    func.lower(Usuario.email) == email,
                )
                .first()
            )
            if duplicado:
                raise ValueError("Ese email ya está en uso.")
            usuario.email = email

        if nickname is not None:
            duplicado = (
                self.db.query(Usuario)
                .filter(
                    Usuario.id != usuario_id,
                    func.lower(Usuario.nickname) == nickname.lower(),
                )
                .first()
            )
            if duplicado:
                raise ValueError("Ese nickname ya está en uso.")
            usuario.nickname = nickname

        if payload.password_nueva is not None:
            if not payload.password_actual:
                raise ValueError("Ingresá tu contraseña actual para cambiarla.")
            if not verify_password(payload.password_actual, usuario.password_hash):
                raise ValueError("La contraseña actual es incorrecta.")
            if verify_password(payload.password_nueva, usuario.password_hash):
                raise ValueError("La contraseña nueva debe ser diferente de la actual.")
            usuario.password_hash = hash_password(payload.password_nueva)

        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ValueError("Ese email o nickname ya está en uso.") from exc
        self.db.refresh(usuario)
        return usuario

    def obtener_estado_recuperacion(self, usuario_id: int) -> dict:
        self.obtener(usuario_id)
        configuracion = self.db.get(RecuperacionCuenta, usuario_id)
        if not configuracion:
            return {"configurada": False, "pregunta_1": None, "pregunta_2": None}
        return {
            "configurada": True,
            "pregunta_1": configuracion.pregunta_1,
            "pregunta_2": configuracion.pregunta_2,
        }

    def configurar_recuperacion(self, usuario_id: int, payload) -> dict:
        usuario = self.obtener(usuario_id)
        if not verify_password(payload.password_actual, usuario.password_hash):
            raise ValueError("La contraseña actual es incorrecta.")
        pregunta_1 = self._normalizar_pregunta(payload.pregunta_1)
        pregunta_2 = self._normalizar_pregunta(payload.pregunta_2)
        if pregunta_1.casefold() == pregunta_2.casefold():
            raise ValueError("Las dos preguntas de seguridad deben ser diferentes.")

        configuracion = self.db.get(RecuperacionCuenta, usuario_id)
        if configuracion is None:
            if payload.respuesta_1 is None or payload.respuesta_2 is None:
                raise ValueError("Ingresá las dos respuestas para agregar la seguridad.")
            configuracion = RecuperacionCuenta(usuario_id=usuario_id)
            self.db.add(configuracion)
        else:
            if pregunta_1 != configuracion.pregunta_1 and payload.respuesta_1 is None:
                raise ValueError("Ingresá una respuesta nueva para la primera pregunta.")
            if pregunta_2 != configuracion.pregunta_2 and payload.respuesta_2 is None:
                raise ValueError("Ingresá una respuesta nueva para la segunda pregunta.")
        configuracion.pregunta_1 = pregunta_1
        configuracion.pregunta_2 = pregunta_2
        if payload.respuesta_1 is not None:
            configuracion.respuesta_1_hash = hash_password(
                self._normalizar_respuesta(payload.respuesta_1)
            )
        if payload.respuesta_2 is not None:
            configuracion.respuesta_2_hash = hash_password(
                self._normalizar_respuesta(payload.respuesta_2)
            )
        self.db.commit()
        return self.obtener_estado_recuperacion(usuario_id)

    def consultar_preguntas_recuperacion(self, email: str) -> dict:
        usuario = (
            self.db.query(Usuario)
            .filter(func.lower(Usuario.email) == str(email).strip().lower())
            .first()
        )
        configuracion = self.db.get(RecuperacionCuenta, usuario.id) if usuario else None
        if configuracion is None:
            raise ValueError(
                "No se puede recuperar la contraseña porque esta cuenta no configuró "
                "las dos preguntas de seguridad."
            )
        return {
            "pregunta_1": configuracion.pregunta_1,
            "pregunta_2": configuracion.pregunta_2,
        }

    def restablecer_password(self, payload) -> dict:
        usuario = (
            self.db.query(Usuario)
            .filter(func.lower(Usuario.email) == str(payload.email).strip().lower())
            .first()
        )
        configuracion = self.db.get(RecuperacionCuenta, usuario.id) if usuario else None
        if configuracion is None:
            raise ValueError(
                "No se puede recuperar la contraseña porque esta cuenta no configuró "
                "las dos preguntas de seguridad."
            )
        respuesta_1 = self._normalizar_respuesta(payload.respuesta_1)
        respuesta_2 = self._normalizar_respuesta(payload.respuesta_2)
        if not (
            verify_password(respuesta_1, configuracion.respuesta_1_hash)
            and verify_password(respuesta_2, configuracion.respuesta_2_hash)
        ):
            raise ValueError("Una o ambas respuestas son incorrectas.")
        if verify_password(payload.password_nueva, usuario.password_hash):
            raise ValueError("La contraseña nueva debe ser diferente de la anterior.")
        usuario.password_hash = hash_password(payload.password_nueva)
        self.db.commit()
        return {"mensaje": "Contraseña restablecida correctamente."}

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

    async def guardar_avatar(self, usuario_id: int, archivo: UploadFile) -> Usuario:
        usuario = self.obtener(usuario_id)
        extensiones = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        }
        extension = extensiones.get(archivo.content_type or "")
        if not extension:
            raise ValueError("La foto debe ser JPG, PNG, WebP o GIF.")

        raiz = self.STORAGE_ROOT / "avatars" / str(usuario_id)
        raiz.mkdir(parents=True, exist_ok=True)
        destino = raiz / f"avatar{extension}"
        temporal = raiz / f".avatar{extension}.tmp"

        total = 0
        try:
            with temporal.open("wb") as salida:
                while bloque := await archivo.read(1024 * 1024):
                    total += len(bloque)
                    if total > 5 * 1024 * 1024:
                        raise ValueError("La imagen no puede superar los 5 MB.")
                    salida.write(bloque)
        except (OSError, ValueError):
            temporal.unlink(missing_ok=True)
            raise
        finally:
            await archivo.close()

        for avatar_anterior in raiz.glob("avatar.*"):
            if avatar_anterior != destino:
                avatar_anterior.unlink(missing_ok=True)
        temporal.replace(destino)

        # La ruta física se reutiliza, pero la versión cambia en cada subida.
        # Así el navegador no muestra una foto anterior desde su caché después
        # de recortar o ajustar un avatar nuevo.
        version = uuid4().hex
        usuario.avatar = f"/uploads/avatars/{usuario_id}/{quote(destino.name)}?v={version}"
        self.db.commit()
        self.db.refresh(usuario)
        return usuario

    def recargar_saldo(self, usuario_id: int, payload) -> Recarga:
        usuario = (
            self.db.query(Usuario)
            .filter(Usuario.id == usuario_id)
            .with_for_update()
            .first()
        )
        if not usuario:
            raise ValueError("El usuario no existe.")
        monto = round(payload.monto, 2)
        recarga = Recarga(usuario_id=usuario_id, monto=monto)
        usuario.saldo = round(usuario.saldo + monto, 2)
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
        usuario = (
            self.db.query(Usuario)
            .filter(Usuario.id == usuario_id)
            .with_for_update()
            .first()
        )
        if not usuario:
            raise ValueError("El usuario no existe.")
        juego = self.db.query(Juego).filter(Juego.id == juego_id).first()
        if not juego:
            raise ValueError("El juego no existe.")
        if (
            usuario.desarrollador_id is not None
            and usuario.desarrollador_id == juego.desarrollador_id
        ):
            raise ValueError("Este juego ya es tuyo y está disponible en tu biblioteca.")
        if self.db.query(Compra).filter_by(usuario_id=usuario_id, juego_id=juego_id).first():
            raise ValueError("El usuario ya posee este juego.")
        if usuario.saldo < juego.precio:
            raise ValueError("Saldo insuficiente para realizar la compra.")

        compra = Compra(
            usuario_id=usuario_id, juego_id=juego_id, precio_pagado=juego.precio
        )
        usuario.saldo = round(usuario.saldo - juego.precio, 2)
        deseado = self.db.query(Wishlist).filter_by(
            usuario_id=usuario_id, juego_id=juego_id
        ).first()
        if deseado:
            self.db.delete(deseado)
        self.db.add(compra)
        NotificacionVentaService(self.db).acreditar_venta(juego)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ValueError("El usuario ya posee este juego.") from exc
        self.db.refresh(compra)
        return compra

    def obtener_biblioteca(self, usuario_id: int, genero: str | None = None) -> list[dict]:
        usuario = self.obtener(usuario_id)
        query = (
            self.db.query(Compra, Juego)
            .join(Juego, Compra.juego_id == Juego.id)
            .filter(Compra.usuario_id == usuario_id)
        )
        if genero:
            query = query.filter(Juego.genero == genero)
        comprados = [
            {
                "juego": juego,
                "fecha": compra.fecha,
                "precio_pagado": compra.precio_pagado,
                "es_del_desarrollador": bool(
                    usuario.desarrollador_id is not None
                    and usuario.desarrollador_id == juego.desarrollador_id
                ),
            }
            for compra, juego in query.order_by(Compra.fecha.desc()).all()
        ]

        if usuario.desarrollador_id is None:
            return comprados

        juegos_propios_query = self.db.query(Juego).filter(
            Juego.desarrollador_id == usuario.desarrollador_id
        )
        if genero:
            juegos_propios_query = juegos_propios_query.filter(Juego.genero == genero)
        comprados_ids = {item["juego"].id for item in comprados}
        juegos_propios = [
            {
                "juego": juego,
                "fecha": None,
                "precio_pagado": None,
                "es_del_desarrollador": True,
            }
            for juego in juegos_propios_query.order_by(Juego.id.desc()).all()
            if juego.id not in comprados_ids
        ]
        return juegos_propios + comprados

    def agregar_a_wishlist(self, usuario_id: int, payload) -> Wishlist:
        usuario = self.obtener(usuario_id)
        juego_id = payload.juego_id
        juego = self.db.query(Juego).filter(Juego.id == juego_id).first()
        if not juego:
            raise ValueError("El juego no existe.")
        if (
            usuario.desarrollador_id is not None
            and usuario.desarrollador_id == juego.desarrollador_id
        ):
            raise ValueError("No podés agregar a la wishlist un juego que ya es tuyo.")
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
        usuario = self.obtener(usuario_id)
        query = (
            self.db.query(Wishlist)
            .join(Juego, Juego.id == Wishlist.juego_id)
            .filter(Wishlist.usuario_id == usuario_id)
        )
        if usuario.desarrollador_id is not None:
            query = query.filter(Juego.desarrollador_id != usuario.desarrollador_id)
        return query.order_by(Wishlist.fecha_agregado.asc()).all()

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
