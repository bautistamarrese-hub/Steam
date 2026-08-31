-- Migración para bases creadas antes de persistir las cuentas desarrollador.
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente';

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS desarrollador_id INT REFERENCES desarrollador(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_desarrollador_id
    ON usuarios (desarrollador_id)
    WHERE desarrollador_id IS NOT NULL;
