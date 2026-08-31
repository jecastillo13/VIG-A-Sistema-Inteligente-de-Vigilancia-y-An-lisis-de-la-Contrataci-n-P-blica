# Arquitectura inicial

## Contexto

VIGÍA convertirá datos abiertos de contratación en indicadores explicables para priorizar revisiones humanas. La arquitectura separa la adquisición de datos, la normalización, las reglas de riesgo y la presentación para que cada resultado pueda reproducirse.

## Componentes

```text
Datos Abiertos SECOP II
        |
        v
Ingesta paginada y reanudable
        |
        v
Validación y normalización
        |
        +------> Registro de cargas y rechazos
        |
        v
PostgreSQL
        |
        +------> Motor de indicadores versionado
        |                    |
        |                    v
        |              Señales y puntaje
        v
API de consulta
        |
        v
Dashboard VIGÍA
```

## Responsabilidades

### Interfaz web

- Consultar la API; no calcular reglas de riesgo.
- Mostrar carga, error, datos incompletos y ausencia de resultados.
- Presentar el desglose del puntaje y enlaces a la fuente.
- Permitir búsqueda, filtros y exportación.

### API

- Validar entradas y aplicar paginación.
- Exponer contratos, entidades, proveedores y señales.
- No devolver secretos ni campos internos innecesarios.
- Mantener contratos de respuesta documentados.

### Ingesta y normalización

- Consultar Socrata mediante HTTPS.
- Paginar, reintentar y reanudar cargas.
- Conservar identificadores y enlaces de origen.
- Registrar filas aceptadas, rechazadas y duplicadas.
- Ser idempotente: repetir una carga no debe duplicar datos.

### Motor de indicadores

- Ejecutar reglas deterministas y versionadas.
- Guardar evidencia, valor observado, umbral y aporte al puntaje.
- Mantener la IA documental fuera del cálculo objetivo inicial.

### PostgreSQL

- Fuente interna de verdad para datos normalizados y resultados.
- Migraciones versionadas y copias de seguridad.
- Restricciones e índices definidos según patrones reales de consulta.

## Tecnología acordada

- Web: React 19, TypeScript, Vinext y Tailwind CSS.
- API: rutas compatibles con el runtime de Vinext; la separación en servicio independiente se evaluará cuando exista carga real.
- Base de datos: PostgreSQL mediante Docker Compose en desarrollo.
- Fuente inicial: API Socrata de Datos Abiertos Colombia.
- Automatización: GitHub Actions.

## Límites de confianza

- Los datos externos se consideran no confiables hasta ser validados.
- Las credenciales solo se reciben por variables de entorno.
- Los documentos contractuales requerirán validación de tipo, tamaño y contenido antes de procesarse.
- La interfaz nunca debe renderizar HTML recibido desde la fuente sin sanitización.

## Observabilidad inicial

Cada carga deberá registrar un identificador, conjunto consultado, intervalo temporal, inicio, fin, estado y conteos de filas. Cada señal deberá registrar la versión de la regla que la produjo.

