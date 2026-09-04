ALIASES_VICTORIAS = frozenset({"victorias", "partidas-ganadas"})


def normalizar_evento_logro(evento: str | None) -> str | None:
    if evento is None:
        return None
    normalizado = evento.strip().lower()
    return "victorias" if normalizado in ALIASES_VICTORIAS else normalizado


def variantes_evento_logro(evento: str) -> tuple[str, ...]:
    normalizado = normalizar_evento_logro(evento)
    if normalizado == "victorias":
        return tuple(ALIASES_VICTORIAS)
    return (normalizado,) if normalizado else ()
