CREATE TABLE IF NOT EXISTS denuncias_juego (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    juego_id INT NOT NULL REFERENCES juego(id) ON DELETE CASCADE,
    motivo TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP,
    CONSTRAINT check_estado_denuncia_juego
        CHECK (estado IN ('pendiente', 'aceptada', 'rechazada'))
);

CREATE INDEX IF NOT EXISTS ix_denuncia_juego_estado_fecha
    ON denuncias_juego (estado, fecha DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_denuncia_juego_pendiente_usuario
    ON denuncias_juego (usuario_id, juego_id)
    WHERE estado = 'pendiente';
