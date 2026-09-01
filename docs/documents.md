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

## Extracción de texto por página

Después de descargar y validar un PDF, su texto puede extraerse con:

```bash
pnpm document:extract -- --document-id=708763166
```

Antes de leerlo, el comando recalcula la huella SHA-256 y exige que coincida con la registrada. El resultado se guarda por página junto con el identificador del documento, método y fecha de extracción. Como medida de minimización, se omiten del texto almacenado identificaciones personales, correos y teléfonos detectables. La ficha contractual muestra fragmentos con una referencia reproducible en el formato `Documento <ID> · página <N>`.

Un estado `no_text` indica que el lector no encontró caracteres en el PDF, por ejemplo porque sus páginas contienen imágenes escaneadas. No significa que el documento esté vacío; esos casos requerirán OCR en un hito posterior.

## Interfaz y limitaciones

La ficha contractual muestra el total de documentos y los cinco más recientes, con enlace directo al archivo oficial. Que un contrato no tenga documentos inventariados significa que no se encontraron registros asociados en esta fuente y carga; no demuestra que el proceso carezca de documentos en otros módulos o fuentes.

La extracción conserva el texto técnico, pero todavía no lo interpreta ni genera una explicación asistida. Los resúmenes y la revisión humana se incorporarán en los siguientes hitos y no modificarán el puntaje objetivo de riesgo.
