from sqlalchemy import Column, Integer, String

from src.db.connection import Base

from sqlalchemy import Float


# Creador de usuario con datos basicos , datos de cuenta , y con id, mas abajo hay para creador de juegos (extension de usuario)

class DatosBasicos:
    def __init__(
        self,
        username,
        display_name,
        fecha_nacimiento,
        pais,
        idioma,
        foto_perfil=None,
        bio=""
    ):
        self.username = username
        self.display_name = display_name
        self.fecha_nacimiento = fecha_nacimiento
        self.pais = pais
        self.idioma = idioma
        self.foto_perfil = foto_perfil
        self.bio = bio


class DatosCuenta:
    def __init__(
        self,
        email,
        password_hash,
        fecha_creacion,
        ultimo_inicio_sesion,
        estado="activo",
        email_verificado=False,
        telefono=None,
        saldo=0.0
    ):
        self.email = email
        self.password_hash = password_hash
        self.fecha_creacion = fecha_creacion
        self.ultimo_inicio_sesion = ultimo_inicio_sesion
        self.estado = estado
        self.email_verificado = email_verificado
        self.telefono = telefono
        self.saldo = saldo


class Usuario:
    def __init__(
        self,
        id_usuario,
        datos_basicos,
        datos_cuenta
    ):
        self.id = id_usuario
        self.datos_basicos = datos_basicos
        self.datos_cuenta = datos_cuenta


class CreadorDeJuegos(Usuario):
    def __init__(
        self,
        id_usuario,
        datos_basicos,
        datos_cuenta,
        nombre_desarrollador,
        descripcion_estudio="",
        juegos_publicados=None
    ):
        super().__init__(
            id_usuario,
            datos_basicos,
            datos_cuenta
        )

        self.nombre_desarrollador = nombre_desarrollador
        self.descripcion_estudio = descripcion_estudio
        self.juegos_publicados = juegos_publicados or []

    def publicar_juego(self, juego):
        self.juegos_publicados.append(juego)


class Juego:
    def __init__(
        self,
        id_juego,
        nombre,
        precio,
        desarrollador,
        genero,
        fecha_lanzamiento,
        descripcion="",
        imagen=None,
        plataformas=None,
        clasificacion_edad=None,
        multijugador=False,
        un_jugador=True,
        tamaño=None
    ):
        self.id = id_juego
        self.nombre = nombre
        self.precio = precio
        self.desarrollador = desarrollador
        self.genero = genero
        self.fecha_lanzamiento = fecha_lanzamiento
        self.descripcion = descripcion
        self.imagen = imagen
        self.plataformas = plataformas or []
        self.clasificacion_edad = clasificacion_edad
        self.multijugador = multijugador
        self.un_jugador = un_jugador
        self.tamaño = tamaño


class Compra:
    def __init__(
        self,
        id_compra,
        usuario_id,
        juego_id,
        fecha,
        precio_pagado
    ):
        self.id = id_compra
        self.usuario_id = usuario_id
        self.juego_id = juego_id
        self.fecha = fecha
        self.precio_pagado = precio_pagado