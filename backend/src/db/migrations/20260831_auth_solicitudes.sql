-- Soporte persistente para las solicitudes de amistad de la nueva interfaz.
-- La columna password_hash ya existe; las cuentas nuevas usan PBKDF2-SHA256.
-- Las cuentas antiguas con "autenticacion-pendiente" necesitan restablecer su
-- contrasena antes de poder iniciar sesion con el nuevo formulario.

CREATE TABLE IF NOT EXISTS solicitudes_amistad (
    id SERIAL PRIMARY KEY,
    de INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    para INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente' NOT NULL,
    CONSTRAINT check_no_auto_solicitud CHECK (de != para),
    CONSTRAINT check_estado_solicitud
        CHECK (estado IN ('pendiente', 'aceptada', 'rechazada'))
);

CREATE INDEX IF NOT EXISTS ix_solicitudes_recibidas
    ON solicitudes_amistad (para, estado);

CREATE INDEX IF NOT EXISTS ix_solicitudes_enviadas
    ON solicitudes_amistad (de, estado);

-- Conserva la solicitud pendiente más antigua si una base previa llegó a
-- guardar duplicados en el mismo sentido o en el sentido inverso.
DELETE FROM solicitudes_amistad repetida
USING solicitudes_amistad original
WHERE repetida.estado = 'pendiente'
  AND original.estado = 'pendiente'
  AND LEAST(repetida.de, repetida.para) = LEAST(original.de, original.para)
  AND GREATEST(repetida.de, repetida.para) = GREATEST(original.de, original.para)
  AND repetida.id > original.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_pendiente_entre_usuarios
    ON solicitudes_amistad (LEAST(de, para), GREATEST(de, para))
    WHERE estado = 'pendiente';
