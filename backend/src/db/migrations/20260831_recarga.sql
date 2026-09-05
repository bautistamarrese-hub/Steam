-- Historial de recargas requerido por POST /api/usuarios/{id}/recargar.
-- Es segura para ejecutar sobre una base que ya tenga usuarios.

CREATE TABLE IF NOT EXISTS recarga (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    monto NUMERIC(10, 2) NOT NULL CHECK (monto BETWEEN 100 AND 30000),
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_recarga_usuario_fecha
    ON recarga (usuario_id, fecha DESC);
