# Solución de problemas de VIGÍA

Consulta esta guía antes de repetir ingestas, reinstalar dependencias o revisar todo el repositorio. Empieza siempre con el diagnóstico de solo lectura:

```bash
pnpm app:doctor
```

El comando comprueba web, API, consulta real de contratos, Docker, PostgreSQL y conteos almacenados. No inicia, detiene, elimina ni modifica servicios o datos.

## Diagnóstico rápido

| Síntoma | Causa probable | Comprobación | Solución |
| --- | --- | --- | --- |
| `pnpm no se reconoce` | pnpm no está instalado o la terminal no recargó el `PATH` | `pnpm --version` | Ejecuta `npm install -g pnpm`, cierra la terminal, abre otra y repite. |
| La página no abre | Web apagada | `pnpm app:doctor` muestra `web: false` | Ejecuta `pnpm dev:all` desde la raíz del proyecto. |
| “No fue posible cargar los contratos” | API apagada o PostgreSQL desconectado | Revisa por separado `api-health`, `api-contracts` y `postgres` en `pnpm app:doctor` | Si web/API están apagadas, `pnpm dev:all`. Si PostgreSQL falla, inicia Docker y ejecuta `pnpm db:up`. |
| La API `/health` responde pero contratos da error 500 | `/health` no consulta PostgreSQL | Abre `http://localhost:4000/contracts?limit=1` o usa `pnpm app:doctor` | Inicia Docker/PostgreSQL; no repitas la ingesta. |
| La página muestra 0 contratos | La interfaz no recibió datos de la API | `pnpm app:doctor`; confirma `api-contracts` y el conteo `postgres.contracts` | Recupera la conexión con PostgreSQL y recarga con `Ctrl + F5`. |
| Los cambios no aparecen | Proceso de desarrollo antiguo o caché del navegador | Confirma que `pnpm dev:all` sigue activo | Reinicia el comando y usa `Ctrl + F5`. |
| Buscar un contrato no cambia la ficha | Versión anterior de la interfaz | Busca el identificador completo | Actualiza el repositorio/reinicia la web. La versión actual selecciona automáticamente un resultado único. |
| No aparecen `Confirmar`/`Rechazar` | El contrato seleccionado todavía no tiene análisis documental | Busca `CO1.PCCNTR.7257661` o filtra por revisión documental | Selecciona un contrato analizado; no todos los 100 están en el piloto. |
| Sentry no recibe eventos | DSN vacío o proceso sin reiniciar | Revisa las variables de `.env.local` sin imprimir sus valores | Configura ambos DSN y reinicia `pnpm dev:all`. Sentry está desactivado por defecto. |

## Docker: canal `dockerDesktopLinuxEngine` inexistente

### Síntoma

```text
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
The system cannot find the file specified
```

### Causa observada

Docker Desktop estaba abierto, pero el backend se cerraba antes de crear el motor Linux. En Docker Desktop 4.88.1 los registros mostraron fallos al reemplazar sockets Unix temporales:

```text
initializing Ingest server ... sailor-ingest.sock ... cannot be accessed
initializing Secrets Engine ... engine.sock ... cannot be accessed
```

### Solución aplicada el 1 de septiembre de 2026

1. No usar **Reset to factory defaults**.
2. Actualizar Docker Desktop de 4.88.1 a 4.89.0.
3. Cerrar Docker y WSL.
4. Mover las carpetas de sockets temporales a respaldos con fecha, sin tocar discos ni volúmenes:
   - `%LOCALAPPDATA%\Docker\run`
   - `%LOCALAPPDATA%\docker-secrets-engine`
5. Iniciar Docker Desktop y esperar que el motor quede listo.
6. Ejecutar `pnpm db:up`.
7. Confirmar una consulta real con `pnpm app:doctor`.

Los respaldos creados en este equipo son:

```text
C:\Users\USUARIO\AppData\Local\Docker\run-stale-20260901
C:\Users\USUARIO\AppData\Local\Docker\run-stale-20260901-2
C:\Users\USUARIO\AppData\Local\docker-secrets-engine-stale-20260901
C:\Users\USUARIO\AppData\Local\docker-secrets-engine-stale-20260901-2
```

No elimines estas carpetas durante otro diagnóstico. Pueden borrarse después de confirmar estabilidad y copias de seguridad, pero esa limpieza no es necesaria para ejecutar VIGÍA.

## ¿Cuándo repetir la ingesta?

No ejecutes `pnpm secop:ingest` para resolver errores de Docker, API, PostgreSQL, caché o arranque. La ingesta solo corresponde cuando se quiere actualizar o reconstruir deliberadamente la fuente local.

Antes de reconstruir, comprueba:

```bash
pnpm app:doctor
```

Si PostgreSQL responde y `contracts` es mayor que cero, los datos existen. Si el volumen realmente está vacío pero permanece la carga normalizada en `data/runtime/`, usa primero:

```bash
pnpm db:migrate
pnpm db:import
pnpm secop:processes
pnpm secop:documents
pnpm risk:calculate
```

Solo ejecuta una nueva ingesta si tampoco existen los archivos normalizados o si se solicitó una actualización de SECOP.

## Secuencia normal de arranque

```bash
pnpm db:up
pnpm dev:all
```

Después abre `http://localhost:3000`. Si el navegador conserva un estado de error anterior, usa `Ctrl + F5`.

## Información útil al reportar un problema

Incluye únicamente:

- salida de `pnpm app:doctor`;
- comando exacto ejecutado;
- mensaje completo del error;
- archivo o pantalla afectada;
- resultado esperado.

No pegues `.env.local`, DSN, tokens, documentos descargados, texto contractual completo ni datos personales.
