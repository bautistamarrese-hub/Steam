from pathlib import Path


JUEGOS_DIR = Path(__file__).resolve().parents[1] / "juegos"

METRICAS_ESPERADAS = {
    "2048.html": {"puntaje", "victorias", "partidas-ganadas"},
    "ajedrez.html": {"victorias", "partidas-ganadas"},
    "angry birds.html": {
        "puntaje",
        "victorias",
        "nivel_alcanzado",
        "enemigos_derrotados",
        "partidas-ganadas",
    },
    "Balatro.html": {"puntaje", "victorias", "nivel_alcanzado", "partidas-ganadas"},
    "buscaminas.html": {"victorias", "partidas-ganadas"},
    "DOOM.html": {"victorias", "enemigos_derrotados", "partidas-ganadas"},
    "DVADI.html": {"puntaje", "victorias", "partidas-ganadas"},
    "Fortnite.html": {"victorias", "enemigos_derrotados", "partidas-ganadas"},
    "Mario Bros.html": {
        "puntaje",
        "victorias",
        "nivel_alcanzado",
        "enemigos_derrotados",
        "partidas-ganadas",
    },
    "PAC-MAN.html": {"puntaje", "victorias", "enemigos_derrotados", "partidas-ganadas"},
    "PONG.html": {"puntaje", "victorias", "partidas-ganadas"},
    "Rompecabezas.html": {"victorias", "nivel_alcanzado", "partidas-ganadas"},
}


def test_todos_los_juegos_html_reportan_sus_metricas_de_logros():
    juegos = {archivo.name for archivo in JUEGOS_DIR.glob("*.html")}
    assert juegos == set(METRICAS_ESPERADAS)

    for nombre, metricas in METRICAS_ESPERADAS.items():
        contenido = (JUEGOS_DIR / nombre).read_text(encoding="utf-8")
        assert "steamnt:achievement-progress" in contenido
        for metrica in metricas:
            assert metrica in contenido, f"{nombre} no reporta {metrica}"
