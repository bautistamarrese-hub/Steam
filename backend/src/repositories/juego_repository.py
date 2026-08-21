"""
juego_repository.py
====================
Acceso a datos para la tabla `juego`. Incluye también consultas más
complejas como "top ventas" y "mejor valorados" (HU11), ya que son
consultas de SOLO LECTURA sobre juegos: tiene sentido que vivan acá.
"""

from app.database import db
from app.models.juego import Juego


class JuegoRepository:

    def crear(self, titulo, desarrollador_id, precio, fecha_lanzamiento, genero):
        cursor = db.obtener_cursor()
        try:
            cursor.execute(
                """
                INSERT INTO juego (titulo, desarrollador_id, precio, fecha_lanzamiento, genero)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, titulo, desarrollador_id, precio, fecha_lanzamiento, genero;
                """,
                (titulo, desarrollador_id, precio, fecha_lanzamiento, genero),
            )
            fila = cursor.fetchone()
            db.confirmar()
            return Juego.desde_fila(fila)
        except Exception:
            db.revertir()
            raise

    def obtener_por_id(self, juego_id):
        cursor = db.obtener_cursor()
        cursor.execute("SELECT * FROM juego WHERE id = %s;", (juego_id,))
        fila = cursor.fetchone()
        return Juego.desde_fila(fila) if fila else None

    def existe_titulo_para_desarrollador(self, desarrollador_id, titulo):
        """HU2: el título debe ser único por desarrollador."""
        cursor = db.obtener_cursor()
        cursor.execute(
            "SELECT 1 FROM juego WHERE desarrollador_id = %s AND titulo = %s;",
            (desarrollador_id, titulo),
        )
        return cursor.fetchone() is not None

    def listar_por_desarrollador(self, desarrollador_id):
        """HU2: GET /desarrolladores/{id}/juegos"""
        cursor = db.obtener_cursor()
        cursor.execute(
            "SELECT * FROM juego WHERE desarrollador_id = %s ORDER BY id;",
            (desarrollador_id,),
        )
        return [Juego.desde_fila(f) for f in cursor.fetchall()]

    def listar_todos(self, genero=None):
        cursor = db.obtener_cursor()
        if genero:
            cursor.execute("SELECT * FROM juego WHERE genero = %s ORDER BY id;", (genero,))
        else:
            cursor.execute("SELECT * FROM juego ORDER BY id;")
        return [Juego.desde_fila(f) for f in cursor.fetchall()]

    def top_ventas(self, genero=None, limite=10):
        """
        HU11: los 10 juegos con más compras.
        Usamos JOIN + GROUP BY + COUNT para contar cuántas compras tiene
        cada juego, y ordenamos de mayor a menor.
        """
        cursor = db.obtener_cursor()
        if genero:
            cursor.execute(
                """
                SELECT j.*, COUNT(c.id) AS total_compras
                FROM juego j
                JOIN compra c ON c.juego_id = j.id
                WHERE j.genero = %s
                GROUP BY j.id
                ORDER BY total_compras DESC
                LIMIT %s;
                """,
                (genero, limite),
            )
        else:
            cursor.execute(
                """
                SELECT j.*, COUNT(c.id) AS total_compras
                FROM juego j
                JOIN compra c ON c.juego_id = j.id
                GROUP BY j.id
                ORDER BY total_compras DESC
                LIMIT %s;
                """,
                (limite,),
            )
        resultados = []
        for fila in cursor.fetchall():
            juego = Juego.desde_fila(fila)
            # Guardamos el dato extra "total_compras" como atributo dinámico,
            # útil para mostrarlo en pantalla sin crear una clase nueva.
            juego.total_compras = fila["total_compras"]
            resultados.append(juego)
        return resultados

    def mejor_valorados(self, genero=None, limite=10, minimo_resenas=20):
        """
        HU11: los 10 juegos con mayor % de reseñas positivas,
        exigiendo un mínimo de 20 reseñas para que el ranking sea
        estadísticamente significativo (evita que un juego con 1 reseña
        positiva de 1 total "gane" con 100%).
        """
        cursor = db.obtener_cursor()
        condicion_genero = "AND j.genero = %s" if genero else ""
        parametros = []
        if genero:
            parametros.append(genero)
        parametros.extend([minimo_resenas, limite])

        cursor.execute(
            f"""
            SELECT
                j.*,
                COUNT(r.id) AS total_resenas,
                ROUND(
                    100.0 * SUM(CASE WHEN r.recomienda THEN 1 ELSE 0 END) / COUNT(r.id),
                    2
                ) AS porcentaje_positivas
            FROM juego j
            JOIN resena r ON r.juego_id = j.id
            WHERE 1=1 {condicion_genero}
            GROUP BY j.id
            HAVING COUNT(r.id) >= %s
            ORDER BY porcentaje_positivas DESC
            LIMIT %s;
            """,
            tuple(parametros),
        )
        resultados = []
        for fila in cursor.fetchall():
            juego = Juego.desde_fila(fila)
            juego.total_resenas = fila["total_resenas"]
            juego.porcentaje_positivas = float(fila["porcentaje_positivas"])
            resultados.append(juego)
        return resultados


juego_repository = JuegoRepository()