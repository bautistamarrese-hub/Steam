from sqlalchemy.orm import Session
from sqlalchemy import or_
from src.db.models.registroUsuario_model import Usuario
from src.db.models.amigos_model import Amigos


class AmigosService:
    def __init__(self, db: Session):
        self.db = db

    def agregar_amigo(self, usuario_id_1: int, usuario_id_2: int) -> Amigos:
        if usuario_id_1 == usuario_id_2:
            raise ValueError("Un usuario no puede agregarse a sí mismo como amigo.")

        if not self.db.query(Usuario).filter(Usuario.id == usuario_id_1).first() or \
           not self.db.query(Usuario).filter(Usuario.id == usuario_id_2).first():
            raise ValueError("Uno o ambos usuarios no existen.")

        # Ordenar los IDs para manejar la relación bidireccional
        u_a = min(usuario_id_1, usuario_id_2)
        u_b = max(usuario_id_1, usuario_id_2)

        existente = (
            self.db.query(Amigos)
            .filter(Amigos.usuario_a == u_a, Amigos.usuario_b == u_b)
            .first()
        )
        if existente:
            raise ValueError("Ya existe una relación de amistad entre estos usuarios.")

        nueva_amistad = Amigos(usuario_a=u_a, usuario_b=u_b)
        self.db.add(nueva_amistad)
        self.db.commit()
        self.db.refresh(nueva_amistad)
        return nueva_amistad

    def obtener_amigos(self, usuario_id: int) -> list[int]:
        if not self.db.query(Usuario).filter(Usuario.id == usuario_id).first():
            raise ValueError("El usuario no existe.")

        relaciones = (
            self.db.query(Amigos)
            .filter(or_(Amigos.usuario_a == usuario_id, Amigos.usuario_b == usuario_id))
            .all()
        )

        amigos_ids = []
        for rel in relaciones:
            amigos_ids.append(rel.usuario_b if rel.usuario_a == usuario_id else rel.usuario_a)

        return amigos_ids
