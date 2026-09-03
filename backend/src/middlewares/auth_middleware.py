from fastapi import Depends, Header
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.registroUsuario_model import Usuario
from src.utils.errors import UnauthorizedError
from src.utils.jwt import decode_token


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Usuario:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Missing or malformed Authorization header")

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_token(token)

    user_id = payload.get("sub")
    if user_id is None:
        raise UnauthorizedError("Invalid token payload")

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError) as exc:
        raise UnauthorizedError("Invalid token payload") from exc

    user = db.query(Usuario).filter(Usuario.id == user_id_int).first()
    if user is None:
        raise UnauthorizedError("User no longer exists")

    return user
