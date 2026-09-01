# Documentos oficiales de SECOP II

## Alcance actual

VIGÍA consulta el conjunto oficial **SECOP II — Archivos Descarga Desde 2025** (`dmgg-8hin`) y relaciona sus registros con los contratos ya almacenados. La carga actual contiene 3.016 documentos correspondientes a 98 de los 100 contratos piloto.

El inventario guarda únicamente metadatos: identificador, contrato, proceso, nombre, extensión, tamaño, descripción, fecha de carga y enlace oficial. Ejecutarlo no descarga los archivos.

```bash
pnpm secop:documents
```

La operación es idempotente: repetirla actualiza los registros existentes sin duplicarlos.

## Descarga controlada

La descarga requiere el identificador exacto de un documento inventariado:

```bash
pnpm document:download -- --document-id=708763166
```

Antes de conservar el archivo, el sistema comprueba:

- que el enlace use HTTPS y pertenezca al dominio oficial `community.secop.gov.co`;
- que la extensión esté permitida (`pdf`, `docx`, `xlsx`, `csv` o `txt`);
- que el tamaño declarado y el recibido no superen 25 MB;
- que el nombre local sea seguro;
- que la firma binaria corresponda al tipo esperado;
- que se pueda calcular y registrar una huella SHA-256.

Los archivos quedan en `data/documents/`, una ruta excluida de Git. La base de datos conserva el estado, tipo MIME, ruta y huella para trazabilidad y detección de duplicados.

## Interfaz y limitaciones

La ficha contractual muestra el total de documentos y los cinco más recientes, con enlace directo al archivo oficial. Que un contrato no tenga documentos inventariados significa que no se encontraron registros asociados en esta fuente y carga; no demuestra que el proceso carezca de documentos en otros módulos o fuentes.

Esta primera parte de la fase 5 todavía no extrae ni interpreta texto. La extracción por página, las citas verificables y la explicación asistida se incorporarán en los siguientes hitos y no modificarán el puntaje objetivo de riesgo.
