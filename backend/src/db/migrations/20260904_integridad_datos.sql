-- Alinea bases existentes con las restricciones de los modelos actuales.
-- Puede ejecutarse más de una vez.

BEGIN;

UPDATE juego
SET genero = 'Sin especificar'
WHERE genero IS NULL OR BTRIM(genero) = '';

ALTER TABLE juego
    ALTER COLUMN genero SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'usuarios'::regclass
          AND conname = 'check_usuario_saldo'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT check_usuario_saldo CHECK (saldo >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'usuarios'::regclass
          AND conname = 'check_usuario_rol'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT check_usuario_rol
            CHECK (rol IN ('cliente', 'admin', 'superadmin'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'juego'::regclass
          AND conname = 'check_juego_precio'
    ) THEN
        ALTER TABLE juego
            ADD CONSTRAINT check_juego_precio CHECK (precio >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'recarga'::regclass
          AND conname = 'check_recarga_monto'
    ) THEN
        ALTER TABLE recarga
            ADD CONSTRAINT check_recarga_monto
            CHECK (monto BETWEEN 100 AND 30000);
    END IF;
END
$$;

-- La amistad es simétrica: conserva una sola fila y siempre con el ID menor primero.
DELETE FROM amigos invertida
USING amigos canonica
WHERE invertida.usuario_a > invertida.usuario_b
  AND canonica.usuario_a = invertida.usuario_b
  AND canonica.usuario_b = invertida.usuario_a;

UPDATE amigos
SET (usuario_a, usuario_b) = (usuario_b, usuario_a)
WHERE usuario_a > usuario_b;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'amigos'::regclass
          AND conname = 'check_amistad_ordenada'
    ) THEN
        ALTER TABLE amigos
            ADD CONSTRAINT check_amistad_ordenada
            CHECK (usuario_a < usuario_b);
    END IF;
END
$$;

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

COMMIT;
