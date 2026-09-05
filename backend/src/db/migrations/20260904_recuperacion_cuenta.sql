BEGIN;

CREATE TABLE IF NOT EXISTS recuperacion_cuenta (
    usuario_id INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    pregunta_1 VARCHAR(200) NOT NULL,
    respuesta_1_hash VARCHAR(255) NOT NULL,
    pregunta_2 VARCHAR(200) NOT NULL,
    respuesta_2_hash VARCHAR(255) NOT NULL,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
