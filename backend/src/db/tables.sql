-- 1. Entidades Principales
CREATE TABLE desarrollador (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    pais VARCHAR(50)
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    saldo DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (saldo >= 0),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente',
    desarrollador_id INT UNIQUE REFERENCES desarrollador(id),
    avatar VARCHAR(500),
    CONSTRAINT check_usuario_rol CHECK (rol IN ('cliente', 'admin', 'superadmin'))
);

-- 2. Entidades con dependencias simples
CREATE TABLE juego (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    desarrollador_id INT NOT NULL,
    precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
    fecha_lanzamiento DATE,
    genero VARCHAR(50) NOT NULL,
    descripcion TEXT,
    resumen VARCHAR(500),
    imagen TEXT,
    galeria JSON,
    archivo_nombre VARCHAR(255),
    archivo_url VARCHAR(500),
    es_jugable BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (desarrollador_id) REFERENCES desarrollador(id),
    CONSTRAINT uq_titulo_desarrollador UNIQUE (titulo, desarrollador_id)
);

CREATE TABLE logro (
    id SERIAL PRIMARY KEY,
    juego_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    puntos INT NOT NULL DEFAULT 1,
    requisito_evento VARCHAR(100),
    requisito_valor DOUBLE PRECISION,
    CONSTRAINT check_requisito_logro_completo CHECK (
        (requisito_evento IS NULL AND requisito_valor IS NULL)
        OR (requisito_evento IS NOT NULL AND requisito_valor > 0)
    ),
    CONSTRAINT check_puntos_rango CHECK (puntos BETWEEN 1 AND 100),
    CONSTRAINT uq_nombre_logro_juego UNIQUE (nombre, juego_id),
    FOREIGN KEY (juego_id) REFERENCES juego(id)
);

CREATE TABLE recuperacion_cuenta (
    usuario_id INT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    pregunta_1 VARCHAR(200) NOT NULL,
    respuesta_1_hash VARCHAR(255) NOT NULL,
    pregunta_2 VARCHAR(200) NOT NULL,
    respuesta_2_hash VARCHAR(255) NOT NULL,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tablas Intermedias (Relaciones y Transacciones)
CREATE TABLE compra (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    juego_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    precio_pagado DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (juego_id) REFERENCES juego(id),
    CONSTRAINT uq_compra_usuario_juego UNIQUE (usuario_id, juego_id)
);

CREATE TABLE recarga (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    monto NUMERIC(10, 2) NOT NULL CHECK (monto BETWEEN 100 AND 30000),
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE logrodesbloqueado (
    usuario_id INT NOT NULL,
    logro_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, logro_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (logro_id) REFERENCES logro(id)
);

CREATE TABLE resena (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    juego_id INT NOT NULL,
    recomienda BOOLEAN NOT NULL,
    texto TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (juego_id) REFERENCES juego(id),
    CONSTRAINT uq_usuario_juego_resena UNIQUE (usuario_id, juego_id)
);

-- 4. Relaciones N a M explícitas
CREATE TABLE wishlist (
    usuario_id INT NOT NULL,
    juego_id INT NOT NULL,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, juego_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (juego_id) REFERENCES juego(id)
);

CREATE TABLE amigos (
    usuario_a INT NOT NULL,
    usuario_b INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_a, usuario_b),
    FOREIGN KEY (usuario_a) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_b) REFERENCES usuarios(id),
    CHECK (usuario_a < usuario_b) -- Canoniza el par y evita duplicados en ambos sentidos
);

CREATE TABLE progreso_logro (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    juego_id INT NOT NULL REFERENCES juego(id) ON DELETE CASCADE,
    evento VARCHAR(100) NOT NULL,
    valor DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (valor >= 0),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_progreso_usuario_juego_evento UNIQUE (usuario_id, juego_id, evento)
);

CREATE TABLE solicitudes_amistad (
    id SERIAL PRIMARY KEY,
    de INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    para INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CONSTRAINT check_no_auto_solicitud CHECK (de != para),
    CONSTRAINT check_estado_solicitud
        CHECK (estado IN ('pendiente', 'aceptada', 'rechazada'))
);

CREATE INDEX ix_solicitudes_recibidas
    ON solicitudes_amistad (para, estado);

CREATE INDEX ix_solicitudes_enviadas
    ON solicitudes_amistad (de, estado);

CREATE UNIQUE INDEX uq_solicitud_pendiente_entre_usuarios
    ON solicitudes_amistad (LEAST(de, para), GREATEST(de, para))
    WHERE estado = 'pendiente';

CREATE TABLE notificaciones_venta (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    juego_id INT NOT NULL REFERENCES juego(id) ON DELETE CASCADE,
    monto_acumulado NUMERIC(12, 2) NOT NULL CHECK (monto_acumulado > 0),
    cantidad_compras INT NOT NULL CHECK (cantidad_compras > 0),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_notificacion_venta_usuario_juego UNIQUE (usuario_id, juego_id)
);

CREATE TABLE denuncias_juego (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    juego_id INT NOT NULL REFERENCES juego(id) ON DELETE CASCADE,
    motivo TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion TIMESTAMP,
    CONSTRAINT check_estado_denuncia_juego
        CHECK (estado IN ('pendiente', 'aceptada', 'rechazada'))
);

CREATE INDEX ix_denuncia_juego_estado_fecha
    ON denuncias_juego (estado, fecha DESC);

CREATE UNIQUE INDEX uq_denuncia_juego_pendiente_usuario
    ON denuncias_juego (usuario_id, juego_id)
    WHERE estado = 'pendiente';

-- Cuenta administradora principal precargada.
INSERT INTO usuarios (email, nickname, password_hash, saldo, rol)
VALUES (
    'admin@gmail.com',
    'admin',
    '$pbkdf2-sha256$29000$CIFwLmWslfIeY2wtJaR0jg$YOOn/d5VUJ3JMj8wyqrpt45KHOtyHA3vOqnj4kJNqYA',
    0,
    'superadmin'
)
ON CONFLICT (email) DO NOTHING;
