# VIGÍA — Radar SECOP

Prototipo de una plataforma para analizar y priorizar factores de riesgo en la contratación pública colombiana.

> Los puntajes e indicadores orientan la revisión humana. No constituyen prueba de irregularidad, responsabilidad fiscal, disciplinaria, penal ni corrupción.

## Estado actual

La versión local contiene un dashboard conectado a 100 contratos reales de INVÍAS publicados en SECOP II:

- panorama nacional y métricas principales;
- ranking de contratos priorizados;
- búsqueda por contrato, entidad o proveedor;
- selección y explicación de señales de riesgo reproducibles;
- inventario de documentos oficiales disponible en cada ficha contractual;
- interfaz adaptable a computador y móvil.

El motor v1.2.0 calcula los diez indicadores iniciales, conserva su evidencia y limitaciones, y suprime plantillas textuales repetitivas y errores extremos de escala para reducir ruido. Los resultados orientan revisión y no afirman corrupción.

Consulta la [hoja de ruta del proyecto](ROADMAP.md) para conocer las fases, entregables y criterios de aceptación del MVP.

## Requisitos

- Node.js 22.13 o superior
- pnpm 11
- Docker Desktop con WSL 2

## Ejecutar localmente

```bash
git clone https://github.com/jecastillo13/VIG-A-Sistema-Inteligente-de-Vigilancia-y-An-lisis-de-la-Contrataci-n-P-blica.git
cd VIG-A-Sistema-Inteligente-de-Vigilancia-y-An-lisis-de-la-Contrataci-n-P-blica
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:import
pnpm secop:processes
pnpm secop:documents
pnpm risk:calculate
pnpm dev:all
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

Si `pnpm` no está instalado, ejecuta primero `npm install -g pnpm`.

Para preparar las variables locales:

```bash
cp .env.example .env.local
```

## Comandos

```bash
pnpm dev      # inicia solamente la interfaz
pnpm dev:all  # inicia la interfaz y la API de contratos reales
pnpm build    # genera una compilación de producción
pnpm lint     # revisa el código
pnpm format   # aplica el formato del proyecto
pnpm check    # ejecuta revisión y compilación
pnpm test     # ejecuta las pruebas automatizadas
pnpm db:up    # inicia PostgreSQL local
pnpm secop:processes # vincula métricas oficiales de procesos SECOP II
pnpm secop:documents # inventaría metadatos de documentos oficiales
pnpm risk:calculate # recalcula señales y evidencia de riesgo
pnpm document:download -- --document-id=708763166 # descarga controlada de un documento
pnpm document:extract -- --document-id=708763166 # extrae texto PDF por página
```

## Primera ingesta SECOP II

Para descargar una muestra local de contratos reales de INVÍAS firmados en 2025:

```bash
pnpm secop:ingest -- --year=2025 --entity=invias --limit=100
```

Consulta la [documentación de ingesta](docs/ingestion.md) para conocer la reanudación, los archivos generados y las opciones disponibles.

Para ver los contratos descargados en el dashboard, ejecuta:

```bash
pnpm dev:all
```

La [documentación de base de datos y API](docs/database-and-api.md) explica el modo JSON inmediato y la posterior activación de PostgreSQL con Docker.

## Documentos oficiales

El inventario documental se obtiene sin descargar masivamente los archivos. La ficha de cada contrato muestra los documentos oficiales más recientes y enlaza a la fuente SECOP. Para actualizarlo ejecuta:

```bash
pnpm secop:documents
```

Las descargas son individuales y aplican límites de tamaño, tipos permitidos, validación del origen, firma del archivo y huella SHA-256. Consulta [documentos SECOP](docs/documents.md) antes de descargar archivos.

## Próximos pasos sugeridos

1. Ampliar la muestra a las ocho entidades piloto.
2. Validar umbrales con perfiles de contratación comparables.
3. Incorporar documentos y explicaciones con trazabilidad a la fuente.
4. Agregar control de acceso y configuración de alertas.

## Colaboración

Las contribuciones pueden proponerse mediante *issues* y *pull requests*. Evita incluir datos personales, secretos, credenciales o afirmaciones no verificadas sobre personas o entidades.

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un pull request. La arquitectura y las decisiones iniciales están documentadas en [`docs/`](docs/architecture.md).
