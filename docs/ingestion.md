# Ingesta de contratos SECOP II

## Fuente

La primera ingesta consulta el conjunto oficial **SECOP II — Contratos Electrónicos** (`jbjy-vk9h`) mediante la API Socrata de Datos Abiertos Colombia.

## Métricas de procesos

Después de importar los contratos en PostgreSQL, vincula publicación, adjudicación, precio base, valor adjudicado, lotes y oferentes mediante el `noticeUID` del enlace oficial:

```bash
pnpm secop:processes
```

El comando consulta el conjunto oficial [SECOP II — Procesos de Contratación](https://www.datos.gov.co/resource/p6dx-8zbt) y actualiza únicamente procesos asociados a contratos locales. En la muestra inicial enlazó 98 de 100 contratos; los dos restantes permanecen explícitamente sin métricas, sin completar valores por inferencia.

## Ejecutar una muestra

```bash
pnpm secop:ingest -- --year=2025 --entity=invias --limit=100 --page-size=50
```

Opciones:

- `--year`: vigencia basada en la fecha de firma.
- `--entity`: clave de una entidad piloto con código verificado.
- `--limit`: máximo de filas solicitadas, hasta 10.000.
- `--page-size`: filas por página, hasta 1.000.
- `--reset`: reinicia la carga y descarta el punto de continuación local.

Los contratos normalizados se escriben en `data/runtime/` y el resumen en `outputs/secop/`. Ambos directorios son locales y están excluidos de Git.

## Reanudación e idempotencia

Después de cada página se guarda un punto de continuación. Si la ejecución falla, el mismo comando continúa desde el siguiente desplazamiento. Los contratos se indexan por `id_contrato`, por lo que una fila repetida actualiza el registro existente y no crea duplicados.

## Resolver entidades piloto

```bash
pnpm secop:entities
```

El comando presenta candidatos obtenidos desde la fuente. Un código solo debe incorporarse a `config.mjs` después de verificar que el nombre, NIT y contratación correspondan a la entidad esperada. Los nombres no se usan como llaves permanentes.

## Token opcional

Las consultas públicas funcionan sin token para muestras pequeñas. Para cargas mayores puede configurarse `SOCRATA_APP_TOKEN` en `.env.local`. Nunca se debe guardar el token en Git.

## Datos conservados

La normalización conserva identificadores contractuales, entidad, proveedor, modalidad, fechas, cuantía, categoría y enlace al proceso. No conserva documentos de identidad, cuentas bancarias, domicilios, supervisores ni representantes legales porque no son necesarios en esta fase.
