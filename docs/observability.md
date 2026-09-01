# Observabilidad con Sentry

Sentry es opcional y permanece desactivado cuando los DSN están vacíos. La integración cubre errores no controlados de React y excepciones internas de la API local.

## Configuración

1. Crea dos proyectos JavaScript en Sentry: uno para la web y otro para la API Node.
2. Copia `.env.example` a `.env.local` si todavía no existe.
3. Añade los DSN únicamente en `.env.local`:

```dotenv
NEXT_PUBLIC_SENTRY_DSN=https://clave-publica@organizacion.ingest.sentry.io/proyecto-web
SENTRY_DSN=https://clave-servidor@organizacion.ingest.sentry.io/proyecto-api
NEXT_PUBLIC_SENTRY_ENVIRONMENT=development
SENTRY_ENVIRONMENT=development
```

4. Reinicia `pnpm dev:all` después de cambiar variables de entorno.

El DSN del navegador es visible por diseño, pero debe mantenerse fuera de Git para separar ambientes. No configures tokens de autenticación ni claves de administración en variables `NEXT_PUBLIC_*`.

## Privacidad y límites

- La recolección de usuario, cookies, cuerpos HTTP, datos de IA generativa, consultas de base de datos y GraphQL está desactivada mediante `dataCollection`.
- No se recopilan breadcrumbs.
- El muestreo de trazas está desactivado.
- Antes de enviar, se eliminan usuario, solicitud, campos adicionales, módulos y nombre del servidor.
- Se omiten identificadores SECOP, correos, números largos, rutas locales, rutas documentales y consultas de URL detectables.
- Solo se conservan contextos técnicos de navegador, dispositivo, sistema operativo y runtime.

No añadas manualmente contratos, proveedores, texto extraído, cuerpos de solicitudes, consultas SQL ni documentos como contexto de Sentry.

## Verificación segura

La compilación y las pruebas no envían eventos porque `.env.example` no activa Sentry. Para validar una cuenta real, configura un ambiente de desarrollo separado y provoca únicamente un error sintético sin datos contractuales. Comprueba en Sentry que el evento no incluya `user`, `request`, `extra` ni breadcrumbs antes de habilitar otro ambiente.
