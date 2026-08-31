# Contribuir a VIGÍA

Gracias por ayudar a construir VIGÍA. El proyecto prioriza resultados verificables, lenguaje prudente y trazabilidad hasta la fuente original.

## Preparar el entorno

1. Instala Node.js 22.13 o superior y pnpm 11.
2. Ejecuta `pnpm install`.
3. Copia `.env.example` como `.env.local`.
4. Ejecuta `pnpm dev` y abre `http://localhost:3000`.

## Flujo de trabajo

1. Crea o selecciona un issue antes de comenzar.
2. Crea una rama desde `main`:
   - `feat/descripcion-corta` para funcionalidades;
   - `fix/descripcion-corta` para correcciones;
   - `docs/descripcion-corta` para documentación;
   - `chore/descripcion-corta` para mantenimiento.
3. Mantén cada cambio enfocado en un solo objetivo.
4. Ejecuta `pnpm check` antes de abrir el pull request.
5. Explica qué cambia, cómo se verificó y qué limitaciones conserva.

## Convención de commits

Utiliza mensajes breves en modo imperativo. Formato recomendado:

```text
tipo(área): descripción
```

Ejemplos:

- `feat(ingesta): agrega paginación de contratos`
- `fix(riesgo): corrige normalización de cuantías`
- `docs(api): documenta filtros de contratos`

## Requisitos para un pull request

- No incluir secretos, tokens ni datos personales innecesarios.
- Agregar o actualizar pruebas cuando exista lógica de negocio.
- Mantener referencias a la fuente de los datos.
- Evitar lenguaje que afirme corrupción o responsabilidad.
- Documentar cambios en reglas, pesos o umbrales.
- Obtener al menos una revisión antes de fusionar.

## Reportar problemas

Incluye pasos para reproducir, resultado esperado, resultado observado y evidencia no sensible. Las vulnerabilidades no deben publicarse como issues abiertos; repórtalas de manera privada al responsable del repositorio.

