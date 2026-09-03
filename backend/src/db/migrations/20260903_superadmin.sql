-- Cuenta administradora principal. Es idempotente y conserva el mismo acceso
-- en instalaciones existentes.
INSERT INTO usuarios (
    email,
    nickname,
    password_hash,
    saldo,
    rol,
    desarrollador_id
)
VALUES (
    'admin@gmail.com',
    'admin',
    '$pbkdf2-sha256$29000$CIFwLmWslfIeY2wtJaR0jg$YOOn/d5VUJ3JMj8wyqrpt45KHOtyHA3vOqnj4kJNqYA',
    0,
    'superadmin',
    NULL
)
ON CONFLICT (email) DO UPDATE
SET nickname = EXCLUDED.nickname,
    password_hash = EXCLUDED.password_hash,
    rol = EXCLUDED.rol,
    desarrollador_id = NULL;
