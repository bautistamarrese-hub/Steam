BEGIN;

CREATE TABLE IF NOT EXISTS progreso_logro (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    juego_id INT NOT NULL REFERENCES juego(id) ON DELETE CASCADE,
    evento VARCHAR(100) NOT NULL,
    valor DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (valor >= 0),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_progreso_usuario_juego_evento UNIQUE (usuario_id, juego_id, evento)
);

CREATE INDEX IF NOT EXISTS ix_progreso_logro_usuario_id
    ON progreso_logro (usuario_id);
CREATE INDEX IF NOT EXISTS ix_progreso_logro_juego_id
    ON progreso_logro (juego_id);

-- Los desbloqueos anteriores a esta tabla prueban un avance mínimo. Se usa la
-- métrica normalizada y el mayor objetivo ya alcanzado para que, por ejemplo,
-- ganar 1 partida también figure como 1/5 en los logros posteriores.
INSERT INTO progreso_logro (usuario_id, juego_id, evento, valor)
SELECT
    ld.usuario_id,
    l.juego_id,
    CASE
        WHEN LOWER(l.requisito_evento) IN ('victorias', 'partidas-ganadas')
            THEN 'victorias'
        ELSE LOWER(l.requisito_evento)
    END AS evento,
    MAX(l.requisito_valor) AS valor
FROM logrodesbloqueado ld
JOIN logro l ON l.id = ld.logro_id
WHERE l.requisito_evento IS NOT NULL
  AND l.requisito_valor IS NOT NULL
GROUP BY
    ld.usuario_id,
    l.juego_id,
    CASE
        WHEN LOWER(l.requisito_evento) IN ('victorias', 'partidas-ganadas')
            THEN 'victorias'
        ELSE LOWER(l.requisito_evento)
    END
ON CONFLICT (usuario_id, juego_id, evento) DO UPDATE
SET valor = GREATEST(progreso_logro.valor, EXCLUDED.valor),
    fecha_actualizacion = CURRENT_TIMESTAMP;

COMMIT;
