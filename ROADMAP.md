# Roadmap de VIGÍA — Radar SECOP

## Objetivo del MVP

Construir una plataforma verificable que ingiera contratos reales de SECOP II, calcule indicadores objetivos de riesgo y permita priorizar procesos para revisión humana.

El MVP **no determina corrupción**. Cada alerta debe mostrar su fuente, regla, cálculo y limitaciones.

## Alcance inicial propuesto

- Fuente: SECOP II — Datos Abiertos.
- Cobertura: contratos de una sola vigencia.
- Primera carga: muestra controlada de entidades antes de ampliar al nivel nacional.
- Datos principales: entidades, procesos, contratos y proveedores.
- Resultado: ranking de riesgo, ficha contractual explicable y exportación.
- Fuera del primer MVP: modelos predictivos de corrupción, sanciones, SECOP I, Tienda Virtual, WhatsApp y análisis completo de redes.

## Principios del producto

1. **Trazabilidad:** todo dato e indicador debe enlazar a su fuente.
2. **Explicabilidad:** ningún puntaje puede existir sin desglose.
3. **Reproducibilidad:** las reglas deben producir el mismo resultado con los mismos datos.
4. **Prudencia jurídica:** una alerta solicita revisión; no atribuye responsabilidad.
5. **Calidad antes que volumen:** primero una muestra confiable, luego cobertura nacional.
6. **Privacidad y seguridad:** no almacenar secretos ni datos personales innecesarios.

---

## Fase 0 — Fundamentos del proyecto

**Estado:** completada el 31 de agosto de 2026

**Duración estimada:** 1 semana

### Entregables

- Decisión documentada sobre la vigencia y las entidades piloto.
- Arquitectura inicial: interfaz, API, base de datos y proceso ETL.
- Variables de entorno mediante `.env.example`.
- Convenciones de ramas, commits, issues y pull requests.
- Integración continua para ejecutar revisión de código y compilación.
- Glosario básico de conceptos SECOP.

### Criterios de aceptación

- Un colaborador nuevo puede clonar y ejecutar el proyecto siguiendo el README.
- Cada pull request ejecuta verificaciones automáticas.
- No hay credenciales dentro del repositorio.

---

## Fase 1 — Ingesta de SECOP II

**Estado:** completada el 31 de agosto de 2026

**Duración estimada:** 2 semanas

### Entregables

- Cliente para consultar la API de Datos Abiertos.
- Descarga paginada y reanudable.
- Registro de fecha, fuente y estado de cada carga.
- Normalización inicial de identificadores, fechas, cuantías y modalidades.
- Manejo de límites, reintentos, errores y registros duplicados.
- Comando para cargar una muestra pequeña reproducible.

### Criterios de aceptación

- La misma carga puede repetirse sin duplicar registros.
- Los errores quedan registrados sin detener toda la importación.
- Cada contrato conserva el identificador y enlace de su fuente.
- Existe un reporte de registros recibidos, aceptados y rechazados.

---

## Fase 2 — Modelo de datos y API

**Estado:** Completada localmente con PostgreSQL, API filtrable y dashboard paginado sobre 100 contratos reales de SECOP II

**Duración estimada:** 2 semanas

### Entregables

- Base de datos PostgreSQL.
- Tablas iniciales: `entities`, `suppliers`, `processes`, `contracts`, `data_loads` y `risk_signals`.
- Migraciones versionadas.
- API para listar, buscar y consultar contratos.
- Paginación, filtros y orden por riesgo, valor, entidad, modalidad y fecha.
- Documentación del esquema y los endpoints.

### Criterios de aceptación

- La interfaz deja de depender de datos escritos directamente en el código.
- La consulta de un contrato devuelve su entidad, proveedor y fuente SECOP.
- Las migraciones crean una base nueva sin pasos manuales.

---

## Fase 3 — Motor de indicadores v1

**Duración estimada:** 3 semanas

### Primeros diez indicadores

1. Contratación directa de valor inusual.
2. Valor atípico frente al historial de la entidad.
3. Proveedor recurrente en la misma entidad.
4. Concentración del valor contratado por proveedor.
5. Proceso competitivo con un solo oferente, cuando el dato exista.
6. Tiempo inusualmente corto entre publicación y adjudicación.
7. Contratos con objetos similares en periodos cercanos.
8. Posible fragmentación contractual.
9. Diferencia relevante entre valor previsto y contratado.
10. Contratación concentrada al final de la vigencia.

