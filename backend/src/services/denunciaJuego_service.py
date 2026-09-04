from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.db.models.denunciaJuego_model import DenunciaJuego
from src.db.models.desarrolladorJuego_model import Juego
from src.db.models.registroUsuario_model import Usuario
from src.utils.errors import ForbiddenError


class DenunciaJuegoService:
    def __init__(self, db: Session):
        self.db = db

    def denunciar(self, juego_id: int, usuario: Usuario, motivo: str) -> dict:
        juego = self.db.query(Juego).filter(Juego.id == juego_id).first()
        if not juego:
            raise ValueError("El juego no existe.")
        if usuario.desarrollador_id == juego.desarrollador_id:
            raise ValueError("No podes denunciar tu propio juego.")
        if self.db.query(DenunciaJuego).filter_by(
            usuario_id=usuario.id,
            juego_id=juego_id,
            estado="pendiente",
        ).first():
            raise ValueError("Ya enviaste una denuncia pendiente para este juego.")

        denuncia = DenunciaJuego(
            usuario_id=usuario.id,
            juego_id=juego_id,
            motivo=motivo.strip(),
        )
        self.db.add(denuncia)
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise ValueError("Ya enviaste una denuncia pendiente para este juego.") from exc
        self.db.refresh(denuncia)
        return self._respuesta(denuncia, usuario, juego)

    def listar(self, administrador: Usuario, estado: str | None = None) -> list[dict]:
        self._validar_admin(administrador)
        query = (
            self.db.query(DenunciaJuego, Usuario, Juego)
            .join(Usuario, Usuario.id == DenunciaJuego.usuario_id)
            .join(Juego, Juego.id == DenunciaJuego.juego_id)
        )
        if estado:
            query = query.filter(DenunciaJuego.estado == estado)
        return [
            self._respuesta(denuncia, usuario, juego)
            for denuncia, usuario, juego in query.order_by(DenunciaJuego.fecha.desc()).all()
        ]

    def resolver(self, denuncia_id: int, estado: str, administrador: Usuario) -> dict:
        self._validar_admin(administrador)
        resultado = (
            self.db.query(DenunciaJuego, Usuario, Juego)
            .join(Usuario, Usuario.id == DenunciaJuego.usuario_id)
            .join(Juego, Juego.id == DenunciaJuego.juego_id)
            .filter(DenunciaJuego.id == denuncia_id)
            .first()
        )
        if not resultado:
            raise ValueError("La denuncia no existe.")
        denuncia, usuario, juego = resultado
        if denuncia.estado != "pendiente":
            raise ValueError("La denuncia ya fue resuelta.")
        denuncia.estado = estado
        denuncia.fecha_resolucion = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(denuncia)
        return self._respuesta(denuncia, usuario, juego)

    @staticmethod
    def _validar_admin(usuario: Usuario) -> None:
        if usuario.rol != "superadmin":
            raise ForbiddenError("Esta operacion requiere la cuenta administradora principal.")

    @staticmethod
    def _respuesta(denuncia: DenunciaJuego, usuario: Usuario, juego: Juego) -> dict:
        return {
            "id": denuncia.id,
            "usuario_id": usuario.id,
            "usuario_nickname": usuario.nickname,
            "juego_id": juego.id,
            "juego_titulo": juego.titulo,
            "motivo": denuncia.motivo,
            "estado": denuncia.estado,
            "fecha": denuncia.fecha,
            "fecha_resolucion": denuncia.fecha_resolucion,
        }
