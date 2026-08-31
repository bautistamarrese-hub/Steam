CREATE TABLE Desarrollador (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    pais VARCHAR(50)
);

-- 1. Entidades Principales
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    saldo DECIMAL(10, 2) DEFAULT 0.00 CHECK (saldo >= 0),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
    desarrollador_id INT UNIQUE,
    FOREIGN KEY (desarrollador_id) REFERENCES Desarrollador(id)
);

-- 2. Entidades con dependencias simples
CREATE TABLE Juego (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    desarrollador_id INT NOT NULL,
    precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
    fecha_lanzamiento DATE,
    genero VARCHAR(50),
    UNIQUE (titulo, desarrollador_id),
    FOREIGN KEY (desarrollador_id) REFERENCES Desarrollador(id)
);

CREATE TABLE Logro (
    id SERIAL PRIMARY KEY,
    juego_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    puntos INT DEFAULT 1 CHECK (puntos BETWEEN 1 AND 100),
    UNIQUE (nombre, juego_id),
    FOREIGN KEY (juego_id) REFERENCES Juego(id)
);

-- 3. Tablas Intermedias (Relaciones y Transacciones)
CREATE TABLE Compra (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    juego_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    precio_pagado DECIMAL(10, 2) NOT NULL,
    UNIQUE (usuario_id, juego_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (juego_id) REFERENCES Juego(id)
);

CREATE TABLE LogroDesbloqueado (
    usuario_id INT NOT NULL,
    logro_id INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, logro_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (logro_id) REFERENCES Logro(id)
);

CREATE TABLE Resena (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    juego_id INT NOT NULL,
    recomienda BOOLEAN NOT NULL,
    texto TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id, juego_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (juego_id) REFERENCES Juego(id)
);

-- 4. Relaciones N a M explícitas
CREATE TABLE Wishlist (
    usuario_id INT NOT NULL,
    juego_id INT NOT NULL,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, juego_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (juego_id) REFERENCES Juego(id)
);

CREATE TABLE Amigos (
    usuario_a INT NOT NULL,
    usuario_b INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_a, usuario_b),
    FOREIGN KEY (usuario_a) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_b) REFERENCES usuarios(id),
    CHECK (usuario_a != usuario_b) -- Evita que un usuario sea amigo de sí mismo
);

CREATE TABLE solicitudes_amistad (
    id SERIAL PRIMARY KEY,
    de INT NOT NULL,
    para INT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    FOREIGN KEY (de) REFERENCES usuarios(id),
    FOREIGN KEY (para) REFERENCES usuarios(id),
    CHECK (de != para),
    CHECK (estado IN ('pendiente', 'aceptada', 'rechazada'))
);

CREATE TABLE Recarga (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL,
    monto DECIMAL(10, 2) NOT NULL CHECK (monto >= 100),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
