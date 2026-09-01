-- Corrige las bases creadas con el antiguo src/db/tables.sql.
-- El modelo SQLAlchemy usa la tabla plural `usuarios` y requiere guardar el
-- hash de la contrasena; sin esta migracion el registro responde HTTP 500.

DO $$
BEGIN
    IF to_regclass('public.usuarios') IS NULL
       AND to_regclass('public.usuario') IS NOT NULL THEN
        ALTER TABLE usuario RENAME TO usuarios;
    END IF;
END $$;

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
    ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'cliente',
    ADD COLUMN IF NOT EXISTS desarrollador_id INT REFERENCES desarrollador(id);

-- Las cuentas previas no tenian contrasena. Se conserva la fila y se impide
-- su inicio de sesion hasta que se restablezca la contrasena.
UPDATE usuarios
SET password_hash = 'autenticacion-pendiente'
WHERE password_hash IS NULL;

ALTER TABLE usuarios
    ALTER COLUMN password_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_desarrollador_id
    ON usuarios (desarrollador_id)
    WHERE desarrollador_id IS NOT NULL;
