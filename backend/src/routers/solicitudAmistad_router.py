from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from src.db.connection import get_db
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
def enviar_solicitud(payload: CreateSolicitudAmistadSchema, db: Session = Depends(get_db)):
    return SolicitudAmistadService(db).enviar(payload)


@router.put("/solicitudes/{id}", response_model=GetSolicitudAmistadSchema)
def responder_solicitud(
    id: int, payload: UpdateSolicitudAmistadSchema, db: Session = Depends(get_db)
):
    return SolicitudAmistadService(db).responder(id, payload.estado)


@router.delete("/solicitudes/{id}", status_code=status.HTTP_204_NO_CONTENT)
def cancelar_solicitud(id: int, db: Session = Depends(get_db)):
    SolicitudAmistadService(db).cancelar(id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
