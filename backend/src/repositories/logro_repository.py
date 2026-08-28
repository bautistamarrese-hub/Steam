"""
logro_repository.py
====================
Acceso a datos para las tablas `logro` y `logro_desbloqueado` (HU8 y HU9).
"""

from src.db import connection
from src.db.models.logros_model import Logro


class LogroRepository:

    def crear(self, juego_id, nombre, descripcion, puntos):
        cursor = connection.obtener_cursor()
        try:
            cursor.execute(
                """
                INSERT INTO logro (juego_id, nombre, descripcion, puntos)
                VALUES (%s, %s, %s, %s)
                RETURNING id, juego_id, nombre, descripcion, puntos;
                """,
                (juego_id, nombre, descripcion, puntos),
            )
            fila = cursor.fetchone()
            connection.confirmar()
            return Logro.desde_fila(fila)
        except Exception:
            connection.revertir()
            raise

    def existe_nombre_para_juego(self, juego_id, nombre):
        cursor = connection.obtener_cursor()
        cursor.execute(
            "SELECT 1 FROM logro WHERE juego_id = %s AND nombre = %s;",
            (juego_id, nombre),
        )
        return cursor.fetchone() is not None

    def obtener_por_id(self, logro_id):
        cursor = connection.obtener_cursor()
        cursor.execute("SELECT * FROM logro WHERE id = %s;", (logro_id,))
        fila = cursor.fetchone()
        return Logro.desde_fila(fila) if fila else None

    def listar_por_juego(self, juego_id):
        """HU8: GET /juegos/{id}/logros"""
        cursor = connection.obtener_cursor()
        cursor.execute("SELECT * FROM logro WHERE juego_id = %s ORDER BY id;", (juego_id,))
        return [Logro.desde_fila(f) for f in cursor.fetchall()]

    def existe_desbloqueo(self, usuario_id, logro_id):
        """HU9: no se puede desbloquear el mismo logro dos veces."""
        cursor = connection.obtener_cursor()
        cursor.execute(
            "SELECT 1 FROM logro_desbloqueado WHERE usuario_id = %s AND logro_id = %s;",
            (usuario_id, logro_id),
        )
        return cursor.fetchone() is not None

    def desbloquear(self, usuario_id, logro_id):
        cursor = connection.obtener_cursor()
        try:
            cursor.execute(
                """
                INSERT INTO logro_desbloqueado (usuario_id, logro_id)
                VALUES (%s, %s)
                RETURNING usuario_id, logro_id, fecha;
                """,
                (usuario_id, logro_id),
            )
            fila = cursor.fetchone()
            connection.confirmar()
            return fila
        except Exception:
            connection.revertir()
            raise

    def contar_desbloqueados_por_usuario(self, usuario_id):
        cursor = connection.obtener_cursor()
        cursor.execute(
            "SELECT COUNT(*) AS total FROM logro_desbloqueado WHERE usuario_id = %s;",
            (usuario_id,),
        )
        return cursor.fetchone()["total"]

    def puntos_totales_por_usuario(self, usuario_id):
        cursor = connection.obtener_cursor()
        cursor.execute(
            """
            SELECT COALESCE(SUM(l.puntos), 0) AS puntos_totales
            FROM logro_desbloqueado ld
            JOIN logro l ON l.id = ld.logro_id
            WHERE ld.usuario_id = %s;
            """,
            (usuario_id,),
        )
        return int(cursor.fetchone()["puntos_totales"])

    def porcentaje_completado_por_juego(self, usuario_id, limite=5):
        """
        HU12: porcentaje de logros desbloqueados por juego (top 5 más
        completados). Solo considera juegos que el usuario POSEE y que
        tienen al menos un logro definido.
        """
        cursor = connection.obtener_cursor()
        cursor.execute(
            """
            SELECT
                j.id AS juego_id,
                j.titulo,
                COUNT(DISTINCT l.id) AS total_logros,
                COUNT(DISTINCT ld.logro_id) AS logros_desbloqueados,
                ROUND(
                    100.0 * COUNT(DISTINCT ld.logro_id) / NULLIF(COUNT(DISTINCT l.id), 0),
                    2
                ) AS porcentaje
            FROM compra c
            JOIN juego j ON j.id = c.juego_id
            JOIN logro l ON l.juego_id = j.id
            LEFT JOIN logro_desbloqueado ld
                   ON ld.logro_id = l.id AND ld.usuario_id = c.usuario_id
            WHERE c.usuario_id = %s
            GROUP BY j.id, j.titulo
            HAVING COUNT(DISTINCT l.id) > 0
            ORDER BY porcentaje DESC
            LIMIT %s;
            """,
            (usuario_id, limite),
        )
        return cursor.fetchall()


logro_repository = LogroRepository()