from sqlalchemy.orm import Session
from backend.src.db.models.registroUsuario_model import Usuario
from backend.src.db.models.desarrolladorJuego_model import Juego
from backend.src.db.models.wishlist_model import Wishlist
from backend.src.db.models.comprarJuego_model import Compra


class WishlistService:
    def __init__(self, db: Session):
        self.db = db

    def agregar_a_wishlist(self, usuario_id: int, juego_id: int) -> Wishlist:
        if not self.db.query(Usuario).filter(Usuario.id == usuario_id).first():
            raise ValueError("El usuario no existe.")
        if not self.db.query(Juego).filter(Juego.id == juego_id).first():
            raise ValueError("El juego no existe.")

        # Verificar si ya compró el juego
        ya_comprado = (
            self.db.query(Compra)
            .filter(Compra.usuario_id == usuario_id, Compra.juego_id == juego_id)
            .first()
        )
        if ya_comprado:
            raise ValueError("No se puede agregar a la wishlist un juego ya comprado.")

        # Verificar si ya está en wishlist
        en_wishlist = (
            self.db.query(Wishlist)
            .filter(Wishlist.usuario_id == usuario_id, Wishlist.juego_id == juego_id)
            .first()
        )
        if en_wishlist:
            raise ValueError("El juego ya se encuentra en la wishlist.")

        nuevo_item = Wishlist(usuario_id=usuario_id, juego_id=juego_id)
        self.db.add(nuevo_item)
        self.db.commit()
        self.db.refresh(nuevo_item)
        return nuevo_item

    def obtener_wishlist(self, usuario_id: int) -> list[Wishlist]:
        if not self.db.query(Usuario).filter(Usuario.id == usuario_id).first():
            raise ValueError("El usuario no existe.")

        return (
            self.db.query(Wishlist)
            .filter(Wishlist.usuario_id == usuario_id)
            .order_by(Wishlist.fecha_agregado.asc())
            .all()
        )

    def eliminar_de_wishlist(self, usuario_id: int, juego_id: int) -> None:
        item = (
            self.db.query(Wishlist)
            .filter(Wishlist.usuario_id == usuario_id, Wishlist.juego_id == juego_id)
            .first()
        )
        if not item:
            raise ValueError("El juego no está en la wishlist.")

        self.db.delete(item)
        self.db.commit()