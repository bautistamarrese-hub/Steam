from fastapi.testclient import TestClient

from src.services.desarrolladorJuego_service import JuegoService
from src.services.registroUsuario_service import UsuarioService


class RecursoAutenticado(dict):
    def __init__(self, datos: dict, headers: dict[str, str]):
        super().__init__(datos)
        self.headers = headers


_HEADERS_POR_DESARROLLADOR: dict[int, dict[str, str]] = {}


def assert_status(response, expected: int):
    assert response.status_code == expected, response.text
    return response.json() if response.content else None


def registrar(
    client: TestClient,
    suffix: str,
    *,
    rol: str = "cliente",
    estudio: str | None = None,
):
    body = {
        "email": f"{suffix}@example.com",
        "nickname": f"nick_{suffix}",
        "password": "secreto123",
        "rol": rol,
    }
    if estudio is not None:
        body["estudio"] = estudio
    usuario = assert_status(client.post("/api/usuarios/", json=body), 201)
    acceso = assert_status(
        client.post(
            "/api/usuarios/login",
            json={"email": body["email"], "password": body["password"]},
        ),
        200,
    )
    resultado = RecursoAutenticado(
        usuario,
        {"Authorization": f"Bearer {acceso['access_token']}"},
    )
    if resultado.get("desarrollador_id") is not None:
        _HEADERS_POR_DESARROLLADOR[resultado["desarrollador_id"]] = resultado.headers
    return resultado


def crear_desarrollador(client: TestClient, nombre: str = "Estudio"):
    suffix = f"estudio_{len(_HEADERS_POR_DESARROLLADOR)}_{id(client)}"
    usuario = registrar(client, suffix, rol="admin", estudio=nombre)
    desarrollador = assert_status(
        client.get(f"/api/desarrolladores/{usuario['desarrollador_id']}"), 200
    )
    return RecursoAutenticado(desarrollador, usuario.headers)


def publicar_juego(
    client: TestClient,
    desarrollador_id: int,
    titulo: str,
    *,
    precio: float = 250,
    genero: str = "Indie",
    imagen: str | None = None,
):
    juego = assert_status(
        client.post(
            "/api/juegos/",
            headers=_HEADERS_POR_DESARROLLADOR[desarrollador_id],
            json={
                "titulo": titulo,
                "desarrollador_id": desarrollador_id,
                "precio": precio,
                "fecha_lanzamiento": "2026-08-31",
                "genero": genero,
                "imagen": imagen,
            },
        ),
        201,
    )
    return RecursoAutenticado(juego, _HEADERS_POR_DESARROLLADOR[desarrollador_id])


def test_registro_login_y_rol_desarrollador_persistente(client: TestClient):
    jugador = registrar(client, "jugador")
    assert jugador["saldo"] == 0
    assert jugador["rol"] == "cliente"
    assert jugador["desarrollador_id"] is None
    assert_status(
        client.post(
            "/api/usuarios/login",
            json={"email": "JUGADOR@example.com", "password": "secreto123"},
        ),
        200,
    )
    assert_status(
        client.post(
            "/api/usuarios/login",
            json={"email": "jugador@example.com", "password": "incorrecta"},
        ),
        400,
    )

    dev = registrar(client, "dev", rol="admin", estudio="Mate Studio")
    assert dev["rol"] == "admin"
    assert isinstance(dev["desarrollador_id"], int)

    encontrados = assert_status(client.get("/api/usuarios/?email=DEV@example.com"), 200)
    assert encontrados == [dev]
    estudio = assert_status(
        client.get(f"/api/desarrolladores/{dev['desarrollador_id']}"), 200
    )
    assert estudio["nombre"] == "Mate Studio"


def test_cors_permite_los_puertos_de_desarrollo(client: TestClient):
    for origin in ("http://localhost:5173", "http://localhost:8080"):
        response = client.options(
            "/api/usuarios/",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
            },
        )
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == origin


def test_registro_rechaza_email_y_nickname_duplicados_sin_importar_mayusculas(
    client: TestClient,
):
    registrar(client, "unico")
    duplicado_email = client.post(
        "/api/usuarios/",
        json={
            "email": "UNICO@example.com",
            "nickname": "otro",
            "password": "secreto123",
            "rol": "cliente",
        },
    )
    assert_status(duplicado_email, 400)

    duplicado_nick = client.post(
        "/api/usuarios/",
        json={
            "email": "otro@example.com",
            "nickname": "NICK_UNICO",
            "password": "secreto123",
            "rol": "cliente",
        },
    )
    assert_status(duplicado_nick, 400)


