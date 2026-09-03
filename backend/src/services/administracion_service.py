import shutil

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
from src.db.models.reseñas_model import Resena
from src.db.models.solicitudAmistad_model import SolicitudAmistad
from src.db.models.wishlist_model import Wishlist
from src.services.desarrolladorJuego_service import JuegoService
from src.utils.errors import ForbiddenError
from src.utils.hash import hash_password


class AdministracionService:
    def __init__(self, db: Session, administrador: Usuario):
        self.db = db
        self.administrador = administrador
        if administrador.rol != "superadmin":
            raise ForbiddenError("Esta operación requiere la cuenta administradora principal.")

    def actualizar_usuario(self, usuario_id: int, payload) -> Usuario:
        usuario = self._obtener_usuario_editable(usuario_id)

        if payload.email is not None:
            email = str(payload.email).strip().lower()
            duplicado = self.db.query(Usuario).filter(
                Usuario.id != usuario_id,
                func.lower(Usuario.email) == email,
            ).first()
            if duplicado:
                raise ValueError("El email ya está registrado.")
            usuario.email = email

        if payload.nickname is not None:
            nickname = payload.nickname.strip()
            duplicado = self.db.query(Usuario).filter(
                Usuario.id != usuario_id,
                func.lower(Usuario.nickname) == nickname.lower(),
            ).first()
            if duplicado:
                raise ValueError("El nickname ya está registrado.")
            usuario.nickname = nickname

        if payload.saldo is not None:
            usuario.saldo = payload.saldo
        if payload.password is not None:
            usuario.password_hash = hash_password(payload.password)

        self._actualizar_rol(usuario, payload.rol, payload.estudio)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ValueError("No se pudo actualizar el usuario por datos duplicados.") from exc
        self.db.refresh(usuario)
        return usuario

    def eliminar_usuario(self, usuario_id: int) -> None:
        usuario = self._obtener_usuario_editable(usuario_id)
        desarrollador_id = usuario.desarrollador_id
        juegos_ids = []
        if desarrollador_id is not None:
            juegos_ids = [
                juego_id
                for (juego_id,) in self.db.query(Juego.id)
                .filter(Juego.desarrollador_id == desarrollador_id)
                .all()
            ]

        self.db.query(SolicitudAmistad).filter(
            or_(SolicitudAmistad.de == usuario_id, SolicitudAmistad.para == usuario_id)
        ).delete(synchronize_session=False)
        self.db.query(Amigos).filter(
            or_(Amigos.usuario_a == usuario_id, Amigos.usuario_b == usuario_id)
        ).delete(synchronize_session=False)
        self.db.query(LogroDesbloqueado).filter(
            LogroDesbloqueado.usuario_id == usuario_id
        ).delete(synchronize_session=False)
        self.db.query(Resena).filter(Resena.usuario_id == usuario_id).delete(
            synchronize_session=False
        )
        self.db.query(Wishlist).filter(Wishlist.usuario_id == usuario_id).delete(
            synchronize_session=False
        )
        self.db.query(Compra).filter(Compra.usuario_id == usuario_id).delete(
            synchronize_session=False
        )
        self.db.query(Recarga).filter(Recarga.usuario_id == usuario_id).delete(
            synchronize_session=False
        )

        if juegos_ids:
            logro_ids = [
                logro_id
                for (logro_id,) in self.db.query(Logro.id)
                .filter(Logro.juego_id.in_(juegos_ids))
                .all()
            ]
            if logro_ids:
                self.db.query(LogroDesbloqueado).filter(
                    LogroDesbloqueado.logro_id.in_(logro_ids)
                ).delete(synchronize_session=False)
            self.db.query(Resena).filter(Resena.juego_id.in_(juegos_ids)).delete(
                synchronize_session=False
            )
            self.db.query(Wishlist).filter(Wishlist.juego_id.in_(juegos_ids)).delete(
                synchronize_session=False
            )
            self.db.query(Compra).filter(Compra.juego_id.in_(juegos_ids)).delete(
                synchronize_session=False
            )
            self.db.query(Logro).filter(Logro.juego_id.in_(juegos_ids)).delete(
                synchronize_session=False
            )
            self.db.query(Juego).filter(Juego.id.in_(juegos_ids)).delete(
                synchronize_session=False
            )

        self.db.query(Usuario).filter(Usuario.id == usuario_id).delete(
            synchronize_session=False
        )
        if desarrollador_id is not None:
            self.db.query(Desarrollador).filter(Desarrollador.id == desarrollador_id).delete(
                synchronize_session=False
            )
        self.db.commit()

        shutil.rmtree(JuegoService.STORAGE_ROOT / "avatars" / str(usuario_id), ignore_errors=True)
        for juego_id in juegos_ids:
            shutil.rmtree(JuegoService.STORAGE_ROOT / "games" / str(juego_id), ignore_errors=True)

    def actualizar_juego(self, juego_id: int, payload) -> Juego:
        juego = JuegoService(self.db).obtener_juego(juego_id)
        if payload.desarrollador_id != juego.desarrollador_id:
            raise ValueError("No se puede cambiar el desarrollador desde este panel.")
        return JuegoService(self.db).actualizar_juego(juego_id, payload)

    def eliminar_juego(self, juego_id: int) -> None:
        juego = JuegoService(self.db).obtener_juego(juego_id)
        JuegoService(self.db).eliminar_juego(juego_id, juego.desarrollador_id)

    def _obtener_usuario_editable(self, usuario_id: int) -> Usuario:
        usuario = self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("El usuario no existe.")
        if usuario.rol == "superadmin":
            raise ValueError("La cuenta administradora principal no se puede modificar ni eliminar.")
        return usuario

    def _actualizar_rol(self, usuario: Usuario, rol: str | None, estudio: str | None) -> None:
        rol_final = rol or usuario.rol
        if rol_final == "admin" and usuario.desarrollador_id is None:
            desarrollador = Desarrollador(
                nombre=(estudio or f"{usuario.nickname} Studio").strip(),
                pais="Argentina",
            )
            self.db.add(desarrollador)
            self.db.flush()
            usuario.desarrollador_id = desarrollador.id
        elif rol_final == "admin" and estudio:
            desarrollador = self.db.query(Desarrollador).filter(
                Desarrollador.id == usuario.desarrollador_id
            ).first()
            if desarrollador:
                desarrollador.nombre = estudio.strip()
        elif rol_final == "cliente" and usuario.desarrollador_id is not None:
            tiene_juegos = self.db.query(Juego.id).filter(
                Juego.desarrollador_id == usuario.desarrollador_id
            ).first()
            if tiene_juegos:
                raise ValueError(
                    "No se puede convertir a jugador un desarrollador que todavía tiene juegos."
                )
            desarrollador_id = usuario.desarrollador_id
            usuario.desarrollador_id = None
            self.db.flush()
            self.db.query(Desarrollador).filter(Desarrollador.id == desarrollador_id).delete(
                synchronize_session=False
            )
        usuario.rol = rol_final
