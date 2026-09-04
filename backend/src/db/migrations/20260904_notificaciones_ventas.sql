-- Acredita y agrupa los ingresos pendientes de confirmar por juego.
CREATE TABLE IF NOT EXISTS notificaciones_venta (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    juego_id INT NOT NULL REFERENCES juego(id) ON DELETE CASCADE,
    monto_acumulado NUMERIC(12, 2) NOT NULL CHECK (monto_acumulado > 0),
    cantidad_compras INT NOT NULL CHECK (cantidad_compras > 0),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notificacion_venta_usuario_juego UNIQUE (usuario_id, juego_id)
);

CREATE INDEX IF NOT EXISTS ix_notificacion_venta_usuario_fecha
    ON notificaciones_venta (usuario_id, fecha_actualizacion DESC);