def test_publicacion_busqueda_y_validaciones_de_juego(client: TestClient):
    dev = registrar(client, "publicador", rol="admin", estudio="Sur Games")
    juego = publicar_juego(
        client,
        dev["desarrollador_id"],
        "  Faro Austral  ",
        precio=0,
        genero="Aventura",
    )
    assert juego["titulo"] == "Faro Austral"

    del_dev = assert_status(
        client.get(f"/api/desarrolladores/{dev['desarrollador_id']}/juegos"), 200
    )
    assert [item["id"] for item in del_dev] == [juego["id"]]
    assert [item["id"] for item in assert_status(client.get("/api/juegos/?q=faro"), 200)] == [
        juego["id"]
    ]
    assert [
        item["id"]
        for item in assert_status(client.get("/api/juegos/?genero=Aventura"), 200)
    ] == [juego["id"]]

    duplicado = client.post(
        "/api/juegos/",
        headers=dev.headers,
        json={
            "titulo": "FARO AUSTRAL",
            "desarrollador_id": dev["desarrollador_id"],
            "precio": 10,
            "genero": "Aventura",
        },
    )
    assert_status(duplicado, 400)
    assert_status(
        client.post(
            "/api/juegos/",
            headers=dev.headers,
            json={
                "titulo": "Inválido",
                "desarrollador_id": dev["desarrollador_id"],
                "precio": -1,
                "genero": "Indie",
            },
        ),
        422,
    )


def test_publicacion_completa_con_archivo_y_logro(
    client: TestClient, tmp_path, monkeypatch
):
    monkeypatch.setattr(JuegoService, "STORAGE_ROOT", tmp_path)
    dev = registrar(client, "publicador_completo", rol="admin", estudio="Web Games")
    juego = publicar_juego(
        client,
        dev["desarrollador_id"],
        "Juego HTML",
        precio=67,
        genero="Accion",
    )

    publicado = assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/archivo",
            headers=juego.headers,
            files={"archivo": ("index.html", b"<h1>Juego listo</h1>", "text/html")},
        ),
        200,
    )
    assert publicado["archivo_nombre"] == "index.html"
    assert publicado["archivo_url"].split("?", 1)[0].endswith(
        f"/{juego['id']}/index.html"
    )
    assert "?v=" in publicado["archivo_url"]
    assert publicado["es_jugable"] is True
    assert (tmp_path / "games" / str(juego["id"]) / "index.html").is_file()

    assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/archivo",
            headers=juego.headers,
            files={"archivo": ("roto.zip", b"esto no es un zip", "application/zip")},
        ),
        400,
    )
    conservado = assert_status(client.get(f"/api/juegos/{juego['id']}"), 200)
    assert conservado["archivo_nombre"] == "index.html"
    assert (tmp_path / "games" / str(juego["id"]) / "index.html").read_bytes() == (
        b"<h1>Juego listo</h1>"
    )

    reemplazado = assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/archivo",
            headers=juego.headers,
            files={"archivo": ("nuevo.html", b"<h1>Nueva version</h1>", "text/html")},
        ),
        200,
    )
    assert reemplazado["archivo_nombre"] == "nuevo.html"
    assert reemplazado["archivo_url"] != publicado["archivo_url"]
    assert (tmp_path / "games" / str(juego["id"]) / "index.html").read_bytes() == (
        b"<h1>Nueva version</h1>"
    )

    logro = assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/logros",
            headers=juego.headers,
            json={
                "nombre": "Primer logro",
                "descripcion": "Completar la prueba",
                "puntos": 10,
            },
        ),
        201,
    )
    assert logro["juego_id"] == juego["id"]


