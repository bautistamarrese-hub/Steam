# Initial Structure — FastAPI + SQLAlchemy + Pydantic

Estructura base de un proyecto en capas (routers, services, repositories, models, schemas, dtos, mappers, middlewares).

## Importante: este repo es un TEMPLATE

**No clones este repo directamente ni intentes pushear.** El repo está protegido y solo el docente tiene permisos de escritura.

### Cómo trabajar con esta plantilla

1. Entrá al repo en GitHub.
2. Hacé click en el botón verde **"Use this template" → "Create a new repository"** (o, si no aparece, usá **"Fork"**).
3. Creá el nuevo repo en **tu cuenta personal** de GitHub.
4. Cloná **tu copia** (no la del docente):
   ```bash
   git clone https://github.com/<TU_USUARIO>/<TU_REPO>.git
   cd <TU_REPO>
   ```
5. A partir de ahí trabajás libremente sobre tu propio repo.

> Si intentás `git push` y te dice `permission denied`, es porque clonaste el repo del docente en lugar de tu fork/template. Volvé al paso 2.

---

## Setup

1) Correr en una terminal: `cd .\backend\`
2) Inicializar el entonrno virtual: `python -m venv venv`
3) Activar el entorno virtual: `venv\Scripts\Activate.ps1`
Recordatorio: Verificar de tener los permisos para poder hacerlo. Estos se habilitan ejecutando: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
4) Una vez que estas dentro del (venv), instalar las dependencias: `pip install -r requirements.txt`
5) Chequear que `.env` tenga las credenciales reales de PostgreSQL. El usuario
   habitual de una instalación local es `postgres`; reemplazá
   `TU_PASSWORD_DE_POSTGRES` por la contraseña elegida durante la instalación.
6) Levantar la api con: `uvicorn src.app:app --reload`


### Comentarios utiles
- Si queres borrar el venv lo que tenes que hacer primero es desactivarlo de la terminal con el comnado  `deactivate` y luego borrar la carpeta

powershell:
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d steamdb -f "C:\Steam\backend\src\db\migrations\20260902_perfiles_imagenes.sql"

front end
cd f (tab)
python -m venv venv
npm.cmd run dev

```bash
python -m venv venv
source venv/bin/activate          # Linux/Mac
# venv\Scripts\Activate.ps1       # Windows

pip install -r requirements.txt
cp .env.example .env               # editá con tus credenciales

uvicorn src.app:app --reload
```

Si ya habias creado la base con una version anterior del proyecto, aplica una
vez esta migracion antes de levantar la API:

```powershell
psql -U postgres -d steamdb -f .\src\db\migrations\20260831_usuarios_auth.sql
```

Corrige la tabla antigua `usuario` y agrega los campos necesarios para crear
cuentas e iniciar sesion.

Aplicá también el historial de recargas si tu base ya existía:

```powershell
psql -U postgres -d steamdb -f .\src\db\migrations\20260831_recarga.sql
```

Para habilitar la subida y ejecución de juegos web, instalá las dependencias
actualizadas y aplicá la migración correspondiente:

```powershell
pip install -r requirements.txt
psql -U postgres -d steamdb -f .\src\db\migrations\20260831_juegos_archivos.sql
psql -U postgres -d steamdb -f .\src\db\migrations\20260902_perfiles_imagenes.sql
psql -U postgres -d steamdb -f .\src\db\migrations\20260903_superadmin.sql
psql -U postgres -d steamdb -f .\src\db\migrations\20260903_logros_automaticos.sql
```

Los juegos reproducibles deben ser un archivo `.html` o un `.zip` que incluya
un `index.html`. Los archivos subidos se guardan localmente en `backend/storage`
y por eso no se incluyen en Git.

La migración `20260902_perfiles_imagenes.sql` agrega avatares y los campos
editoriales de los juegos (descripción, resumen, portada y galería), necesarios
para las pantallas de perfil y el panel de desarrolladores.

La migración `20260903_superadmin.sql` crea la cuenta administradora principal
usada por el panel global. El backend también verifica esta cuenta al iniciar
sesión para que esté disponible en bases creadas por los tests o por SQLAlchemy.
Sus credenciales iniciales son `admin@gmail.com`, contraseña `123456` y nombre
de usuario `admin`.
Desde el panel global puede editar cualquier juego, cambiar su portada y
galería, subir o reemplazar el archivo jugable y agregar logros. Estas acciones
usan endpoints administrativos protegidos con el token de la sesión.

La migración `20260903_logros_automaticos.sql` permite definir cada logro con
una métrica y un valor objetivo. Un juego HTML reporta el valor acumulado así:

```javascript
parent.postMessage(
  { type: "steamnt:achievement-progress", evento: "puntaje", valor: 10 },
  "*",
);
```

El backend compara el progreso con todos los requisitos del juego y registra
automáticamente los logros alcanzados. La plataforma también reporta
`iniciar_juego`, `tiempo_jugado_segundos` y, para el minijuego de respaldo,
`puntaje`.

Las métricas disponibles para los juegos subidos son `puntaje`, `victorias`,
`nivel_alcanzado`, `enemigos_derrotados` y `partidas-ganadas`. El mensaje debe
emitirse dentro de la condición real del juego que confirma ese resultado; el
texto descriptivo del logro no permite deducir por sí solo cuándo ocurrió. Por
ejemplo, una victoria debe informar `valor: 1` solamente después de confirmar
que ganó el jugador, no al finalizar una derrota o un empate.

Abrir http://localhost:8000/docs para ver Swagger.

http://localhost: 8080/
---

## Estructura de carpetas

```
src/
├── db/
│   ├── connection.py
│   ├── models/          # SQLAlchemy
│   ├── migrations/      # Alembic
│   └── seeders/
├── schemas/             # Pydantic (validación HTTP)
├── dtos/                # Pydantic (transporte entre capas)
├── mappers/             # Model ⇄ DTO
├── repositories/        # queries
├── services/            # lógica de negocio
├── routers/             # endpoints FastAPI
├── middlewares/
├── config/
├── utils/
├── app.py               # crea app FastAPI
└── main.py              # entry point
```

---

## Cómo está pensada la entrega

El módulo de **users** tiene un endpoint completo (`POST /users`) con todas las capas implementadas como ejemplo de la sintaxis.

El resto de los métodos (`GET`, `PUT`, `DELETE`) y los demás dominios (`products`, `auth`) están con `...` / `pass` / comentarios `TODO`. **Tu trabajo es completarlos** siguiendo el patrón del ejemplo.

---

## Reglas de la arquitectura

1. `routers` no tocan la BD.
2. `services` no tocan `Request` / `Response`.
3. `repositories` no tienen lógica de negocio.
4. `models` no salen del repository / service.
5. `schemas` solo en routers.
6. Al cliente siempre va un DTO, nunca un Model.


