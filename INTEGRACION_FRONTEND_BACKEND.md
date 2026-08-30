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
| Buscar sesión por email | `GET /api/usuarios/?email=` | `iniciarSesion` |
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
| Rankings | `GET /api/juegos/top-ventas`, `GET /api/juegos/mejor-valorados` | top |
| Estadísticas | `GET /api/usuarios/{id}/estadisticas` | perfil y comunidad |

## Huecos pendientes

### 1. Autenticación real

No existe `POST /api/auth/login`, contraseña en el formulario, emisión de JWT
ni autorización por rol. Para conservar el flujo existente, el login busca el
email con `GET /api/usuarios/?email=`. Esto sirve para desarrollo, pero no es
seguro para producción. El backend guarda temporalmente
`autenticacion-pendiente` en `password_hash` al registrar.

### 2. Rol y relación usuario–desarrollador

El modelo `Usuario` no guarda `rol` ni `desarrollador_id`. El frontend conserva
esos dos valores en la sesión local cuando se registra una cuenta admin, pero
otro navegador no puede reconstruirlos. Se necesita una migración de base de
datos y exponer ambos campos en `CreateUsuarioSchema`/`GetUsuarioSchema`.

### 3. Contenido editorial de juegos

El backend no guarda `descripcion`, `resumen`, `imagen`, `galeria` ni trailer.
El adaptador del frontend reutiliza esos campos de `mock-data.ts` cuando
encuentra el mismo id o título y usa valores neutros para juegos nuevos. Estos
campos deberían agregarse al modelo, schema y migración de `Juego`.

### 4. Datos de tarjeta

La tarjeta sólo se valida en el navegador y no se envía al backend. Esto evita
guardar números sensibles sin una pasarela de pagos, pero significa que la
recarga actual es una simulación. Para producción se necesita integrar un
proveedor de pagos y enviar únicamente su token.

### 5. Migración de una base existente

Los modelos quedaron unificados sobre la tabla `usuarios` y `tables.sql` fue
actualizado. Si la base ya fue creada con la tabla singular `usuario`, hay que
migrar/renombrar esa tabla y sus claves foráneas antes de iniciar la API. El
repositorio todavía no contiene una revisión Alembic para hacerlo de forma
automática.

### 6. Pruebas automatizadas

No hay tests de contrato o integración. Se recomienda cubrir al menos registro,
compra transaccional, eliminación automática de wishlist, reseña, desbloqueo de
logro y amistad bidireccional contra una base de prueba.