def test_avatar_y_contenido_editorial_de_juegos(client: TestClient, tmp_path, monkeypatch):
    monkeypatch.setattr(UsuarioService, "STORAGE_ROOT", tmp_path)
    usuario = registrar(client, "con_avatar")
    actualizado = assert_status(
        client.put(
            f"/api/usuarios/{usuario['id']}/avatar",
            headers=usuario.headers,
            files={"archivo": ("avatar.png", b"imagen-de-prueba", "image/png")},
        ),
        200,
    )
    ruta_avatar = tmp_path / "avatars" / str(usuario["id"]) / "avatar.png"
    assert actualizado["avatar"].split("?", 1)[0].endswith(f"/{usuario['id']}/avatar.png")
    assert "?v=" in actualizado["avatar"]
    assert ruta_avatar.is_file()

    reemplazado = assert_status(
        client.put(
            f"/api/usuarios/{usuario['id']}/avatar",
            headers=usuario.headers,
            files={"archivo": ("avatar.png", b"segundo-recorte", "image/png")},
        ),
        200,
    )
    assert reemplazado["avatar"] != actualizado["avatar"]
    assert ruta_avatar.read_bytes() == b"segundo-recorte"

    dev = registrar(client, "editor", rol="admin", estudio="Editor Studio")
    juego = assert_status(
        client.post(
            "/api/juegos/",
            headers=dev.headers,
            json={
                "titulo": "Juego ilustrado",
                "desarrollador_id": dev["desarrollador_id"],
                "precio": 120,
                "genero": "Indie",
                "descripcion": "Descripción original",
                "resumen": "Resumen original",
                "imagen": "data:image/png;base64,portada",
                "galeria": ["data:image/png;base64,captura"],
            },
        ),
        201,
    )
    assert juego["imagen"].startswith("data:image/png")
    assert len(juego["galeria"]) == 1

    editado = assert_status(
        client.put(
            f"/api/juegos/{juego['id']}",
            headers=dev.headers,
            json={
                "desarrollador_id": dev["desarrollador_id"],
                "titulo": "Juego ilustrado definitivo",
                "precio": 200,
                "resumen": "Resumen actualizado",
            },
        ),
        200,
    )
    assert editado["titulo"] == "Juego ilustrado definitivo"
    assert editado["precio"] == 200
    assert editado["resumen"] == "Resumen actualizado"
    assert editado["imagen"] == juego["imagen"]

    otro = registrar(client, "otro_editor", rol="admin", estudio="Otro Studio")
    assert_status(
        client.put(
            f"/api/juegos/{juego['id']}",
            headers=otro.headers,
            json={"desarrollador_id": otro["desarrollador_id"], "precio": 1},
        ),
        400,
    )


def test_eliminar_juego_valida_propietario_y_limpia_dependencias(
    client: TestClient, tmp_path, monkeypatch
):
    monkeypatch.setattr(JuegoService, "STORAGE_ROOT", tmp_path)
    propietario = registrar(client, "propietario_juego", rol="admin", estudio="Delete Studio")
    otro_dev = registrar(client, "otro_propietario", rol="admin", estudio="Otro Delete Studio")
    comprador = registrar(client, "comprador_delete")
    interesado = registrar(client, "interesado_delete")
    juego = publicar_juego(
        client,
        propietario["desarrollador_id"],
        "Juego descartable",
        precio=250,
    )

    assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/archivo",
            headers=juego.headers,
            files={"archivo": ("index.html", b"<h1>Temporal</h1>", "text/html")},
        ),
        200,
    )
    logro = assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/logros",
            headers=juego.headers,
            json={"nombre": "Temporal", "descripcion": "Temporal", "puntos": 10},
        ),
        201,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{comprador['id']}/recargar",
            headers=comprador.headers,
            json={"monto": 500},
        ),
        200,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{comprador['id']}/comprar/{juego['id']}",
            headers=comprador.headers,
        ),
        201,
    )
    assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/resenas",
            headers=comprador.headers,
            json={"usuario_id": comprador["id"], "recomienda": True, "texto": "Bien"},
        ),
        201,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{comprador['id']}/logros/{logro['id']}",
            headers=comprador.headers,
        ),
        201,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{interesado['id']}/wishlist",
            headers=interesado.headers,
            json={"juego_id": juego["id"]},
        ),
        201,
    )

    assert_status(
        client.delete(
            f"/api/juegos/{juego['id']}",
            headers=otro_dev.headers,
            params={"desarrollador_id": otro_dev["desarrollador_id"]},
        ),
        400,
    )
    assert_status(
        client.delete(
            f"/api/juegos/{juego['id']}",
            headers=propietario.headers,
            params={"desarrollador_id": propietario["desarrollador_id"]},
        ),
        204,
    )

    assert_status(client.get(f"/api/juegos/{juego['id']}"), 400)
    assert assert_status(client.get(f"/api/usuarios/{comprador['id']}/biblioteca"), 200) == []
    assert assert_status(client.get(f"/api/usuarios/{comprador['id']}/logros"), 200) == []
    assert assert_status(
        client.get(
            f"/api/usuarios/{interesado['id']}/wishlist", headers=interesado.headers
        ),
        200,
    ) == []
    assert not (tmp_path / "games" / str(juego["id"])).exists()


