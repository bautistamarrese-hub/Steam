from passlib.context import CryptContext

# PBKDF2 avoids the passlib 1.7 incompatibility with recent bcrypt releases.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except (TypeError, ValueError):
        # Compatibilidad con cuentas antiguas que guardaban un marcador sin hash.
        return False
