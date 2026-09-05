import shutil
from pathlib import Path
from tempfile import mkdtemp
from urllib.parse import quote
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy import case, desc, func
from sqlalchemy.orm import Session

from src.db.models.comprarJuego_model import Compra
from src.db.models.desbloquearLogro_model import LogroDesbloqueado
from src.db.models.desarrolladorJuego_model import Desarrollador, Juego
from src.db.models.logros_model import Logro
from src.db.models.reseñas_model import Resena
from src.db.models.registroUsuario_model import Usuario
from src.db.models.wishlist_model import Wishlist
from src.utils.logros import normalizar_evento_logro


class JuegoService:
    STORAGE_ROOT = Path(__file__).resolve().parents[2] / "storage"

    def __init__(self, db: Session):
        self.db = db

    def crear(self, payload) -> Desarrollador:
        desarrollador = Desarrollador(nombre=payload.nombre.strip(), pais=payload.pais)
        self.db.add(desarrollador)
        self.db.commit()
        self.db.refresh(desarrollador)
        return desarrollador

    def listar_desarrolladores(self) -> list[Desarrollador]:
        return self.db.query(Desarrollador).order_by(Desarrollador.nombre.asc()).all()

    def obtener_desarrollador(self, desarrollador_id: int) -> Desarrollador:
        desarrollador = self.db.query(Desarrollador).filter(
            Desarrollador.id == desarrollador_id
        ).first()
        if not desarrollador:
            raise ValueError("El desarrollador no existe.")
        return desarrollador

    def publicar(self, payload) -> Juego:
        self.obtener_desarrollador(payload.desarrollador_id)
        if self.db.query(Juego).filter(
            Juego.desarrollador_id == payload.desarrollador_id,
            func.lower(Juego.titulo) == payload.titulo.strip().lower(),
        ).first():
            raise ValueError("El desarrollador ya publicó un juego con ese título.")
        juego = Juego(
            titulo=payload.titulo.strip(),
            desarrollador_id=payload.desarrollador_id,
            precio=round(payload.precio, 2),
            fecha_lanzamiento=payload.fecha_lanzamiento,
            genero=payload.genero,
            descripcion=payload.descripcion,
            resumen=payload.resumen,
            imagen=payload.imagen,
            galeria=payload.galeria,
        )
        self.db.add(juego)
        self.db.commit()
        self.db.refresh(juego)
        return juego

    def obtener_juegos(self, desarrollador_id: int) -> list[Juego]:
        self.obtener_desarrollador(desarrollador_id)
        return self.db.query(Juego).filter(
            Juego.desarrollador_id == desarrollador_id
        ).all()

    def listar_juegos(self, genero: str | None = None, q: str | None = None) -> list[Juego]:
        query = self.db.query(Juego)
        if genero:
            query = query.filter(Juego.genero == genero)
        if q:
            query = query.filter(Juego.titulo.ilike(f"%{q}%"))
        return query.order_by(Juego.id.desc()).all()

    def obtener_juego(self, juego_id: int) -> Juego:
        juego = self.db.query(Juego).filter(Juego.id == juego_id).first()
        if not juego:
            raise ValueError("El juego no existe.")
        return juego

    def actualizar_juego(self, juego_id: int, payload) -> Juego:
        juego = self.obtener_juego(juego_id)
        if juego.desarrollador_id != payload.desarrollador_id:
            raise ValueError("El juego no pertenece a este desarrollador.")

        if payload.titulo is not None:
            titulo = payload.titulo.strip()
            duplicado = self.db.query(Juego).filter(
                Juego.id != juego_id,
                Juego.desarrollador_id == payload.desarrollador_id,
                func.lower(Juego.titulo) == titulo.lower(),
            ).first()
            if duplicado:
                raise ValueError("El desarrollador ya publicó un juego con ese título.")
            juego.titulo = titulo

        for campo in ("precio", "genero", "descripcion", "resumen", "imagen", "galeria"):
            valor = getattr(payload, campo)
            if valor is not None:
                if campo == "precio":
                    valor = round(valor, 2)
                setattr(juego, campo, valor)

        self.db.commit()
        self.db.refresh(juego)
        return juego

    def eliminar_juego(self, juego_id: int, desarrollador_id: int) -> None:
        juego = self.obtener_juego(juego_id)
        if juego.desarrollador_id != desarrollador_id:
            raise ValueError("Solo el desarrollador dueño del juego puede eliminarlo.")

        logro_ids = [
            logro_id
            for (logro_id,) in self.db.query(Logro.id).filter(Logro.juego_id == juego_id).all()
        ]
        if logro_ids:
            self.db.query(LogroDesbloqueado).filter(
                LogroDesbloqueado.logro_id.in_(logro_ids)
            ).delete(synchronize_session=False)
        self.db.query(Logro).filter(Logro.juego_id == juego_id).delete(
            synchronize_session=False
        )
        self.db.query(Resena).filter(Resena.juego_id == juego_id).delete(
            synchronize_session=False
        )
        self.db.query(Wishlist).filter(Wishlist.juego_id == juego_id).delete(
            synchronize_session=False
        )
        self.db.query(Compra).filter(Compra.juego_id == juego_id).delete(
            synchronize_session=False
        )
        self.db.delete(juego)
        self.db.commit()

        shutil.rmtree(self.STORAGE_ROOT / "games" / str(juego_id), ignore_errors=True)

    async def guardar_archivo(self, juego_id: int, archivo: UploadFile) -> Juego:
        """Guarda un juego web y deja una URL segura para ejecutarlo en un iframe.

        Solo se admiten archivos HTML sueltos. Ejecutables de
        escritorio no pueden correrse desde el navegador y no se aceptan para
        evitar publicar binarios que la plataforma no puede jugar.
        """
        juego = self.obtener_juego(juego_id)
        nombre = Path(archivo.filename or "").name
        extension = Path(nombre).suffix.lower()
        if extension != ".html":
            raise ValueError("Solo se permite subir un archivo con extension .html.")

        directorio_juegos = self.STORAGE_ROOT / "games"
        directorio_juegos.mkdir(parents=True, exist_ok=True)
        raiz = directorio_juegos / str(juego_id)
        temporal = Path(mkdtemp(prefix=f".{juego_id}-", dir=directorio_juegos))

        try:
            destino = temporal / "index.html"
            await self._guardar_stream(archivo, destino)
            ruta_inicio = "index.html"
        except ValueError:
            shutil.rmtree(temporal, ignore_errors=True)
            raise
        except OSError as exc:
            shutil.rmtree(temporal, ignore_errors=True)
            raise ValueError("No se pudo procesar el archivo del juego.") from exc
        finally:
            await archivo.close()

        respaldo = directorio_juegos / f".{juego_id}-anterior-{uuid4().hex}"
        try:
            if raiz.exists():
                raiz.rename(respaldo)
            temporal.rename(raiz)
        except OSError as exc:
            shutil.rmtree(temporal, ignore_errors=True)
            if respaldo.exists() and not raiz.exists():
                try:
                    respaldo.rename(raiz)
                except OSError as restore_error:
                    raise ValueError(
                        "No se pudo reemplazar el archivo ni restaurar la versión anterior."
                    ) from restore_error
            raise ValueError("No se pudo reemplazar el archivo del juego.") from exc
        else:
            shutil.rmtree(respaldo, ignore_errors=True)

        juego.archivo_nombre = nombre
        # La ruta física se reutiliza al reemplazar un juego. Una versión en la
        # URL evita que el navegador siga ejecutando el HTML anterior desde caché.
        juego.archivo_url = (
            f"/uploads/games/{juego_id}/{quote(ruta_inicio)}?v={uuid4().hex}"
        )
        juego.es_jugable = True
        self.db.commit()
        self.db.refresh(juego)
        return juego

    @staticmethod
    async def _guardar_stream(archivo: UploadFile, destino: Path) -> None:
        limite = 100 * 1024 * 1024
        total = 0
        with destino.open("wb") as salida:
            while bloque := await archivo.read(1024 * 1024):
                total += len(bloque)
                if total > limite:
                    raise ValueError("El archivo del juego no puede superar los 100 MB.")
                salida.write(bloque)

    def crear_logro(self, juego_id: int, payload) -> Logro:
        self.obtener_juego(juego_id)
        if self.db.query(Logro).filter(
            Logro.juego_id == juego_id,
            func.lower(Logro.nombre) == payload.nombre.strip().lower(),
        ).first():
            raise ValueError("Ya existe un logro con ese nombre para este juego.")
        logro = Logro(
            juego_id=juego_id,
            nombre=payload.nombre.strip(),
            descripcion=payload.descripcion,
            puntos=payload.puntos,
            requisito_evento=normalizar_evento_logro(payload.requisito_evento),
            requisito_valor=payload.requisito_valor,
        )
        self.db.add(logro)
        self.db.commit()
        self.db.refresh(logro)
        return logro

    def obtener_logros(self, juego_id: int) -> list[Logro]:
        self.obtener_juego(juego_id)
        return self.db.query(Logro).filter(Logro.juego_id == juego_id).all()

    def publicar_resena(self, juego_id: int, payload) -> Resena:
        self.obtener_juego(juego_id)
        if not self.db.query(Usuario).filter(Usuario.id == payload.usuario_id).first():
            raise ValueError("El usuario no existe.")
        if not self.db.query(Compra).filter_by(
            usuario_id=payload.usuario_id, juego_id=juego_id
        ).first():
            raise ValueError("Solo se pueden reseñar juegos comprados.")
        resena = self.db.query(Resena).filter_by(
            usuario_id=payload.usuario_id, juego_id=juego_id
        ).first()
        if resena:
            resena.recomienda = payload.recomienda
            resena.texto = payload.texto
        else:
            resena = Resena(
                usuario_id=payload.usuario_id,
                juego_id=juego_id,
                recomienda=payload.recomienda,
                texto=payload.texto,
            )
            self.db.add(resena)
        self.db.commit()
        self.db.refresh(resena)
        return resena

    def obtener_resenas(self, juego_id: int) -> list[Resena]:
        self.obtener_juego(juego_id)
        return self.db.query(Resena).filter(
            Resena.juego_id == juego_id
        ).order_by(Resena.fecha.desc()).all()

    def obtener_top_ventas(self, genero: str | None = None) -> list[dict]:
        ventas = func.count(Compra.id)
        query = self.db.query(Juego, ventas.label("compras")).outerjoin(
            Compra, Compra.juego_id == Juego.id
        ).group_by(Juego.id)
        if genero:
            query = query.filter(Juego.genero == genero)
        return [
            {
                "id": juego.id,
                "titulo": juego.titulo,
                "desarrollador_id": juego.desarrollador_id,
                "precio": juego.precio,
                "fecha_lanzamiento": juego.fecha_lanzamiento,
                "genero": juego.genero,
                "imagen": juego.imagen,
                "compras": int(compras),
                "total_resenas": 0,
                "porcentaje_positivas": 0,
            }
            for juego, compras in query.order_by(desc("compras")).limit(10).all()
        ]

    def obtener_mejor_valorados(self, genero: str | None = None) -> list[dict]:
        total = func.count(Resena.id)
        positivas = func.sum(case((Resena.recomienda.is_(True), 1), else_=0))
        porcentaje = positivas * 100.0 / total
        query = self.db.query(
            Juego, total.label("total_resenas"), porcentaje.label("porcentaje")
        ).join(Resena, Resena.juego_id == Juego.id).group_by(Juego.id).having(total >= 5)
        if genero:
            query = query.filter(Juego.genero == genero)
        return [
            {
                "id": juego.id,
                "titulo": juego.titulo,
                "desarrollador_id": juego.desarrollador_id,
                "precio": juego.precio,
                "fecha_lanzamiento": juego.fecha_lanzamiento,
                "genero": juego.genero,
                "imagen": juego.imagen,
                "compras": 0,
                "total_resenas": int(total_resenas),
                "porcentaje_positivas": round(float(valor), 2),
            }
            for juego, total_resenas, valor in query.order_by(desc("porcentaje")).limit(10).all()
        ]