def test_recarga_wishlist_compra_biblioteca_y_estadisticas(client: TestClient):
    usuario = registrar(client, "comprador")
    desarrollador = crear_desarrollador(client)
    juego = publicar_juego(client, desarrollador["id"], "Compra feliz", precio=250)

    assert_status(
        client.post(
            f"/api/usuarios/{usuario['id']}/comprar/{juego['id']}",
            headers=usuario.headers,
        ),
        400,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{usuario['id']}/recargar",
            headers=usuario.headers,
            json={"monto": 99},
        ),
        422,
    )
    recarga = assert_status(
        client.post(
            f"/api/usuarios/{usuario['id']}/recargar",
            headers=usuario.headers,
            json={"monto": 500},
        ),
        200,
    )
    assert recarga["monto"] == 500
    assert len(
        assert_status(
            client.get(f"/api/usuarios/{usuario['id']}/recargas", headers=usuario.headers),
            200,
        )
    ) == 1

    wishlist_url = f"/api/usuarios/{usuario['id']}/wishlist"
    assert_status(
        client.post(wishlist_url, headers=usuario.headers, json={"juego_id": juego["id"]}),
        201,
    )
    assert_status(
        client.post(wishlist_url, headers=usuario.headers, json={"juego_id": juego["id"]}),
        400,
    )
    assert_status(client.delete(f"{wishlist_url}/{juego['id']}", headers=usuario.headers), 204)
    assert assert_status(client.get(wishlist_url, headers=usuario.headers), 200) == []
    assert_status(
        client.post(wishlist_url, headers=usuario.headers, json={"juego_id": juego["id"]}),
        201,
    )

    compra = assert_status(
        client.post(
            f"/api/usuarios/{usuario['id']}/comprar/{juego['id']}",
            headers=usuario.headers,
        ),
        201,
    )
    assert compra["precio_pagado"] == 250
    assert assert_status(client.get(wishlist_url, headers=usuario.headers), 200) == []
    assert_status(
        client.post(
            f"/api/usuarios/{usuario['id']}/comprar/{juego['id']}",
            headers=usuario.headers,
        ),
        400,
    )
    assert_status(
        client.post(wishlist_url, headers=usuario.headers, json={"juego_id": juego["id"]}),
        400,
    )

    biblioteca = assert_status(client.get(f"/api/usuarios/{usuario['id']}/biblioteca"), 200)
    assert biblioteca[0]["juego"]["id"] == juego["id"]
    assert biblioteca[0]["precio_pagado"] == 250
    assert (
        assert_status(
            client.get(f"/api/usuarios/{usuario['id']}/biblioteca?genero=Terror"), 200
        )
        == []
    )
    actual = assert_status(client.get(f"/api/usuarios/{usuario['id']}"), 200)
    assert actual["saldo"] == 250
    stats = assert_status(client.get(f"/api/usuarios/{usuario['id']}/estadisticas"), 200)
    assert stats["total_gastado"] == 250
    assert stats["cantidad_juegos"] == 1


