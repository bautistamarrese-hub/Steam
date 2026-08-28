from sqlalchemy.orm import Session
from backend.src.db.models.registroUsuario_model import Usuario
from backend.src.db.models.logros_model import Logro
from backend.src.db.models.comprarJuego_model import Compra
from backend.src.db.models.desbloquearLogro_model import LogroDesbloqueado


class DesbloqueoLogroService:
    def __init__(self, db: Session):
        self.db = db

    def desbloquear_logro(self, usuario_id: int, logro_id: int) -> LogroDesbloqueado:
        if not self.db.query(Usuario).filter(Usuario.id == usuario_id).first():
            raise ValueError("El usuario no existe.")

        logro = self.db.query(Logro).filter(Logro.id == logro_id).first()
        if not logro:
            raise ValueError("El logro no existe.")

        # Verificar propiedad del juego
        comprado = (
            self.db.query(Compra)
            .filter(Compra.usuario_id == usuario_id, Compra.juego_id == logro.juego_id)
            .first()
        )
        if not comprado:
            raise ValueError("El usuario no posee el juego al que pertenece este logro.")

        # Verificar si ya lo desbloqueó
        desbloqueado = (
            self.db.query(LogroDesbloqueado)
            .filter(
                LogroDesbloqueado.usuario_id == usuario_id,
                LogroDesbloqueado.logro_id == logro_id
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