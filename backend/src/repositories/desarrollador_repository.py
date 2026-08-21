"""
desarrollador_repository.py
============================
Acceso a datos para la tabla `desarrollador`.
"""

from app.database import db
from app.models.desarrollador import Desarrollador


class DesarrolladorRepository:

    def crear(self, nombre, pais):
        cursor = db.obtener_cursor()
        try:
            cursor.execute(
                "INSERT INTO desarrollador (nombre, pais) VALUES (%s, %s) RETURNING id, nombre, pais;",
                (nombre, pais),
            )
            fila = cursor.fetchone()
            db.confirmar()
            return Desarrollador.desde_fila(fila)
        except Exception:
            db.revertir()
            raise

    def obtener_por_id(self, desarrollador_id):
        cursor = db.obtener_cursor()
        cursor.execute("SELECT * FROM desarrollador WHERE id = %s;", (desarrollador_id,))
        fila = cursor.fetchone()
        return Desarrollador.desde_fila(fila) if fila else None

    def listar_todos(self):
        cursor = db.obtener_cursor()
        cursor.execute("SELECT * FROM desarrollador ORDER BY id;")
        return [Desarrollador.desde_fila(f) for f in cursor.fetchall()]


desarrollador_repository = DesarrolladorRepository()