def test_resena_y_logros_solo_para_juego_comprado(client: TestClient):
    propietario = registrar(client, "propietario")
    ajeno = registrar(client, "ajeno")
    desarrollador = crear_desarrollador(client, "Logros SA")
    juego = publicar_juego(client, desarrollador["id"], "Con logros", precio=0)

    resenas_url = f"/api/juegos/{juego['id']}/resenas"
    assert_status(
        client.post(
            resenas_url,
            headers=propietario.headers,
            json={"usuario_id": propietario["id"], "recomienda": True, "texto": "Antes"},
        ),
        400,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{propietario['id']}/comprar/{juego['id']}",
            headers=propietario.headers,
        ),
        201,
    )
    resena = assert_status(
        client.post(
            resenas_url,
            headers=propietario.headers,
            json={"usuario_id": propietario["id"], "recomienda": True, "texto": "Bien"},
        ),
        201,
    )
    editada = assert_status(
        client.post(
            resenas_url,
            headers=propietario.headers,
            json={"usuario_id": propietario["id"], "recomienda": False, "texto": "Editada"},
        ),
        201,
    )
    assert editada["id"] == resena["id"]
    assert len(assert_status(client.get(resenas_url), 200)) == 1

    logros_url = f"/api/juegos/{juego['id']}/logros"
    assert_status(
        client.post(
            logros_url,
            headers=juego.headers,
            json={"nombre": "Roto", "descripcion": "", "puntos": 101},
        ),
        422,
    )
    logro = assert_status(
        client.post(
            logros_url,
            headers=juego.headers,
            json={"nombre": "  Primer paso  ", "descripcion": "Empezar", "puntos": 10},
        ),
        201,
    )
    assert logro["nombre"] == "Primer paso"
    assert_status(
        client.post(
            logros_url,
            headers=juego.headers,
            json={"nombre": "PRIMER PASO", "descripcion": "Duplicado", "puntos": 10},
        ),
        400,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{ajeno['id']}/logros/{logro['id']}", headers=ajeno.headers
        ),
        400,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{propietario['id']}/logros/{logro['id']}",
            headers=propietario.headers,
        ),
        201,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{propietario['id']}/logros/{logro['id']}",
            headers=propietario.headers,
        ),
        400,
    )
    stats = assert_status(client.get(f"/api/usuarios/{propietario['id']}/estadisticas"), 200)
    assert stats["logros_desbloqueados"] == 1
    assert stats["puntos_totales"] == 10
    assert stats["top_completados"][0]["porcentaje"] == 100


def test_logros_se_desbloquean_automaticamente_por_progreso(client: TestClient):
    jugador = registrar(client, "progreso_auto")
    ajeno = registrar(client, "progreso_ajeno")
    desarrollador = crear_desarrollador(client, "Métricas SA")
    juego = publicar_juego(client, desarrollador["id"], "Juego medible", precio=0)
    logros_url = f"/api/juegos/{juego['id']}/logros"

    logro_cinco = assert_status(
        client.post(
            logros_url,
            headers=juego.headers,
            json={
                "nombre": "Cinco puntos",
                "descripcion": "Alcanzá 5 puntos.",
                "puntos": 10,
                "requisito_evento": "puntaje",
                "requisito_valor": 5,
            },
        ),
        201,
    )
    logro_diez = assert_status(
        client.post(
            logros_url,
            headers=juego.headers,
            json={
                "nombre": "Diez puntos",
                "descripcion": "Alcanzá 10 puntos.",
                "puntos": 20,
                "requisito_evento": "puntaje",
                "requisito_valor": 10,
            },
        ),
        201,
    )
    assert_status(
        client.post(
            logros_url,
            headers=juego.headers,
            json={
                "nombre": "Requisito incompleto",
                "descripcion": "",
                "puntos": 5,
                "requisito_evento": "puntaje",
            },
        ),
        422,
    )

    progreso_url = f"/api/usuarios/{jugador['id']}/juegos/{juego['id']}/progreso"
    assert_status(
        client.post(
            progreso_url,
            headers=jugador.headers,
            json={"evento": "puntaje", "valor": 4},
        ),
        400,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{jugador['id']}/comprar/{juego['id']}",
            headers=jugador.headers,
        ),
        201,
    )

    assert assert_status(
        client.post(
            progreso_url,
            headers=jugador.headers,
            json={"evento": "puntaje", "valor": 4},
        ),
        200,
    ) == []
    primero = assert_status(
        client.post(
            progreso_url,
            headers=jugador.headers,
            json={"evento": "puntaje", "valor": 5},
        ),
        200,
    )
    assert [item["logro_id"] for item in primero] == [logro_cinco["id"]]
    segundo = assert_status(
        client.post(
            progreso_url,
            headers=jugador.headers,
            json={"evento": "puntaje", "valor": 10},
        ),
        200,
    )
    assert [item["logro_id"] for item in segundo] == [logro_diez["id"]]
    assert assert_status(
        client.post(
            progreso_url,
            headers=jugador.headers,
            json={"evento": "puntaje", "valor": 20},
        ),
        200,
    ) == []

    ajeno_url = f"/api/usuarios/{ajeno['id']}/juegos/{juego['id']}/progreso"
    assert_status(
        client.post(
            ajeno_url,
            headers=ajeno.headers,
            json={"evento": "puntaje", "valor": 20},
        ),
        400,
    )