### Entregables

- Catálogo de reglas con versión, descripción, datos requeridos y limitaciones.
- Cálculo independiente y probado para cada indicador.
- Puntaje normalizado de 0 a 100 con pesos configurables.
- Desglose del aporte de cada indicador.
- Registro de la versión de reglas utilizada en cada resultado.

### Criterios de aceptación

- Cada señal tiene evidencia consultable.
- Los resultados pueden reproducirse con una carga conocida.
- Las reglas tienen pruebas unitarias y casos límite.
- El sistema nunca presenta el puntaje como probabilidad de corrupción.

---

## Fase 4 — Dashboard conectado

**Duración estimada:** 2 semanas

### Entregables

- Métricas calculadas desde la base real.
- Tabla con búsqueda, filtros, orden y paginación.
- Ficha de contrato con datos de SECOP y explicación del riesgo.
- Enlaces a la fuente original.
- Estados de carga, error, ausencia de resultados y datos incompletos.
- Exportación CSV de los resultados filtrados.

### Criterios de aceptación

- No quedan cifras demostrativas confundibles con datos reales.
- Un analista puede ir del ranking a la evidencia de cada indicador.
- La interfaz funciona con teclado y en pantallas pequeñas.

---

## Fase 5 — Documentos y explicación asistida

**Duración estimada:** 3 semanas

### Entregables

- Inventario de documentos disponibles por proceso.
- Descarga controlada con verificación de tipo, tamaño y duplicados.
- Extracción de texto con referencia al documento y a la página.
- Resumen de necesidad, justificación, presupuesto y estudio de mercado.
- Respuesta de “Explícame este contrato” con citas a las fuentes.
- Revisión humana de una muestra de resultados.

### Criterios de aceptación

- Toda afirmación documental incluye una referencia verificable.
- El sistema distingue información ausente de información no encontrada.
- La IA no modifica directamente el puntaje objetivo.

---

## Fase 6 — Alertas, seguridad y piloto

**Duración estimada:** 2 semanas

### Entregables

- Alertas configurables dentro de la aplicación y por correo.
- Control de acceso por roles.
- Registro de auditoría para cambios de reglas y revisiones.
- Copias de seguridad y procedimiento de recuperación.
- Monitoreo de cargas y errores.
- Piloto con un grupo pequeño de usuarios.

### Criterios de aceptación

- Las alertas no se duplican ante la misma condición.
- Los usuarios solo acceden a las funciones autorizadas.
- Existe un canal para marcar falsos positivos y registrar observaciones.
- Los resultados del piloto quedan documentados.

---

## Fase 7 — Expansión

Esta fase comienza únicamente cuando el MVP tenga calidad y uso demostrados.

- Cobertura nacional incremental.
- SECOP I y Tienda Virtual del Estado Colombiano.
- Análisis de adiciones, prórrogas y modificaciones.
- Comparador estadístico por categoría, región y modalidad.
- Redes entre entidades, contratos y proveedores.
- Fuentes complementarias: RUES, sanciones y presupuestos.
- Reportes PDF y API para sistemas externos.
- Calibración con casos históricos debidamente etiquetados.

---

## Hitos

| Hito | Resultado verificable |
| --- | --- |
| M0 | Proyecto reproducible y verificaciones automáticas |
| M1 | Primera carga real e idempotente de SECOP II |
| M2 | API y base de datos consultables |
| M3 | Diez indicadores explicables y probados |
| M4 | Dashboard conectado con ficha contractual |
| M5 | Análisis documental con citas |
| M6 | Piloto controlado con alertas y auditoría |

## Definición de terminado

Una funcionalidad se considera terminada cuando:

- tiene criterios de aceptación comprobados;
- incluye pruebas proporcionales a su riesgo;
- documenta fuentes, supuestos y limitaciones;
- pasa revisión de código y compilación;
- no expone secretos ni datos sensibles;
- mantiene lenguaje prudente y explicable;
- puede ser ejecutada por otro colaborador siguiendo la documentación.

## Decisiones pendientes para iniciar M0

1. Elegir la vigencia inicial.
2. Seleccionar entre 5 y 10 entidades piloto.
3. Definir si PostgreSQL correrá mediante Docker en desarrollo.
4. Acordar los pesos iniciales de los indicadores o mantenerlos iguales durante la primera validación.
5. Identificar dos o tres usuarios que puedan revisar la utilidad del ranking.
