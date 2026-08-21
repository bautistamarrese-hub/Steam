from sqlalchemy.orm import Session

from backend.src.dtos.compra_dto import CreatePasajeroDTO, PasajeroResponseDTO
from src.mappers.pasajero_mapper import to_pasajero_response
from src.repositories.pasajero_repository import PasajeroRepository


class PasajeroService:
    def __init__(self, db: Session):
        self.repo = PasajeroRepository(db)

    def create(self, dto: CreatePasajeroDTO) -> PasajeroResponseDTO:
        pasajero = self.repo.create(
            nombre=dto.nombre,
            email=dto.email,
            telefono=dto.telefono
        )
        return to_pasajero_response(pasajero)
    
    def get_by_id(self, pasajero_id: int) -> PasajeroResponseDTO | None:
        pasajero = self.repo.get_by_id(pasajero_id)
        if pasajero is None:
            return None
        return to_pasajero_response(pasajero)
    
    def update(self, pasajero_id: int, dto: CreatePasajeroDTO) -> PasajeroResponseDTO | None:
        pasajero = self.repo.get_by_id(pasajero_id)
        if pasajero is None:
            return None
        
        pasajero.nombre = dto.nombre or pasajero.nombre
        pasajero.email = dto.email or pasajero.email
        pasajero.telefono = dto.telefono or pasajero.telefono

        updated = self.repo.update(pasajero)
        return to_pasajero_response(updated)
    
    def delete(self, pasajero_id: int) -> bool:
        pasajero = self.repo.get_by_id(pasajero_id)
        if pasajero is None:
            return False
        
        self.repo.delete(pasajero)
        return True