def test_desarrollador_desbloquea_logros_de_su_propio_juego_sin_comprarlo(
    client: TestClient,
):
    desarrollador = registrar(
        client,
        "logro_juego_propio",
        rol="admin",
        estudio="Logros Propios",
    )
    ajeno = registrar(client, "logro_juego_ajeno")
    juego = publicar_juego(
        client,
        desarrollador["desarrollador_id"],
        "Buscaminas de prueba",
        precio=0,
    )
    logro = assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/logros",
            headers=juego.headers,
            json={
                "nombre": "Primera victoria",
                "descripcion": "Ganá una partida.",
                "puntos": 10,
                "requisito_evento": "partidas-ganadas",
                "requisito_valor": 1,
            },
        ),
        201,
    )
    assert logro["requisito_evento"] == "victorias"

    desbloqueados = assert_status(
        client.post(
            f"/api/usuarios/{desarrollador['id']}/juegos/{juego['id']}/progreso",
            headers=desarrollador.headers,
            json={"evento": "partidas-ganadas", "valor": 1},
        ),
        200,
    )
    assert [item["logro_id"] for item in desbloqueados] == [logro["id"]]
    assert_status(
        client.post(
            f"/api/usuarios/{ajeno['id']}/juegos/{juego['id']}/progreso",
            headers=ajeno.headers,
            json={"evento": "victorias", "valor": 1},
        ),
        400,
    )


def test_amistad_bidireccional_sin_duplicados(client: TestClient):
    uno = registrar(client, "amigo_uno")
    dos = registrar(client, "amigo_dos")
    assert_status(
        client.post(
            f"/api/usuarios/{uno['id']}/amigos",
            headers=uno.headers,
            json={"amigo_id": uno["id"]},
        ),
        400,
    )
    assert_status(
        client.post(
            f"/api/usuarios/{uno['id']}/amigos",
            headers=uno.headers,
            json={"amigo_id": dos["id"]},
        ),
        201,
    )
    assert [u["id"] for u in assert_status(client.get(f"/api/usuarios/{uno['id']}/amigos"), 200)] == [
        dos["id"]
    ]
    assert [u["id"] for u in assert_status(client.get(f"/api/usuarios/{dos['id']}/amigos"), 200)] == [
        uno["id"]
    ]
    assert_status(
        client.post(
            f"/api/usuarios/{dos['id']}/amigos",
            headers=dos.headers,
            json={"amigo_id": uno["id"]},
        ),
        400,
    )
    assert_status(
        client.delete(
            f"/api/usuarios/{dos['id']}/amigos/{uno['id']}", headers=dos.headers
        ),
        204,
    )
    assert assert_status(client.get(f"/api/usuarios/{uno['id']}/amigos"), 200) == []


