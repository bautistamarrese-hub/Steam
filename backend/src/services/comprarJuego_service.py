from sqlalchemy.orm import Session
from src.db.models.registroUsuario_model import Usuario
from src.db.models.desarrolladorJuego_model import Juego
from src.db.models.comprarJuego_model import Compra
from src.db.models.wishlist_model import Wishlist
from src.services.notificacionVenta_service import NotificacionVentaService


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
        if (
            usuario.desarrollador_id is not None
            and usuario.desarrollador_id == juego.desarrollador_id
        ):
            raise ValueError("Este juego ya es tuyo y está disponible en tu biblioteca.")

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

        NotificacionVentaService(self.db).acreditar_venta(juego)
        self.db.commit()
        self.db.refresh(nueva_compra)
        return nueva_compra
