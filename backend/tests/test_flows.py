from fastapi.testclient import TestClient

from src.services.desarrolladorJuego_service import JuegoService
from src.services.registroUsuario_service import UsuarioService


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
    return assert_status(client.post("/api/usuarios/", json=body), 201)


def crear_desarrollador(client: TestClient, nombre: str = "Estudio"):
    return assert_status(
        client.post("/api/desarrolladores/", json={"nombre": nombre, "pais": "Argentina"}),
        201,
    )


def publicar_juego(
    client: TestClient,
    desarrollador_id: int,
    titulo: str,
    *,
    precio: float = 250,
    genero: str = "Indie",
):
    return assert_status(
        client.post(
            "/api/juegos/",
            json={
                "titulo": titulo,
                "desarrollador_id": desarrollador_id,
                "precio": precio,
                "fecha_lanzamiento": "2026-08-31",
                "genero": genero,
            },
        ),
        201,
    )


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
            files={"archivo": ("index.html", b"<h1>Juego listo</h1>", "text/html")},
        ),
        200,
    )
    assert publicado["archivo_nombre"] == "index.html"
    assert publicado["archivo_url"].endswith(f"/{juego['id']}/index.html")
    assert publicado["es_jugable"] is True
    assert (tmp_path / "games" / str(juego["id"]) / "index.html").is_file()

    assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/archivo",
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
            files={"archivo": ("nuevo.html", b"<h1>Nueva version</h1>", "text/html")},
        ),
        200,
    )
    assert reemplazado["archivo_nombre"] == "nuevo.html"
    assert (tmp_path / "games" / str(juego["id"]) / "index.html").read_bytes() == (
        b"<h1>Nueva version</h1>"
    )

    logro = assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/logros",
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
            files={"archivo": ("avatar.png", b"imagen-de-prueba", "image/png")},
        ),
        200,
    )
    assert actualizado["avatar"].endswith(f"/{usuario['id']}/avatar.png")
    assert (tmp_path / "avatars" / str(usuario["id"]) / "avatar.png").is_file()

    dev = registrar(client, "editor", rol="admin", estudio="Editor Studio")
    juego = assert_status(
        client.post(
            "/api/juegos/",
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
            files={"archivo": ("index.html", b"<h1>Temporal</h1>", "text/html")},
        ),
        200,
    )
    logro = assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/logros",
            json={"nombre": "Temporal", "descripcion": "Temporal", "puntos": 10},
        ),
        201,
    )
    assert_status(
        client.post(f"/api/usuarios/{comprador['id']}/recargar", json={"monto": 500}),
        200,
    )
    assert_status(client.post(f"/api/usuarios/{comprador['id']}/comprar/{juego['id']}"), 201)
    assert_status(
        client.post(
            f"/api/juegos/{juego['id']}/resenas",
            json={"usuario_id": comprador["id"], "recomienda": True, "texto": "Bien"},
        ),
        201,
    )
    assert_status(client.post(f"/api/usuarios/{comprador['id']}/logros/{logro['id']}"), 201)
    assert_status(
        client.post(
            f"/api/usuarios/{interesado['id']}/wishlist",
            json={"juego_id": juego["id"]},
        ),
        201,
    )

    assert_status(
        client.delete(
            f"/api/juegos/{juego['id']}",
            params={"desarrollador_id": otro_dev["desarrollador_id"]},
        ),
        400,
    )
    assert_status(
        client.delete(
            f"/api/juegos/{juego['id']}",
            params={"desarrollador_id": propietario["desarrollador_id"]},
        ),
        204,
    )

    assert_status(client.get(f"/api/juegos/{juego['id']}"), 400)
    assert assert_status(client.get(f"/api/usuarios/{comprador['id']}/biblioteca"), 200) == []
    assert assert_status(client.get(f"/api/usuarios/{comprador['id']}/logros"), 200) == []
    assert assert_status(client.get(f"/api/usuarios/{interesado['id']}/wishlist"), 200) == []
    assert not (tmp_path / "games" / str(juego["id"])).exists()