def test_solicitudes_de_amistad_se_pueden_aceptar_y_rechazar(client: TestClient):
    uno = registrar(client, "solicitud_uno")
    dos = registrar(client, "solicitud_dos")
    tres = registrar(client, "solicitud_tres")

    solicitud = assert_status(
        client.post(
            "/api/solicitudes",
            headers=uno.headers,
            json={"de": uno["id"], "para": dos["id"]},
        ),
        201,
    )
    assert_status(
        client.post(
            "/api/solicitudes",
            headers=dos.headers,
            json={"de": dos["id"], "para": uno["id"]},
        ),
        400,
    )
    recibidas = assert_status(
        client.get(
            f"/api/usuarios/{dos['id']}/solicitudes/recibidas", headers=dos.headers
        ),
        200,
    )
    assert [item["id"] for item in recibidas] == [solicitud["id"]]
    assert_status(
        client.put(
            f"/api/solicitudes/{solicitud['id']}",
            headers=dos.headers,
            json={"estado": "aceptada"},
        ),
        200,
    )
    assert [
        usuario["id"]
        for usuario in assert_status(
            client.get(f"/api/usuarios/{uno['id']}/amigos"), 200
        )
    ] == [dos["id"]]

    rechazada = assert_status(
        client.post(
            "/api/solicitudes",
            headers=tres.headers,
            json={"de": tres["id"], "para": uno["id"]},
        ),
        201,
    )
    assert_status(
        client.put(
            f"/api/solicitudes/{rechazada['id']}",
            headers=uno.headers,
            json={"estado": "rechazada"},
        ),
        200,
    )
    assert assert_status(
        client.get(
            f"/api/usuarios/{uno['id']}/solicitudes/recibidas", headers=uno.headers
        ),
        200,
    ) == []


def test_acciones_privadas_validan_la_identidad_y_propiedad(client: TestClient):
    uno = registrar(client, "seguridad_uno")
    dos = registrar(client, "seguridad_dos")
    dev_uno = registrar(client, "seguridad_dev_uno", rol="admin", estudio="Seguro Uno")
    dev_dos = registrar(client, "seguridad_dev_dos", rol="admin", estudio="Seguro Dos")
    juego_dos = publicar_juego(
        client,
        dev_dos["desarrollador_id"],
        "Juego protegido",
        precio=0,
    )

    assert_status(client.get("/api/usuarios/me"), 401)
    sesion = assert_status(client.get("/api/usuarios/me", headers=uno.headers), 200)
    assert sesion["id"] == uno["id"]

    assert_status(client.post(f"/api/usuarios/{uno['id']}/recargar", json={"monto": 100}), 401)
    assert_status(
        client.post(
            f"/api/usuarios/{dos['id']}/recargar",
            headers=uno.headers,
            json={"monto": 100},
        ),
        403,
    )
    assert_status(
        client.put(
            f"/api/juegos/{juego_dos['id']}",
            headers=dev_uno.headers,
            json={"desarrollador_id": dev_dos["desarrollador_id"], "precio": 1},
        ),
        403,
    )

    solicitud = assert_status(
        client.post(
            "/api/solicitudes",
            headers=uno.headers,
            json={"de": uno["id"], "para": dos["id"]},
        ),
        201,
    )
    assert_status(
        client.put(
            f"/api/solicitudes/{solicitud['id']}",
            headers=uno.headers,
            json={"estado": "aceptada"},
        ),
        403,
    )


def test_rankings_incluyen_ventas_y_exigen_cinco_resenas(client: TestClient):
    desarrollador = crear_desarrollador(client, "Ranking")
    portada = "data:image/png;base64,portada-del-ranking"
    juego = publicar_juego(
        client,
        desarrollador["id"],
        "Favorito",
        precio=0,
        genero="RPG",
        imagen=portada,
    )

    for indice in range(5):
        usuario = registrar(client, f"ranking_{indice}")
        assert_status(
            client.post(
                f"/api/usuarios/{usuario['id']}/comprar/{juego['id']}",
                headers=usuario.headers,
            ),
            201,
        )
        assert_status(
            client.post(
                f"/api/juegos/{juego['id']}/resenas",
                headers=usuario.headers,
                json={
                    "usuario_id": usuario["id"],
                    "recomienda": indice != 0,
                    "texto": f"Reseña {indice}",
                },
            ),
            201,
        )
        if indice == 3:
            assert assert_status(
                client.get("/api/juegos/mejor-valorados?genero=RPG"), 200
            ) == []

    ventas = assert_status(client.get("/api/juegos/top-ventas?genero=RPG"), 200)
    assert ventas[0]["id"] == juego["id"]
    assert ventas[0]["compras"] == 5
    assert ventas[0]["imagen"] == portada
    valorados = assert_status(client.get("/api/juegos/mejor-valorados?genero=RPG"), 200)
    assert valorados[0]["id"] == juego["id"]
    assert valorados[0]["total_resenas"] == 5
    assert valorados[0]["porcentaje_positivas"] == 80
    assert valorados[0]["imagen"] == portada


