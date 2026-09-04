from sqlalchemy.orm import Session
from src.db.models.registroUsuario_model import Usuario
from src.db.models.desarrolladorJuego_model import Juego
from src.db.models.wishlist_model import Wishlist
from src.db.models.comprarJuego_model import Compra


class WishlistService:
    def __init__(self, db: Session):
        self.db = db

    def agregar_a_wishlist(self, usuario_id: int, juego_id: int) -> Wishlist:
        usuario = self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("El usuario no existe.")
        juego = self.db.query(Juego).filter(Juego.id == juego_id).first()
        if not juego:
            raise ValueError("El juego no existe.")
        if (
            usuario.desarrollador_id is not None
            and usuario.desarrollador_id == juego.desarrollador_id
        ):
            raise ValueError("No podés agregar a la wishlist un juego que ya es tuyo.")

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
        usuario = self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("El usuario no existe.")

        query = (
            self.db.query(Wishlist)
            .join(Juego, Juego.id == Wishlist.juego_id)
            .filter(Wishlist.usuario_id == usuario_id)
        )
        if usuario.desarrollador_id is not None:
            query = query.filter(Juego.desarrollador_id != usuario.desarrollador_id)
        return query.order_by(Wishlist.fecha_agregado.asc()).all()

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
