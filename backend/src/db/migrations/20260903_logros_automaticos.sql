-- Agrega requisitos estructurados a los logros existentes sin borrar datos.
ALTER TABLE logro
    ADD COLUMN IF NOT EXISTS requisito_evento VARCHAR(100),
    ADD COLUMN IF NOT EXISTS requisito_valor DOUBLE PRECISION;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'check_requisito_logro_completo'
    ) THEN
        ALTER TABLE logro
            ADD CONSTRAINT check_requisito_logro_completo CHECK (
                (requisito_evento IS NULL AND requisito_valor IS NULL)
                OR (requisito_evento IS NOT NULL AND requisito_valor > 0)
            );
    END IF;
END $$;
