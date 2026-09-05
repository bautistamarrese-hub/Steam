from sqlalchemy import func
from sqlalchemy.orm import Session

from src.db.models.comprarJuego_model import Compra
from src.db.models.desbloquearLogro_model import LogroDesbloqueado
from src.db.models.desarrolladorJuego_model import Juego
from src.db.models.logros_model import Logro
from src.db.models.progresoLogro_model import ProgresoLogro
from src.db.models.registroUsuario_model import Usuario
from src.utils.logros import normalizar_evento_logro, variantes_evento_logro


class DesbloqueoLogroService:
    def __init__(self, db: Session):
        self.db = db

    def desbloquear_logro(self, usuario_id: int, logro_id: int) -> LogroDesbloqueado:
        usuario = self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("El usuario no existe.")

        logro = self.db.query(Logro).filter(Logro.id == logro_id).first()
        if not logro:
            raise ValueError("El logro no existe.")

        comprado = (
            self.db.query(Compra)
            .filter(Compra.usuario_id == usuario_id, Compra.juego_id == logro.juego_id)
            .first()
        )
        juego_propio = self.db.query(Juego.id).filter(
            Juego.id == logro.juego_id,
            Juego.desarrollador_id == usuario.desarrollador_id,
        ).first()
        if not comprado and not juego_propio:
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

        # Un logro estructurado demuestra que el usuario alcanzó, como mínimo,
        # su objetivo. Registrar ese valor en la métrica compartida hace que el
        # mismo avance se refleje también en todos los demás logros equivalentes.
        if logro.requisito_evento and logro.requisito_valor is not None:
            self.registrar_progreso(
                usuario_id,
                logro.juego_id,
                logro.requisito_evento,
                logro.requisito_valor,
            )
            return (
                self.db.query(LogroDesbloqueado)
                .filter(
                    LogroDesbloqueado.usuario_id == usuario_id,
                    LogroDesbloqueado.logro_id == logro_id,
                )
                .one()
            )

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
        usuario = self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("El usuario no existe.")

        comprado = self.db.query(Compra).filter(
            Compra.usuario_id == usuario_id,
            Compra.juego_id == juego_id,
        ).first()
        juego_propio = self.db.query(Juego.id).filter(
            Juego.id == juego_id,
            Juego.desarrollador_id == usuario.desarrollador_id,
        ).first()
        if not comprado and not juego_propio:
            raise ValueError("El usuario no posee el juego informado.")

        evento_normalizado = normalizar_evento_logro(evento)
        if not evento_normalizado:
            raise ValueError("El evento de progreso no es válido.")
        registro = (
            self.db.query(ProgresoLogro)
            .filter(
                ProgresoLogro.usuario_id == usuario_id,
                ProgresoLogro.juego_id == juego_id,
                ProgresoLogro.evento == evento_normalizado,
            )
            .first()
        )
        if registro is None:
            registro = ProgresoLogro(
                usuario_id=usuario_id,
                juego_id=juego_id,
                evento=evento_normalizado,
                valor=valor,
            )
            self.db.add(registro)
            valor_acumulado = valor
        else:
            valor_acumulado = max(registro.valor, valor)
            registro.valor = valor_acumulado

        variantes_evento = variantes_evento_logro(evento_normalizado)
        candidatos = self.db.query(Logro).filter(
            Logro.juego_id == juego_id,
            func.lower(Logro.requisito_evento).in_(variantes_evento),
            Logro.requisito_valor <= valor_acumulado,
        ).all()
        if not candidatos:
            self.db.commit()
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
            self.db.commit()
            return []

        self.db.add_all(nuevos)
        self.db.commit()
        for desbloqueo in nuevos:
            self.db.refresh(desbloqueo)
        return nuevos

    def obtener_progreso(self, usuario_id: int, juego_id: int) -> list[ProgresoLogro]:
        usuario = self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("El usuario no existe.")
        comprado = self.db.query(Compra.id).filter(
            Compra.usuario_id == usuario_id,
            Compra.juego_id == juego_id,
        ).first()
        juego_propio = self.db.query(Juego.id).filter(
            Juego.id == juego_id,
            Juego.desarrollador_id == usuario.desarrollador_id,
        ).first()
        if not comprado and not juego_propio:
            raise ValueError("El usuario no posee el juego informado.")
        return (
            self.db.query(ProgresoLogro)
            .filter(
                ProgresoLogro.usuario_id == usuario_id,
                ProgresoLogro.juego_id == juego_id,
            )
            .order_by(ProgresoLogro.evento.asc())
            .all()
        )
