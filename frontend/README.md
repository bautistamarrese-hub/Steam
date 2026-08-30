# Game Hub Connect

Antes de iniciar Vite, copiá `.env.example` a `.env` y ajustá
`VITE_API_URL` si FastAPI no corre en `http://localhost:8000`.

> Estado de integración: la matriz de endpoints, diferencias de contrato y
> rutas pendientes está en [INTEGRACION_FRONTEND_BACKEND.md](../INTEGRACION_FRONTEND_BACKEND.md).

realiza el frontend en typescript basándote en: 

Proyecto 5 — Steam

Plataforma de distribución de videojuegos. Los usuarios compran juegos con su saldo, arman una wishlist, desbloquean logros y publican reseñas.

Entidades sugeridas

Usuario (id, email, nickname, saldo, fecha_registro)

Desarrollador (id, nombre, pais)

Juego (id, titulo, desarrollador_id, precio, fecha_lanzamiento, genero)

Compra (id, usuario_id, juego_id, fecha, precio_pagado)

Logro (id, juego_id, nombre, descripcion, puntos)

LogroDesbloqueado (usuario_id, logro_id, fecha)

Resena (id, usuario_id, juego_id, recomienda, texto, fecha)

Relación N a M wishlist (usuario_id, juego_id, fecha_agregado)

Relación N a M amigos (usuario_a, usuario_b, fecha)

Historias de usuario

HU1 — Registro con nickname

Como visitante, quiero registrarme para acceder a mi biblioteca.

 El email es único.

 El nickname es único.

 saldo inicia en 0.

 fecha_registro se guarda automáticamente.

HU2 — Publicar juego

Como desarrollador, quiero publicar mis juegos.

 Todo juego pertenece a un desarrollador existente.

 precio mayor o igual a 0 (los juegos gratuitos son válidos).

 titulo es único por desarrollador.

 GET /desarrolladores/{id}/juegos lista todos los juegos del desarrollador.

HU3 — Recargar saldo

Como usuario, quiero recargar saldo en mi cuenta.

 POST /usuarios/{id}/recargar recibe un monto positivo.

 Cada recarga queda registrada (no basta con actualizar saldo).

 El monto mínimo de recarga es 100.

HU4 — Comprar juego

Como usuario, quiero comprar un juego.

 No se puede comprar un juego que el usuario ya posee.

 El saldo del usuario debe ser mayor o igual al precio del juego.

 Al comprar se descuenta del saldo y se guarda precio_pagado.

 Al comprar, el juego sale automáticamente de la wishlist (si estaba).

HU5 — Biblioteca del usuario

Como usuario, quiero ver mi biblioteca de juegos.

 GET /usuarios/{id}/biblioteca devuelve todos los juegos comprados por el usuario.

 Se puede filtrar por genero.

 Cada juego incluye la fecha de compra y el precio pagado.

HU6 — Wishlist

Como usuario, quiero agregar juegos a mi lista de deseados.

 No se puede agregar dos veces el mismo juego.

 No se pueden agregar juegos ya comprados.

 GET /usuarios/{id}/wishlist devuelve la lista ordenada por fecha_agregado.

HU7 — Reseñas

Como usuario, quiero publicar reseñas de los juegos que jugué.

 Solo se puede reseñar un juego que el usuario compró.

 Un usuario tiene como máximo una reseña por juego (puede editarla).

 recomienda es booleano (positiva/negativa, sin puntajes intermedios).

HU8 — Logros del juego

Como desarrollador, quiero definir logros para mi juego.

 Todo logro pertenece a un juego.

 nombre del logro es único dentro del juego.

 puntos entre 1 y 100.

 GET /juegos/{id}/logros devuelve todos los logros del juego.

HU9 — Desbloquear logro

Como usuario, quiero registrar el desbloqueo de un logro.

 Solo se puede desbloquear un logro si el usuario posee el juego.

 No se puede desbloquear el mismo logro dos veces.

 Se guarda la fecha de desbloqueo.

HU10 — Amigos

Como usuario, quiero agregar amigos.

 La amistad es bidireccional (no importa quién la creó, ambos son amigos).

 No puede existir una amistad duplicada entre los mismos dos usuarios.

 Un usuario no puede ser amigo de sí mismo.

HU11 — Top juegos

Como usuario, quiero ver los juegos más populares.

 GET /juegos/top-ventas devuelve los 10 juegos con más compras.

 GET /juegos/mejor-valorados devuelve los 10 con mayor % de reseñas positivas (mínimo 20 reseñas).

 Se puede filtrar por genero en ambos.

HU12 — Estadísticas del usuario

Como usuario, quiero ver un resumen de mi perfil.

 GET /usuarios/{id}/estadisticas devuelve total gastado, cantidad de juegos, cantidad de logros desbloqueados y puntos totales.

 Incluye el porcentaje de logros desbloqueados por juego (top 5 más completados).

 Incluye la cantidad de amigos.


deja los endpoints consumibles comentados que después yo los modifico

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c5399253-a5bc-4d0d-9afc-d60f6308190b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
