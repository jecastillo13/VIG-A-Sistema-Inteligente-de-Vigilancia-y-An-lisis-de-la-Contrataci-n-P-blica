# AGENTS.md — Guía de trabajo para VIGÍA

## Propósito del producto

VIGÍA es una plataforma local de análisis explicable de contratación pública colombiana. Ingiere datos y documentos oficiales de SECOP II, calcula indicadores objetivos de riesgo y presenta evidencia para priorizar revisión humana.

El sistema **no determina corrupción ni responsabilidad**. Mantén lenguaje prudente: una señal solicita revisión y toda afirmación documental debe conservar una cita verificable.

## Arquitectura

```text
SECOP II / Datos Abiertos
  -> scripts/secop (ingesta, validación y normalización)
  -> PostgreSQL (migraciones en db/migrations)
  -> scripts/risk (reglas deterministas y versionadas)
  -> scripts/documents (descarga, extracción, clasificación y revisión)
  -> scripts/api/server.mjs (API local)
  -> app/page.tsx (dashboard React)
```

- Web: React 19, TypeScript, Vinext y Tailwind CSS.
- API: servidor Node local en `127.0.0.1:4000`.
- Base de datos: PostgreSQL mediante Docker Compose.
- Fuente inicial: API Socrata de Datos Abiertos Colombia.
- Gestor de paquetes: pnpm 11; Node.js 22.13 o superior.
- Módulos: ESM (`"type": "module"`).

Consulta también `docs/architecture.md`, `docs/database-and-api.md`, `docs/ingestion.md`, `docs/documents.md` y `ROADMAP.md`.

## Carpetas y archivos importantes

- `app/`: interfaz. No debe calcular reglas de riesgo ni inferir datos ausentes.
- `components/`, `hooks/`, `lib/`: piezas reutilizables de la interfaz.
- `scripts/api/`: API, validación de solicitudes y pruebas asociadas.
- `scripts/secop/`: clientes Socrata, ingesta, normalización y almacenamiento.
- `scripts/risk/`: motor de indicadores, cálculo y pruebas de reglas.
- `scripts/documents/`: controles de descarga, extracción por página, clasificación y revisión humana.
- `scripts/database/`: aplicación de migraciones e importación.
- `db/migrations/`: esquema PostgreSQL versionado. Añade una migración nueva; no edites retroactivamente una migración aplicada salvo corrección explícita solicitada.
- `docs/`: arquitectura, operación y decisiones verificables.
- `public/`: recursos estáticos mantenidos manualmente.
- `.env.example`: nombres y valores seguros de ejemplo; nunca secretos.

## No recorrer ni revisar por defecto

Evita búsquedas, lecturas o revisiones recursivas en contenido instalado, compilado, temporal o generado:

- `node_modules/`
- `.git/`
- `.next/`
- `.vinext/`
- `dist/`
- `.wrangler/`
- `outputs/`
- `coverage/`
- `.playwright-cli/`
- `data/runtime/`
- `data/documents/`
- archivos `*.log`, lockfiles salvo cambios de dependencias y archivos indicados en `.gitignore`

Usa `rg` y `rg --files` con rutas concretas. No ejecutes “revisa todo” ni recorridos globales cuando el problema señale un componente.

Los archivos de `data/documents/` pueden contener documentos públicos con datos personales. No los abras, cites o expongas salvo que la tarea documental lo requiera expresamente; aplica minimización antes de almacenar o mostrar texto.

## Comandos habituales

```bash
pnpm install          # instala dependencias
pnpm dev:all          # web :3000 + API :4000
pnpm lint             # análisis estático
pnpm test             # pruebas Node
pnpm build            # compilación de producción
pnpm check            # lint + test + build; verificación integral
pnpm db:up            # inicia PostgreSQL
pnpm db:migrate       # aplica migraciones
pnpm db:import        # importa la carga local normalizada
pnpm risk:calculate   # recalcula señales de riesgo
pnpm secop:documents  # actualiza el inventario documental
pnpm document:pilot   # resume el piloto documental
```

Los comandos adicionales y sus argumentos están documentados en `README.md` y `package.json`.

## Estrategia de pruebas

- Cambio pequeño y aislado: ejecuta primero la prueba del componente y `pnpm lint`.
- API, esquema, reglas, extracción documental o flujo de usuario: añade pruebas proporcionales y ejecuta `pnpm check` antes de entregar.
- Cambio visual: valida el recorrido afectado en `http://localhost:3000`, revisa consola y no registres decisiones humanas reales durante una prueba automática.
- Migración: ejecuta `pnpm db:migrate` sobre PostgreSQL local y verifica idempotencia.
- No corrijas pruebas eliminándolas, relajando aserciones relevantes o ocultando errores.

## Reglas de implementación

1. Conserva identificadores y enlaces oficiales de SECOP para trazabilidad.
2. Toda regla de riesgo debe ser determinista, versionada, explicable y probada.
3. El análisis documental nunca modifica el puntaje objetivo de riesgo.
4. Distingue siempre `no encontrado`, `sin texto`, `fallido` y `no analizado`.
5. No renderices HTML proveniente de fuentes externas.
6. Valida entradas de API, usa consultas parametrizadas y limita tamaños.
7. No descargues documentos masivamente. Exige identificador explícito y conserva los límites de dominio, tipo, tamaño, firma y SHA-256.
8. Minimiza cédulas, correos y teléfonos antes de almacenar texto extraído.
9. No confirmes o rechaces citas en nombre de un revisor humano.
10. No incluyas `.env.local`, credenciales, documentos descargados ni datos generados en Git.
11. Mantén compatibilidad con Windows y PowerShell; evita asumir comandos exclusivos de Unix en instrucciones de usuario.
12. Preserva cambios ajenos o no relacionados que ya existan en el árbol de trabajo.

## Flujo recomendado para cada tarea

1. Lee el archivo o componente indicado y sus pruebas cercanas.
2. Resume el problema concreto y el resultado esperado.
3. Cambia únicamente lo necesario; evita refactorizaciones adyacentes no solicitadas.
4. Ejecuta la verificación proporcional al riesgo.
5. Revisa `git diff --check` y `git status --short`.
6. Informa qué cambió, cómo se verificó y qué limitación permanece.

Formato recomendado para solicitar trabajo:

```text
Componente/archivo:
Problema observable:
Resultado esperado:
Fuera de alcance:
Pruebas requeridas:
```

Si la tarea es ambigua, realiza primero inspección de solo lectura. Pide una decisión únicamente cuando las alternativas cambien materialmente el resultado o amplíen el alcance.

## Git y colaboración

- Rama principal actual: `main`.
- Para ramas nuevas creadas por Codex, usa el prefijo `codex/`.
- Commits breves y orientados al resultado.
- No hagas `git reset --hard`, no descartes trabajo local y no fuerces `push`.
- No mezcles cambios no relacionados en el mismo commit.
- Antes de subir: `git diff --check`, verificación apropiada y árbol limpio respecto del alcance entregado.

## Definición de terminado

Una tarea termina cuando el resultado solicitado funciona, conserva trazabilidad y lenguaje prudente, tiene pruebas proporcionales, no expone secretos ni datos personales innecesarios, está documentado cuando cambia la operación y puede reproducirse mediante los comandos del repositorio.
