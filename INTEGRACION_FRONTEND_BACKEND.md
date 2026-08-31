# Integración frontend–backend

Fecha de revisión: 2026-08-30.

## Estado

El frontend consume el backend mediante `fetch` desde `frontend/src/lib/api.ts`.
La URL base se configura con:

```env
VITE_API_URL=http://localhost:8000/api
```

Las pantallas usan React Query para cargar datos asíncronos y para invalidar
biblioteca, wishlist, perfil, reseñas y logros después de una mutación. El mock
ya no se usa como base de datos: sólo aporta imágenes y descripciones de muestra
porque esos campos no existen en el modelo actual de `Juego`.

## Matriz de endpoints conectados

| Flujo | Endpoint del backend | Consumidor del frontend |
| --- | --- | --- |
| Registrar usuario | `POST /api/usuarios/` | `registrarUsuario` |
| Iniciar sesión | `POST /api/usuarios/login` | `iniciarSesion` |
| Listar/obtener usuarios | `GET /api/usuarios/`, `GET /api/usuarios/{id}` | comunidad, sesión y autores de reseñas |
| Crear/listar/obtener desarrolladores | `POST`, `GET /api/desarrolladores/`, `GET /api/desarrolladores/{id}` | registro admin y panel dev |
| Publicar/listar/detallar juegos | `POST`, `GET /api/juegos/`, `GET /api/juegos/{id}` | tienda, panel dev y detalle |
| Juegos de un desarrollador | `GET /api/desarrolladores/{id}/juegos` | panel y perfil dev |
| Recargar y ver historial | `POST /api/usuarios/{id}/recargar`, `GET /api/usuarios/{id}/recargas` | perfil |
| Comprar | `POST /api/usuarios/{id}/comprar/{juego_id}` | tienda, detalle y wishlist |
| Biblioteca | `GET /api/usuarios/{id}/biblioteca?genero=` | biblioteca y perfiles |
| Wishlist | `GET`, `POST /api/usuarios/{id}/wishlist`; `DELETE /api/usuarios/{id}/wishlist/{juego_id}` | tienda, detalle y wishlist |
| Reseñas | `GET`, `POST /api/juegos/{id}/resenas` | detalle de juego |
| Logros del juego | `GET`, `POST /api/juegos/{id}/logros` | detalle y panel dev |
| Logros desbloqueados | `GET /api/usuarios/{id}/logros`, `POST /api/usuarios/{id}/logros/{logro_id}` | detalle y perfil público |
| Amigos | `GET`, `POST /api/usuarios/{id}/amigos`; `DELETE /api/usuarios/{id}/amigos/{amigo_id}` | comunidad y perfil público |
| Solicitudes de amistad | `POST /api/solicitudes`; `PUT`, `DELETE /api/solicitudes/{id}`; `GET /api/usuarios/{id}/solicitudes/{recibidas,enviadas}` | comunidad y perfil público |
| Rankings | `GET /api/juegos/top-ventas`, `GET /api/juegos/mejor-valorados` | top |
| Estadísticas | `GET /api/usuarios/{id}/estadisticas` | perfil y comunidad |

## Huecos pendientes

### 1. Autorización de endpoints

El registro deriva la contraseña con PBKDF2-SHA256 y el login valida email y
contraseña mediante `POST /api/usuarios/login`. Todavía no se emite un token ni
se comprueba la identidad o el rol al mutar recursos: la sesión actual sólo se
conserva en el navegador. Antes de producción hay que agregar tokens o cookies
seguras y autorización en cada endpoint protegido.

### 2. Contenido editorial de juegos

El backend no guarda `descripcion`, `resumen`, `imagen`, `galeria` ni trailer.
El adaptador del frontend reutiliza esos campos de `mock-data.ts` cuando
encuentra el mismo id o título y usa valores neutros para juegos nuevos. Estos
campos deberían agregarse al modelo, schema y migración de `Juego`.

### 3. Datos de tarjeta

La tarjeta sólo se valida en el navegador y no se envía al backend. Esto evita
guardar números sensibles sin una pasarela de pagos, pero significa que la
recarga actual es una simulación. Para producción se necesita integrar un
proveedor de pagos y enviar únicamente su token.

### 4. Migración de una base existente

Los modelos quedaron unificados sobre la tabla `usuarios` y `tables.sql` fue
actualizado. Si la base ya fue creada con la tabla singular `usuario`, hay que
migrar/renombrar esa tabla y sus claves foráneas antes de iniciar la API. El
repositorio todavía no contiene una revisión Alembic para hacerlo de forma
automática. Para una base que ya usa `usuarios`, el script
`src/db/migrations/20260831_usuario_rol.sql` agrega el rol y la relación con el
estudio sin borrar datos.
El script `src/db/migrations/20260831_auth_solicitudes.sql` crea las solicitudes
de amistad. Las cuentas anteriores cuyo hash sea `autenticacion-pendiente`
necesitan un restablecimiento de contraseña; las cuentas nuevas ya son compatibles.

## Verificación automatizada

`backend/tests/test_flows.py` cubre registro y persistencia de rol, CORS,
publicación, búsqueda, recargas, compra transaccional, wishlist, biblioteca,
reseñas editables, logros, amistades bidireccionales, solicitudes, login con
contraseña, estadísticas y rankings.
Se ejecuta contra SQLite aislado con `pytest -q` y no modifica la base local.
