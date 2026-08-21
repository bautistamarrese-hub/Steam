"""
usuario_repository.py
======================
Un "repositorio" es una clase cuya única responsabilidad es hablar con la
base de datos para una entidad en particular (en este caso, Usuario).

¿Por qué separar esto de la lógica de negocio (services)?
- Si mañana cambiamos de PostgreSQL a otra base, solo tocamos estos
  archivos, no el resto del programa.
- Mantiene el SQL ordenado y fácil de encontrar.
- Los "services" (services/usuario_service.py, etc.) usan estos métodos
  para aplicar las REGLAS del negocio (ej: "no dejar saldo negativo"),
  mientras que el repositorio solo hace INSERT/UPDATE/SELECT puros.
"""

from app.database import db
from app.models.usuario import Usuario


class UsuarioRepository:
    """Encapsula todas las consultas SQL sobre la tabla `usuario`."""

    def crear(self, email, nickname):
        """
        Inserta un nuevo usuario. saldo y fecha_registro los pone la propia
        base de datos por default (HU1).
        Devuelve el objeto Usuario recién creado.
        """
        cursor = db.obtener_cursor()
        try:
            cursor.execute(
                """
                INSERT INTO usuario (email, nickname)
                VALUES (%s, %s)
                RETURNING id, email, nickname, saldo, fecha_registro;
                """,
                (email, nickname),
            )
            fila = cursor.fetchone()
            db.confirmar()
            return Usuario.desde_fila(fila)
        except Exception:
            # Si algo falla (ej: email duplicado -> viola UNIQUE) revertimos
            # la transacción para no dejar la conexión en un estado roto.
            db.revertir()
            raise

    def obtener_por_id(self, usuario_id):
        """Devuelve un Usuario por su id, o None si no existe."""
        cursor = db.obtener_cursor()
        cursor.execute("SELECT * FROM usuario WHERE id = %s;", (usuario_id,))
        fila = cursor.fetchone()
        return Usuario.desde_fila(fila) if fila else None

    def obtener_por_email(self, email):
        cursor = db.obtener_cursor()
        cursor.execute("SELECT * FROM usuario WHERE email = %s;", (email,))
        fila = cursor.fetchone()
        return Usuario.desde_fila(fila) if fila else None

    def obtener_por_nickname(self, nickname):
        cursor = db.obtener_cursor()
        cursor.execute("SELECT * FROM usuario WHERE nickname = %s;", (nickname,))
        fila = cursor.fetchone()
        return Usuario.desde_fila(fila) if fila else None

    def listar_todos(self):
        cursor = db.obtener_cursor()
        cursor.execute("SELECT * FROM usuario ORDER BY id;")
        return [Usuario.desde_fila(f) for f in cursor.fetchall()]

    def actualizar_saldo(self, usuario_id, nuevo_saldo):
        """
        Actualiza el saldo de un usuario a un valor absoluto.
        La VALIDACIÓN de que el saldo no quede negativo la hace el
        "service" (capa de negocio) ANTES de llamar a este método; acá solo
        ejecutamos el UPDATE. Además la tabla tiene un CHECK (saldo >= 0)
        como última barrera de seguridad a nivel base de datos.
        """
        cursor = db.obtener_cursor()
        try:
            cursor.execute(
                "UPDATE usuario SET saldo = %s WHERE id = %s;",
                (nuevo_saldo, usuario_id),
            )
            db.confirmar()
        except Exception:
            db.revertir()
            raise

    def registrar_recarga(self, usuario_id, monto):
        """
        HU3: cada recarga debe quedar registrada, no basta con actualizar
        el saldo. Como el enunciado no pide una entidad "Recarga" explícita
        en la lista de entidades sugeridas, la registramos reutilizando la
        tabla `compra` NO seria correcto (son cosas distintas). En cambio,
        creamos aquí una tabla mínima de historial la primera vez que se usa.

        Para mantenernos fieles al modelo de datos entregado, esta
        implementación crea (si no existe) una tabla auxiliar `recarga`.
        """
        cursor = db.obtener_cursor()
        try:
            # Creamos la tabla de recargas si todavía no existe (idempotente).
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS recarga (
                    id SERIAL PRIMARY KEY,
                    usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
                    monto NUMERIC(10,2) NOT NULL CHECK (monto >= 100),
                    fecha TIMESTAMP NOT NULL DEFAULT NOW()
                );
                """
            )
            cursor.execute(
                "INSERT INTO recarga (usuario_id, monto) VALUES (%s, %s);",
                (usuario_id, monto),
            )
            # Sumamos el monto al saldo actual directamente en SQL para
            # evitar condiciones de carrera (dos recargas al mismo tiempo).
            cursor.execute(
                "UPDATE usuario SET saldo = saldo + %s WHERE id = %s RETURNING saldo;",
                (monto, usuario_id),
            )
            nuevo_saldo = cursor.fetchone()["saldo"]
            db.confirmar()
            return float(nuevo_saldo)
        except Exception:
            db.revertir()
            raise


# Instancia única reutilizable, igual que hicimos con `db`.
usuario_repository = UsuarioRepository()