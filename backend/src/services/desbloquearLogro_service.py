from sqlalchemy import func
from sqlalchemy.orm import Session

from src.db.models.comprarJuego_model import Compra
from src.db.models.desbloquearLogro_model import LogroDesbloqueado
from src.db.models.logros_model import Logro
from src.db.models.registroUsuario_model import Usuario


class DesbloqueoLogroService:
    def __init__(self, db: Session):
        self.db = db

    def desbloquear_logro(self, usuario_id: int, logro_id: int) -> LogroDesbloqueado:
        if not self.db.query(Usuario).filter(Usuario.id == usuario_id).first():
            raise ValueError("El usuario no existe.")

        logro = self.db.query(Logro).filter(Logro.id == logro_id).first()
        if not logro:
            raise ValueError("El logro no existe.")

        comprado = (
            self.db.query(Compra)
            .filter(Compra.usuario_id == usuario_id, Compra.juego_id == logro.juego_id)
            .first()
        )
        if not comprado:
            raise ValueError("El usuario no posee el juego al que pertenece este logro.")

        desbloqueado = (
            self.db.query(LogroDesbloqueado)
            .filter(
                LogroDesbloqueado.usuario_id == usuario_id,
                LogroDesbloqueado.logro_id == logro_id,
            )
            .first()
        )
        if desbloqueado:
            raise ValueError("El logro ya fue desbloqueado anteriormente.")

        nuevo_desbloqueo = LogroDesbloqueado(usuario_id=usuario_id, logro_id=logro_id)
        self.db.add(nuevo_desbloqueo)
        self.db.commit()
        self.db.refresh(nuevo_desbloqueo)
        return nuevo_desbloqueo

    def registrar_progreso(
        self,
        usuario_id: int,
        juego_id: int,
        evento: str,
        valor: float,
    ) -> list[LogroDesbloqueado]:
        if not self.db.query(Usuario).filter(Usuario.id == usuario_id).first():
            raise ValueError("El usuario no existe.")

        comprado = self.db.query(Compra).filter(
            Compra.usuario_id == usuario_id,
            Compra.juego_id == juego_id,
        ).first()
        if not comprado:
            raise ValueError("El usuario no posee el juego informado.")

        evento_normalizado = evento.strip().lower()
        candidatos = self.db.query(Logro).filter(
            Logro.juego_id == juego_id,
            func.lower(Logro.requisito_evento) == evento_normalizado,
            Logro.requisito_valor <= valor,
        ).all()
        if not candidatos:
            return []

        ids_candidatos = [logro.id for logro in candidatos]
        ya_desbloqueados = {
            logro_id
            for (logro_id,) in self.db.query(LogroDesbloqueado.logro_id).filter(
                LogroDesbloqueado.usuario_id == usuario_id,
                LogroDesbloqueado.logro_id.in_(ids_candidatos),
            ).all()
        }
        nuevos = [
            LogroDesbloqueado(usuario_id=usuario_id, logro_id=logro.id)
            for logro in candidatos
            if logro.id not in ya_desbloqueados
        ]
        if not nuevos:
            return []

        self.db.add_all(nuevos)
        self.db.commit()
        for desbloqueo in nuevos:
            self.db.refresh(desbloqueo)
        return nuevos
