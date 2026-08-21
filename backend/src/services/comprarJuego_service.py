from sqlalchemy.orm import Session
from backend.src.db.models.registroUsuario_model import Usuario
from backend.src.db.models.juego_model import Juego
from backend.src.db.models.compra_model import Compra
from backend.src.db.models.wishlist_model import Wishlist


class CompraService:
    def __init__(self, db: Session):
        self.db = db

    def comprar_juego(self, usuario_id: int, juego_id: int) -> Compra:
        usuario = self.db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise ValueError("El usuario no existe.")

        juego = self.db.query(Juego).filter(Juego.id == juego_id).first()
        if not juego:
            raise ValueError("El juego no existe.")

        # Verificar si ya posee el juego
        compra_previa = (
            self.db.query(Compra)
            .filter(Compra.usuario_id == usuario_id, Compra.juego_id == juego_id)
            .first()
        )
        if compra_previa:
            raise ValueError("El usuario ya posee este juego.")

        # Verificar saldo
        if usuario.saldo < juego.precio:
            raise ValueError("Saldo insuficiente para realizar la compra.")

        # Descontar saldo y generar compra
        usuario.saldo -= juego.precio
        nueva_compra = Compra(
            usuario_id=usuario_id,
            juego_id=juego_id,
            precio_pagado=juego.precio
        )
        self.db.add(nueva_compra)

        # Si el juego estaba en la wishlist, se elimina
        item_wishlist = (
            self.db.query(Wishlist)
            .filter(Wishlist.usuario_id == usuario_id, Wishlist.juego_id == juego_id)
            .first()
        )
        if item_wishlist:
            self.db.delete(item_wishlist)

        self.db.commit()
        self.db.refresh(nueva_compra)
        return nueva_compra