"""
wishlist_repository.py
=======================
Acceso a datos para la tabla `wishlist` (relación N a M usuario-juego).
"""

from src.db import connection


class WishlistRepository:

    def agregar(self, usuario_id, juego_id):
        cursor = connection.obtener_cursor()
        try:
            cursor.execute(
                "INSERT INTO wishlist (usuario_id, juego_id) VALUES (%s, %s);",
                (usuario_id, juego_id),
            )
            connection.confirmar()
        except Exception:
            connection.revertir()
            raise

    def existe(self, usuario_id, juego_id):
        cursor = connection.obtener_cursor()
        cursor.execute(
            "SELECT 1 FROM wishlist WHERE usuario_id = %s AND juego_id = %s;",
            (usuario_id, juego_id),
        )
        return cursor.fetchone() is not None

    def eliminar(self, usuario_id, juego_id):
        """
        HU4: al comprar un juego, debe salir automáticamente de la wishlist
        si estaba ahí. Este método se usa tanto para eso como para que el
        usuario quite manualmente un juego de su wishlist.
        """
        cursor = connection.obtener_cursor()
        try:
            cursor.execute(
                "DELETE FROM wishlist WHERE usuario_id = %s AND juego_id = %s;",
                (usuario_id, juego_id),
            )
            connection.confirmar()
        except Exception:
            connection.revertir()
            raise

    def listar_por_usuario(self, usuario_id):
        """HU6: GET /usuarios/{id}/wishlist ordenada por fecha_agregado."""
        cursor = connection.obtener_cursor()
        cursor.execute(
            """
            SELECT j.id, j.titulo, j.genero, j.precio, w.fecha_agregado
            FROM wishlist w
            JOIN juego j ON j.id = w.juego_id
            WHERE w.usuario_id = %s
            ORDER BY w.fecha_agregado ASC;
            """,
            (usuario_id,),
        )
        return cursor.fetchall()


wishlist_repository = WishlistRepository()