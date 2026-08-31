from sqlalchemy import or_
from sqlalchemy.orm import Session

from src.db.models.amigos_model import Amigos
from src.db.models.solicitudAmistad_model import SolicitudAmistad
from src.services.registroUsuario_service import UsuarioService


class SolicitudAmistadService:
    def __init__(self, db: Session):
        self.db = db

    def _obtener(self, solicitud_id: int) -> SolicitudAmistad:
        solicitud = (
            self.db.query(SolicitudAmistad)
            .filter(SolicitudAmistad.id == solicitud_id)
            .first()
        )
        if not solicitud:
            raise ValueError("La solicitud no existe.")
        return solicitud

    def enviar(self, payload) -> SolicitudAmistad:
        de, para = payload.de, payload.para
        UsuarioService(self.db).obtener(de)
        UsuarioService(self.db).obtener(para)
        if de == para:
            raise ValueError("No podés enviarte una solicitud a vos mismo.")

        usuario_a, usuario_b = sorted((de, para))
        if self.db.query(Amigos).filter_by(
            usuario_a=usuario_a, usuario_b=usuario_b
        ).first():
            raise ValueError("Los usuarios ya son amigos.")

        pendiente = self.db.query(SolicitudAmistad).filter(
            SolicitudAmistad.estado == "pendiente",
            or_(
                (SolicitudAmistad.de == de) & (SolicitudAmistad.para == para),
                (SolicitudAmistad.de == para) & (SolicitudAmistad.para == de),
            ),
        ).first()
        if pendiente:
            raise ValueError("Ya existe una solicitud pendiente entre estos usuarios.")

        solicitud = SolicitudAmistad(de=de, para=para)
        self.db.add(solicitud)
        self.db.commit()
        self.db.refresh(solicitud)
        return solicitud

    def recibidas(self, usuario_id: int) -> list[SolicitudAmistad]:
        UsuarioService(self.db).obtener(usuario_id)
        return (
            self.db.query(SolicitudAmistad)
            .filter_by(para=usuario_id, estado="pendiente")
            .order_by(SolicitudAmistad.fecha.desc())
            .all()
        )

    def enviadas(self, usuario_id: int) -> list[SolicitudAmistad]:
        UsuarioService(self.db).obtener(usuario_id)
        return (
            self.db.query(SolicitudAmistad)
            .filter_by(de=usuario_id, estado="pendiente")
            .order_by(SolicitudAmistad.fecha.desc())
            .all()
        )

    def responder(self, solicitud_id: int, estado: str) -> SolicitudAmistad:
        solicitud = self._obtener(solicitud_id)
        if solicitud.estado != "pendiente":
            raise ValueError("La solicitud ya fue respondida.")

        if estado == "aceptada":
            usuario_a, usuario_b = sorted((solicitud.de, solicitud.para))
            amistad = self.db.query(Amigos).filter_by(
                usuario_a=usuario_a, usuario_b=usuario_b
            ).first()
            if not amistad:
                self.db.add(Amigos(usuario_a=usuario_a, usuario_b=usuario_b))

        solicitud.estado = estado
        self.db.commit()
        self.db.refresh(solicitud)
        return solicitud

    def cancelar(self, solicitud_id: int) -> None:
        solicitud = self._obtener(solicitud_id)
        if solicitud.estado != "pendiente":
            raise ValueError("Solo se puede cancelar una solicitud pendiente.")
        self.db.delete(solicitud)
        self.db.commit()
