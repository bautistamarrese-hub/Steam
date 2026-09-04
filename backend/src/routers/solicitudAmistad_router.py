from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
from src.db.models.registroUsuario_model import Usuario
from src.middlewares.auth_middleware import get_feature_user
from src.schemas.solicitudAmistad_schema import (
    CreateSolicitudAmistadSchema,
    GetSolicitudAmistadSchema,
    UpdateSolicitudAmistadSchema,
)
from src.services.solicitudAmistad_service import SolicitudAmistadService

router = APIRouter(tags=["solicitudes de amistad"])


@router.post(
    "/solicitudes",
    response_model=GetSolicitudAmistadSchema,
    status_code=status.HTTP_201_CREATED,
)
def enviar_solicitud(
    payload: CreateSolicitudAmistadSchema,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    return SolicitudAmistadService(db).enviar(payload, usuario.id)


@router.put("/solicitudes/{id}", response_model=GetSolicitudAmistadSchema)
def responder_solicitud(
    id: int,
    payload: UpdateSolicitudAmistadSchema,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    return SolicitudAmistadService(db).responder(id, payload.estado, usuario.id)


@router.delete("/solicitudes/{id}", status_code=status.HTTP_204_NO_CONTENT)
def cancelar_solicitud(
    id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_feature_user),
):
    SolicitudAmistadService(db).cancelar(id, usuario.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