def test_recarga_wishlist_compra_biblioteca_y_estadisticas(client: TestClient):
    usuario = registrar(client, "comprador")
    desarrollador = crear_desarrollador(client)
    juego = publicar_juego(client, desarrollador["id"], "Compra feliz", precio=250)

    assert_status(client.post(f"/api/usuarios/{usuario['id']}/comprar/{juego['id']}"), 400)
    assert_status(client.post(f"/api/usuarios/{usuario['id']}/recargar", json={"monto": 99}), 422)
    recarga = assert_status(
        client.post(f"/api/usuarios/{usuario['id']}/recargar", json={"monto": 500}), 200
    )
    assert recarga["monto"] == 500
    assert len(assert_status(client.get(f"/api/usuarios/{usuario['id']}/recargas"), 200)) == 1

    wishlist_url = f"/api/usuarios/{usuario['id']}/wishlist"
    assert_status(client.post(wishlist_url, json={"juego_id": juego["id"]}), 201)
    assert_status(client.post(wishlist_url, json={"juego_id": juego["id"]}), 400)
    assert_status(client.delete(f"{wishlist_url}/{juego['id']}"), 204)
    assert assert_status(client.get(wishlist_url), 200) == []
    assert_status(client.post(wishlist_url, json={"juego_id": juego["id"]}), 201)

    compra = assert_status(
        client.post(f"/api/usuarios/{usuario['id']}/comprar/{juego['id']}"), 201
    )
    assert compra["precio_pagado"] == 250
    assert assert_status(client.get(wishlist_url), 200) == []
    assert_status(client.post(f"/api/usuarios/{usuario['id']}/comprar/{juego['id']}"), 400)
    assert_status(client.post(wishlist_url, json={"juego_id": juego["id"]}), 400)

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
            json={"usuario_id": propietario["id"], "recomienda": True, "texto": "Antes"},
        ),
        400,
    )
    assert_status(client.post(f"/api/usuarios/{propietario['id']}/comprar/{juego['id']}"), 201)
    resena = assert_status(
        client.post(
            resenas_url,
            json={"usuario_id": propietario["id"], "recomienda": True, "texto": "Bien"},
        ),
        201,
    )
    editada = assert_status(
        client.post(
            resenas_url,
            json={"usuario_id": propietario["id"], "recomienda": False, "texto": "Editada"},
        ),
        201,
    )
    assert editada["id"] == resena["id"]
    assert len(assert_status(client.get(resenas_url), 200)) == 1

    logros_url = f"/api/juegos/{juego['id']}/logros"
    assert_status(
        client.post(logros_url, json={"nombre": "Roto", "descripcion": "", "puntos": 101}),
        422,
    )
    logro = assert_status(
        client.post(
            logros_url,
            json={"nombre": "  Primer paso  ", "descripcion": "Empezar", "puntos": 10},
        ),
        201,
    )
    assert logro["nombre"] == "Primer paso"
    assert_status(
        client.post(
            logros_url,
            json={"nombre": "PRIMER PASO", "descripcion": "Duplicado", "puntos": 10},
        ),
        400,
    )
    assert_status(client.post(f"/api/usuarios/{ajeno['id']}/logros/{logro['id']}"), 400)
    assert_status(
        client.post(f"/api/usuarios/{propietario['id']}/logros/{logro['id']}"), 201
    )
    assert_status(client.post(f"/api/usuarios/{propietario['id']}/logros/{logro['id']}"), 400)
    stats = assert_status(client.get(f"/api/usuarios/{propietario['id']}/estadisticas"), 200)
    assert stats["logros_desbloqueados"] == 1
    assert stats["puntos_totales"] == 10
    assert stats["top_completados"][0]["porcentaje"] == 100


def test_amistad_bidireccional_sin_duplicados(client: TestClient):
    uno = registrar(client, "amigo_uno")
    dos = registrar(client, "amigo_dos")
    assert_status(
        client.post(f"/api/usuarios/{uno['id']}/amigos", json={"amigo_id": uno["id"]}),
        400,
    )
    assert_status(
        client.post(f"/api/usuarios/{uno['id']}/amigos", json={"amigo_id": dos["id"]}),
        201,
    )
    assert [u["id"] for u in assert_status(client.get(f"/api/usuarios/{uno['id']}/amigos"), 200)] == [
        dos["id"]
    ]
    assert [u["id"] for u in assert_status(client.get(f"/api/usuarios/{dos['id']}/amigos"), 200)] == [
        uno["id"]
    ]
    assert_status(
        client.post(f"/api/usuarios/{dos['id']}/amigos", json={"amigo_id": uno["id"]}),
        400,
    )
    assert_status(client.delete(f"/api/usuarios/{dos['id']}/amigos/{uno['id']}"), 204)
    assert assert_status(client.get(f"/api/usuarios/{uno['id']}/amigos"), 200) == []


def test_solicitudes_de_amistad_se_pueden_aceptar_y_rechazar(client: TestClient):
    uno = registrar(client, "solicitud_uno")
    dos = registrar(client, "solicitud_dos")
    tres = registrar(client, "solicitud_tres")

    solicitud = assert_status(
        client.post(
            "/api/solicitudes",
            json={"de": uno["id"], "para": dos["id"]},
        ),
        201,
    )
    assert_status(
        client.post(
            "/api/solicitudes",
            json={"de": dos["id"], "para": uno["id"]},
        ),
        400,
    )
    recibidas = assert_status(
        client.get(f"/api/usuarios/{dos['id']}/solicitudes/recibidas"), 200
    )
    assert [item["id"] for item in recibidas] == [solicitud["id"]]
    assert_status(
        client.put(
            f"/api/solicitudes/{solicitud['id']}",
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
            json={"de": tres["id"], "para": uno["id"]},
        ),
        201,
    )
    assert_status(
        client.put(
            f"/api/solicitudes/{rechazada['id']}",
            json={"estado": "rechazada"},
        ),
        200,
    )
    assert assert_status(
        client.get(f"/api/usuarios/{uno['id']}/solicitudes/recibidas"), 200
    ) == []


def test_rankings_incluyen_ventas_y_exigen_veinte_resenas(client: TestClient):
    desarrollador = crear_desarrollador(client, "Ranking")
    juego = publicar_juego(client, desarrollador["id"], "Favorito", precio=0, genero="RPG")

    for indice in range(20):
        usuario = registrar(client, f"ranking_{indice}")
        assert_status(client.post(f"/api/usuarios/{usuario['id']}/comprar/{juego['id']}"), 201)
        assert_status(
            client.post(
                f"/api/juegos/{juego['id']}/resenas",
                json={
                    "usuario_id": usuario["id"],
                    "recomienda": indice != 0,
                    "texto": f"Reseña {indice}",
                },
            ),
            201,
        )

    ventas = assert_status(client.get("/api/juegos/top-ventas?genero=RPG"), 200)
    assert ventas[0]["id"] == juego["id"]
    assert ventas[0]["compras"] == 20
    valorados = assert_status(client.get("/api/juegos/mejor-valorados?genero=RPG"), 200)
    assert valorados[0]["id"] == juego["id"]
    assert valorados[0]["total_resenas"] == 20
    assert valorados[0]["porcentaje_positivas"] == 95
