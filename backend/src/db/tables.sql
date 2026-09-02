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
    saldo DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente',
    desarrollador_id INT UNIQUE REFERENCES desarrollador(id),
    avatar VARCHAR(500)
);

-- 2. Entidades con dependencias simples
CREATE TABLE juego (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    desarrollador_id INT NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    fecha_lanzamiento DATE,
    genero VARCHAR(50),
    descripcion TEXT,
    resumen VARCHAR(500),
    imagen TEXT,
    galeria JSON,
    archivo_nombre VARCHAR(255),
    archivo_url VARCHAR(500),
    es_jugable BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (desarrollador_id) REFERENCES desarrollador(id)
);

CREATE TABLE logro (
    id SERIAL PRIMARY KEY,
    juego_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    puntos INT DEFAULT 0,
    FOREIGN KEY (juego_id) REFERENCES juego(id)
);

-- 3. Tablas Intermedias (Relaciones y Transacciones)
CREATE TABLE compra (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    juego_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    precio_pagado DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (juego_id) REFERENCES juego(id)
);

CREATE TABLE recarga (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    monto NUMERIC(10, 2) NOT NULL CHECK (monto >= 100),
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
    FOREIGN KEY (juego_id) REFERENCES juego(id)
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
    CHECK (usuario_a != usuario_b) -- Evita que un usuario sea amigo de sí mismo
);
