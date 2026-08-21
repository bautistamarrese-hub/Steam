"""
amigo_repository.py
====================
Acceso a datos para la tabla `amigos` (HU10).

Recordatorio de la estrategia elegida en el schema SQL:
  - Siempre guardamos con usuario_a < usuario_b para que la amistad sea
    bidireccional sin duplicados. Este repositorio se encarga de "ordenar"
    los dos ids antes de cualquier operación.
"""

from app.database import db


class AmigoRepository:

    def _ordenar(self, usuario_1, usuario_2):
        """Devuelve la tupla (menor, mayor) para respetar la restricción usuario_a < usuario_b."""
        return (usuario_1, usuario_2) if usuario_1 < usuario_2 else (usuario_2, usuario_1)

    def existe_amistad(self, usuario_1, usuario_2):
        a, b = self._ordenar(usuario_1, usuario_2)
        cursor = db.obtener_cursor()
        cursor.execute(
            "SELECT 1 FROM amigos WHERE usuario_a = %s AND usuario_b = %s;",
            (a, b),
        )
        return cursor.fetchone() is not None

    def crear_amistad(self, usuario_1, usuario_2):
        a, b = self._ordenar(usuario_1, usuario_2)
        cursor = db.obtener_cursor()
        try:
            cursor.execute(
                "INSERT INTO amigos (usuario_a, usuario_b) VALUES (%s, %s);",
                (a, b),
            )
            db.confirmar()
        except Exception:
            db.revertir()
            raise

    def listar_amigos_de(self, usuario_id):
        """
        Devuelve la lista de ids de amigos de un usuario. Como la amistad
        puede estar guardada como (usuario_id, otro) o (otro, usuario_id),
        buscamos en ambas columnas.
        """
        cursor = db.obtener_cursor()
        cursor.execute(
            """
            SELECT
                CASE WHEN usuario_a = %s THEN usuario_b ELSE usuario_a END AS amigo_id
            FROM amigos
            WHERE usuario_a = %s OR usuario_b = %s;
            """,
            (usuario_id, usuario_id, usuario_id),
        )
        return [fila["amigo_id"] for fila in cursor.fetchall()]

    def contar_amigos(self, usuario_id):
        return len(self.listar_amigos_de(usuario_id))


amigo_repository = AmigoRepository()