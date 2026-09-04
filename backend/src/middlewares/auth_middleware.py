from fastapi import Depends, Header
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.registroUsuario_model import Usuario
from src.utils.errors import ForbiddenError, UnauthorizedError
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


def require_same_user(expected_user_id: int, current_user: Usuario) -> None:
    """Impide que un token opere sobre recursos privados de otra cuenta."""
    if current_user.id != expected_user_id:
        raise ForbiddenError("No tenés permiso para operar sobre esta cuenta.")


def require_developer(current_user: Usuario, developer_id: int) -> None:
    """Valida que la cuenta autenticada sea la dueña del estudio indicado."""
    if current_user.rol != "admin" or current_user.desarrollador_id != developer_id:
        raise ForbiddenError("Esta operación requiere la cuenta desarrolladora propietaria.")


def require_user_features(current_user: Usuario) -> None:
    if current_user.rol == "superadmin":
        raise ForbiddenError(
            "La cuenta administradora principal solo puede operar desde el panel de administracion."
        )


def get_feature_user(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    require_user_features(current_user)
    return current_user


def require_superadmin(current_user: Usuario) -> None:
    if current_user.rol != "superadmin":
        raise ForbiddenError("Esta operación requiere la cuenta administradora principal.")
