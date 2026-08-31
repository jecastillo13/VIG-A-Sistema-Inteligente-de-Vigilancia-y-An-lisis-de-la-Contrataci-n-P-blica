# ADR 0002: PostgreSQL mediante Docker

- Estado: aceptada
- Fecha: 2026-08-31

## Decisión

El desarrollo local utilizará PostgreSQL mediante Docker Compose a partir de la Fase 2. La aplicación recibirá la conexión exclusivamente mediante `DATABASE_URL`.

## Justificación

- Ofrece un entorno reproducible entre colaboradores.
- Evita configuraciones diferentes de PostgreSQL en cada equipo.
- Permite probar migraciones desde una base vacía.

## Consecuencias

- Docker será un requisito cuando se implemente persistencia.
- Las pruebas unitarias que no requieran base de datos seguirán ejecutándose sin Docker.
- No se reutilizarán credenciales del entorno local en despliegues.

