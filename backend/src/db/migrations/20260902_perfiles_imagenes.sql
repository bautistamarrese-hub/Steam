-- Avatares de usuario y contenido editorial editable de los juegos.
-- Es idempotente y se puede ejecutar sobre una base existente.

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);

ALTER TABLE juego
    ADD COLUMN IF NOT EXISTS descripcion TEXT,
    ADD COLUMN IF NOT EXISTS resumen VARCHAR(500),
    ADD COLUMN IF NOT EXISTS imagen TEXT,
    ADD COLUMN IF NOT EXISTS galeria JSON;
