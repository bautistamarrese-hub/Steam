from sqlalchemy.orm import Session
from backend.src.db.models.recargarSaldo_model import Usuario, Recarga
from backend.src.dtos.recargarSaldo_dto import RecargarSaldoDTO


class RecargaService:
    def __init__(self, db: Session):
        self.db = db

    def recargar_saldo(self, usuario_id: int, recarga_dto: RecargarSaldoDTO) -> Usuario:
        # 1. Validar existencia del usuario
        usuario = (
            self.db.query(Usuario)
            .filter(Usuario.id == usuario_id)
            .first()
        )
        if not usuario:
            raise ValueError("El usuario especificado no existe.")

        # 2. Validar monto mínimo de recarga
        if recarga_dto.monto < 100:
            raise ValueError("El monto mínimo de recarga es 100.")

        # 3. Crear el registro histórico de la recarga
        nueva_recarga = Recarga(
            usuario_id=usuario_id,
            monto=recarga_dto.monto
        )
        self.db.add(nueva_recarga)

        # 4. Impactar el nuevo monto en el saldo actual del usuario
        usuario.saldo += recarga_dto.monto

        # Persistir ambos cambios en la misma transacción
        self.db.commit()
        self.db.refresh(usuario)

        return usuario