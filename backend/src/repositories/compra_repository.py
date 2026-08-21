"""
compra_repository.py
=====================
Acceso a datos para la tabla `compra` y consultas de biblioteca (HU5).
"""

from app.database import db
from app.models.compra import Compra


class CompraRepository:

    def crear(self, usuario_id, juego_id, precio_pagado):
        cursor = db.obtener_cursor()
        try:
            cursor.execute(
                """
                INSERT INTO compra (usuario_id, juego_id, precio_pagado)
                VALUES (%s, %s, %s)
                RETURNING id, usuario_id, juego_id, precio_pagado, fecha;
                """,
                (usuario_id, juego_id, precio_pagado),
            )
            fila = cursor.fetchone()
            db.confirmar()
            return Compra.desde_fila(fila)
        except Exception:
            db.revertir()
            raise

    def existe_compra(self, usuario_id, juego_id):
        """HU4: no se puede comprar un juego que el usuario ya posee."""
        cursor = db.obtener_cursor()
        cursor.execute(
            "SELECT 1 FROM compra WHERE usuario_id = %s AND juego_id = %s;",
            (usuario_id, juego_id),
        )
        return cursor.fetchone() is not None

    def obtener_biblioteca(self, usuario_id, genero=None):
        """
        HU5: GET /usuarios/{id}/biblioteca
        Devuelve los juegos comprados por el usuario, con fecha de compra
        y precio pagado, opcionalmente filtrado por género.
        """
        cursor = db.obtener_cursor()
        if genero:
            cursor.execute(
                """
                SELECT j.id, j.titulo, j.genero, j.precio AS precio_actual,
                       c.precio_pagado, c.fecha AS fecha_compra
                FROM compra c
                JOIN juego j ON j.id = c.juego_id
                WHERE c.usuario_id = %s AND j.genero = %s
                ORDER BY c.fecha DESC;
                """,
                (usuario_id, genero),
            )
        else:
            cursor.execute(
                """
                SELECT j.id, j.titulo, j.genero, j.precio AS precio_actual,
                       c.precio_pagado, c.fecha AS fecha_compra
                FROM compra c
                JOIN juego j ON j.id = c.juego_id
                WHERE c.usuario_id = %s
                ORDER BY c.fecha DESC;
                """,
                (usuario_id,),
            )
        # Acá devolvemos directamente diccionarios (no un modelo Juego)
        # porque la fila mezcla datos de juego + datos de la compra;
        # no corresponde exactamente a ninguna de las dos entidades sola.
        return cursor.fetchall()


compra_repository = CompraRepository()