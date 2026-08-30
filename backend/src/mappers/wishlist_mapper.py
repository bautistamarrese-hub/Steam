from src.db.models.wishlist_model import Wishlist
from src.dtos.wishlist_dto import WishlistResponseDTO

def to_wishlist_response(wishlist: Wishlist) -> WishlistResponseDTO:
    """Convierte un Model SQLAlchemy en un DTO de respuesta (sin campos sensibles)."""
    return WishlistResponseDTO.model_validate(wishlist)
