-- Archivos publicables y reproducibles desde el navegador.
ALTER TABLE juego
    ADD COLUMN IF NOT EXISTS archivo_nombre VARCHAR(255),
    ADD COLUMN IF NOT EXISTS archivo_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS es_jugable BOOLEAN NOT NULL DEFAULT FALSE;
