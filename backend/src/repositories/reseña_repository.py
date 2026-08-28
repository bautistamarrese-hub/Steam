"""
resena_repository.py
=====================
Acceso a datos para la tabla `resena` (HU7).
"""

from src.db import connection
from src.db.models.reseñas_model import Resena


class ResenaRepository:

    def obtener_por_usuario_y_juego(self, usuario_id, juego_id):
        cursor = connection.obtener_cursor()
        cursor.execute(
            "SELECT * FROM resena WHERE usuario_id = %s AND juego_id = %s;",
            (usuario_id, juego_id),
        )
        fila = cursor.fetchone()
        return Resena.desde_fila(fila) if fila else None

    def crear(self, usuario_id, juego_id, recomienda, texto):
        cursor = connection.obtener_cursor()
        try:
            cursor.execute(
                """
                INSERT INTO resena (usuario_id, juego_id, recomienda, texto)
                VALUES (%s, %s, %s, %s)
                RETURNING id, usuario_id, juego_id, recomienda, texto, fecha;
                """,
                (usuario_id, juego_id, recomienda, texto),
            )
            fila = cursor.fetchone()
            connection.confirmar()
            return Resena.desde_fila(fila)
        except Exception:
            connection.revertir()
            raise

    def actualizar(self, usuario_id, juego_id, recomienda, texto):
        """HU7: un usuario puede EDITAR su única reseña por juego."""
        cursor = connection.obtener_cursor()
        try:
            cursor.execute(
                """
                UPDATE resena
                SET recomienda = %s, texto = %s, fecha = NOW()
                WHERE usuario_id = %s AND juego_id = %s
                RETURNING id, usuario_id, juego_id, recomienda, texto, fecha;
                """,
                (recomienda, texto, usuario_id, juego_id),
            )
            fila = cursor.fetchone()
            connection.confirmar()
            return Resena.desde_fila(fila)
        except Exception:
            connection.revertir()
            raise

    def listar_por_juego(self, juego_id):
        cursor = connection.obtener_cursor()
        cursor.execute(
            "SELECT * FROM resena WHERE juego_id = %s ORDER BY fecha DESC;",
            (juego_id,),
        )
        return [Resena.desde_fila(f) for f in cursor.fetchall()]


resena_repository = ResenaRepository()