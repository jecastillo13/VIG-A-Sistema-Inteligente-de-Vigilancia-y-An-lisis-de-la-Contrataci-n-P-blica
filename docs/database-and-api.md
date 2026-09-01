# Base de datos y API local

## Ejecución inmediata sin Docker

La API puede leer directamente los contratos normalizados de `data/runtime/`. Este modo permite ver la carga real en el dashboard mientras se instala PostgreSQL.

```bash
pnpm dev:all
```

El comando inicia:

- Dashboard: `http://localhost:3000`
- API: `http://localhost:4000`
- Salud de la API: `http://localhost:4000/health`

El valor `DATA_BACKEND=json` en `.env.local` activa este modo.

## PostgreSQL con Docker

Después de instalar Docker Desktop:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:import
```

Cambia `DATA_BACKEND=json` por `DATA_BACKEND=postgres` en `.env.local` y reinicia `pnpm dev:all`.

Esta configuración se validó localmente con PostgreSQL 16 y una carga de 100 contratos de INVÍAS correspondientes a 2025.

Para detener PostgreSQL:

```bash
pnpm db:down
```

## API

### `GET /health`

Devuelve el estado y el backend activo.

### `GET /contracts`

Parámetros:

- `search`: contrato, entidad, proveedor u objeto.
- `limit`: entre 1 y 500.
- `offset`: desplazamiento para paginación.
- `priority=true`: se utilizará cuando existan puntajes.

Ejemplo:

```text
http://localhost:4000/contracts?search=obra&limit=25
```

## Esquema inicial

La migración crea `entities`, `suppliers`, `contracts`, `data_loads` y `risk_signals`, con llaves foráneas e índices para fecha, entidad, proveedor, valor y modalidad.

La API no expone documentos de identidad, información bancaria, domicilios ni nombres de responsables contractuales.