def test_superadmin_precargado_administra_usuarios_y_todos_los_juegos(
    client: TestClient,
    tmp_path,
    monkeypatch,
):
    monkeypatch.setattr(JuegoService, "STORAGE_ROOT", tmp_path)
    acceso = assert_status(
        client.post(
            "/api/usuarios/login",
            json={"email": "admin@gmail.com", "password": "123456"},
        ),
        200,
    )
    assert acceso["usuario"]["nickname"] == "admin"
    assert acceso["usuario"]["rol"] == "superadmin"
    headers = {"Authorization": f"Bearer {acceso['access_token']}"}

    jugador = registrar(client, "administrado")
    desarrollador = registrar(
        client,
        "dev_administrado",
        rol="admin",
        estudio="Estudio administrado",
    )
    juego = publicar_juego(
        client,
        desarrollador["desarrollador_id"],
        "Juego administrado",
        precio=150,
    )

    assert_status(
        client.put(
            f"/api/administracion/usuarios/{jugador['id']}",
            headers=headers,
            json={
                "email": "editado@example.com",
                "nickname": "nick_editado",
                "saldo": 900,
                "password": "nueva123",
            },
        ),
        200,
    )
    editado = assert_status(client.get(f"/api/usuarios/{jugador['id']}"), 200)
    assert editado["email"] == "editado@example.com"
    assert editado["nickname"] == "nick_editado"
    assert editado["saldo"] == 900
    assert_status(
        client.post(
            "/api/usuarios/login",
            json={"email": "editado@example.com", "password": "nueva123"},
        ),
        200,
    )

    juego_editado = assert_status(
        client.put(
            f"/api/administracion/juegos/{juego['id']}",
            headers=headers,
            json={
                "desarrollador_id": desarrollador["desarrollador_id"],
                "titulo": "Juego globalmente editado",
                "precio": 25,
                "genero": "Estrategia",
            },
        ),
        200,
    )
    assert juego_editado["titulo"] == "Juego globalmente editado"
    assert juego_editado["precio"] == 25

    con_archivo = assert_status(
        client.post(
            f"/api/administracion/juegos/{juego['id']}/archivo",
            headers=headers,
            files={"archivo": ("admin.html", b"<h1>Version admin</h1>", "text/html")},
        ),
        200,
    )
    assert con_archivo["es_jugable"] is True
    assert (tmp_path / "games" / str(juego["id"]) / "index.html").read_bytes() == (
        b"<h1>Version admin</h1>"
    )

    logro_admin = assert_status(
        client.post(
            f"/api/administracion/juegos/{juego['id']}/logros",
            headers=headers,
            json={
                "nombre": "Logro global",
                "descripcion": "Creado por administración",
                "puntos": 25,
                "requisito_evento": "victorias",
                "requisito_valor": 1,
            },
        ),
        201,
    )
    assert logro_admin["juego_id"] == juego["id"]

    assert_status(
        client.delete(
            f"/api/administracion/usuarios/{desarrollador['id']}",
            headers=headers,
        ),
        204,
    )
    assert_status(client.get(f"/api/usuarios/{desarrollador['id']}"), 400)
    assert_status(client.get(f"/api/juegos/{juego['id']}"), 400)

    assert_status(
        client.delete(
            f"/api/administracion/usuarios/{acceso['usuario']['id']}",
            headers=headers,
        ),
        400,
    )


def test_administracion_rechaza_sesiones_no_autorizadas(client: TestClient):
    jugador = registrar(client, "sin_permisos")
    sin_token = client.delete(f"/api/administracion/usuarios/{jugador['id']}")
    assert_status(sin_token, 401)
    assert_status(
        client.post(
            "/api/administracion/juegos/1/logros",
            json={
                "nombre": "Sin permiso",
                "descripcion": "",
                "puntos": 10,
                "requisito_evento": "puntaje",
                "requisito_valor": 1,
            },
        ),
        401,
    )

    acceso_jugador = assert_status(
        client.post(
            "/api/usuarios/login",
            json={"email": "sin_permisos@example.com", "password": "secreto123"},
        ),
        200,
    )
    sin_rol = client.delete(
        f"/api/administracion/usuarios/{jugador['id']}",
        headers={"Authorization": f"Bearer {acceso_jugador['access_token']}"},
    )
    assert_status(sin_rol, 403)
