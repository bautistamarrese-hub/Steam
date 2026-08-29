# Integración frontend–backend

Fecha de revisión: 2026-08-29.

## Estado actual

El frontend **no consume el backend** todavía. Todas las funciones de
`frontend/src/lib/api.ts` operan sobre `mock-data.ts`; las URLs que aparecen
como comentarios son el contrato inicialmente esperado, no solicitudes HTTP.

El backend publica sus rutas bajo el prefijo `/api` (por ejemplo,
`http://localhost:<PORT>/api/usuarios/`). No existe un `VITE_API_URL` usado
por el código actual ni un proxy de desarrollo.

No se conectaron las funciones de manera parcial: sus firmas son síncronas,
mientras que `fetch` es asíncrono. Cambiar solamente algunas dejaría pantallas
con estados mezclados entre el mock y la base de datos, o promesas tratadas
como datos. La integración debe migrar la capa y sus consumidores en conjunto.

## Rutas existentes que sí tienen correspondencia

| Funcionalidad del frontend | Ruta real del backend | Diferencia a adaptar |
| --- | --- | --- |
| Registro | `POST /api/usuarios/` | Coincide la finalidad. El backend no recibe `rol` ni `estudio`. |
| Crear desarrollador | `POST /api/desarrolladores/` | El frontend lo crea implícitamente al registrar un admin; debe ser un segundo request. |
| Publicar juego | `POST /api/juegos/` | El contrato base coincide; backend no acepta imagen, descripción, resumen ni galería. |
| Juegos de desarrollador | `GET /api/desarrolladores/{id}/juegos` | Coincide la URL. |
| Recarga | `POST /api/usuarios/{id}/recargar` | Backend sólo acepta `monto`; el frontend además valida/envía tarjeta. |
| Compra | `POST /api/usuarios/{id}/comprar/{juego_id}` | Reemplaza el esperado `POST /compras` con JSON. |
| Biblioteca | `GET /api/usuarios/{id}/biblioteca?genero=` | El esquema declarado no coincide con los ítems devueltos por el servicio. |
| Añadir/listar wishlist | `POST` / `GET /api/usuarios/{id}/wishlist` | Las rutas coinciden. |
| Crear/listar logros | `POST` / `GET /api/juegos/{id}/logros` | Al crear, backend exige también `juego_id` en el body aunque ya está en la URL. |
| Crear reseña | `POST /api/juegos/{id}/resenas` | Reemplaza el esperado `POST /resenas`; backend exige `juego_id` también en el body. |
| Desbloquear logro | `POST /api/usuarios/{id}/logros/{logro_id}` | Reemplaza el body `{ logro_id }`. |
| Agregar amigo | `POST /api/usuarios/{id}/amigos` | Reemplaza el body `{ usuario_a, usuario_b }` por `{ amigo_id }`. |
| Estadísticas | `GET /api/usuarios/{id}/estadisticas` | La ruta coincide; las claves de respuesta no coinciden. |
| Top ventas / valorados | `GET /api/juegos/top-ventas` y `/mejor-valorados` | Aceptan `genero`; la respuesta no contiene las métricas usadas por el frontend. |

## Huecos del backend

Estas operaciones son necesarias para las pantallas actuales y no tienen una
ruta equivalente expuesta:

| Operación requerida | Ruta propuesta |
| --- | --- |
| Inicio de sesión y autenticación | `POST /api/auth/login` |
| Listar usuarios | `GET /api/usuarios` |
| Obtener usuario por id | `GET /api/usuarios/{id}` |
| Listar desarrolladores | `GET /api/desarrolladores` |
| Obtener desarrollador | `GET /api/desarrolladores/{id}` |
| Catálogo y búsqueda | `GET /api/juegos?genero=&q=` |
| Detalle de juego | `GET /api/juegos/{id}` |
| Historial de recargas | `GET /api/usuarios/{id}/recargas` |
| Quitar de wishlist | `DELETE /api/usuarios/{id}/wishlist/{juego_id}` |
| Listar reseñas | `GET /api/juegos/{id}/resenas` |
| Editar reseña | `PUT /api/resenas/{id}` |
| Listar/eliminar amistades | `GET /api/usuarios/{id}/amigos`, `DELETE /api/usuarios/{id}/amigos/{amigo_id}` |
| Consultar propiedad de juego / logro desbloqueado | Incluirlo en biblioteca/logros o exponer rutas específicas. |
| Perfil público | `GET /api/usuarios/{id}/perfil` |

## Desajustes que bloquean incluso las rutas expuestas

1. `backend/src/routers/juego_router.py` llama a `JuegoService` con métodos
   inexistentes o firmas incompatibles: `publicar(payload)`,
   `obtener_top_ventas`, `obtener_mejor_valorados`, `publicar_resena` y
   `obtener_juegos`.
2. `GetJuegoSchema` declara sólo seis propiedades, pero el frontend requiere
   además `descripcion`, `imagen`, y opcionalmente `resumen` y `galeria`.
3. La biblioteca se declara como `list[GetJuegoSchema]`, mientras el servicio
   construye registros con `juego_id`, `precio_pagado` y `fecha_compra`.
4. `GetEstadisticasUsuarioSchema` espera `cantidad_juegos`,
   `cantidad_logros` y `top_completados`, pero el servicio devuelve claves con
   otros nombres (`total_juegos_comprados`, `total_logros_desbloqueados`,
   `top_5_juegos_completados`).
5. Los modelos y servicios alternan tablas `usuario` y `usuarios`, y hay
   claves foráneas incompatibles, por ejemplo en
   `desbloquearLogro_model.py`. Debe unificarse antes de validar la API contra
   una base de datos nueva.
6. No hay autenticación ni autorización. En particular, publicar juegos,
   definir logros, recargar, comprar y modificar amistades se pueden invocar
   con cualquier id en la URL.

## Plan de conexión seguro

1. Corregir y probar las rutas/métodos expuestos del backend, y completar las
   rutas listadas como huecos con esquemas de respuesta estables.
2. Definir `VITE_API_URL` (por ejemplo `http://localhost:8000/api`) y crear
   un cliente `fetch` que convierta errores HTTP en `ApiError`.
3. Migrar `api.ts` a funciones `async` y reemplazar los `useMemo` síncronos de
   las páginas por consultas asíncronas (React Query ya está instalado).
4. Invalidar las consultas correspondientes después de compras, recargas,
   wishlist, amistades, reseñas y logros para evitar datos obsoletos.
5. Eliminar `mock-data.ts` sólo cuando el flujo completo haya sido verificado
   contra la API.

## Configuración que deberá usar el frontend

```env
VITE_API_URL=http://localhost:8000/api
```

El puerto debe coincidir con `settings.PORT` del backend. El CORS actual sólo
permite `http://localhost:5173`, lo cual está bien para Vite local; habrá que
ampliarlo para cualquier otro origen de despliegue.
