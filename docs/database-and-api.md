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
- `entity`: nombre de la entidad.
- `supplier`: nombre del proveedor.
- `method`: modalidad exacta de contratación.
- `dateFrom` y `dateTo`: intervalo de firma en formato `AAAA-MM-DD`.
- `minValue` y `maxValue`: intervalo de valor contractual.
- `limit`: entre 1 y 500.
- `offset`: desplazamiento para paginación.
- `priority=true`: contratos con puntaje acumulado igual o superior a 70.
- `sort`: `signedAt`, `value`, `riskScore`, `entity` o `supplier`.
- `direction`: `asc` o `desc`.

Ejemplo:

```text
http://localhost:4000/contracts?method=Contratación%20directa&sort=value&direction=desc&limit=25
```

### `GET /contracts/:id`

Devuelve un contrato individual con su entidad, proveedor, proceso, fuente SECOP y puntaje acumulado.

El objeto `process` incluye, cuando existe vinculación oficial, el identificador del proceso, fechas de publicación y adjudicación, precio base, valor adjudicado, oferentes y lotes. `riskSignals` contiene código, versión, aporte, explicación y limitación de cada regla.

## Exportación CSV

El botón **Generar informe** exporta únicamente los resultados que cumplen los filtros visibles. Incluye contrato, entidad, proveedor, valor, modalidad, puntaje, reglas, explicaciones, proceso oficial y enlace SECOP.

## Esquema inicial

Las migraciones crean `entities`, `suppliers`, `processes`, `contracts`, `data_loads` y `risk_signals`, con llaves foráneas e índices para fecha, entidad, proveedor, proceso, valor y modalidad.

La API no expone documentos de identidad, información bancaria, domicilios ni nombres de responsables contractuales.
