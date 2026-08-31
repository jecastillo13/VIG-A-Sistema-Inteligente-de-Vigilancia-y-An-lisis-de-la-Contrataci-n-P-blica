# VIGÍA — Radar SECOP

Prototipo de una plataforma para analizar y priorizar factores de riesgo en la contratación pública colombiana.

> Los puntajes e indicadores orientan la revisión humana. No constituyen prueba de irregularidad, responsabilidad fiscal, disciplinaria, penal ni corrupción.

## Estado actual

Esta primera versión contiene un dashboard interactivo con datos demostrativos:

- panorama nacional y métricas principales;
- ranking de contratos priorizados;
- búsqueda por contrato, entidad o proveedor;
- selección y explicación del puntaje de riesgo;
- interfaz adaptable a computador y móvil.

Todavía no consume información real de SECOP.

Consulta la [hoja de ruta del proyecto](ROADMAP.md) para conocer las fases, entregables y criterios de aceptación del MVP.

## Requisitos

- Node.js 22.13 o superior
- pnpm 10 o superior

## Ejecutar localmente

```bash
git clone https://github.com/jecastillo13/VIG-A-Sistema-Inteligente-de-Vigilancia-y-An-lisis-de-la-Contrataci-n-P-blica.git
cd VIG-A-Sistema-Inteligente-de-Vigilancia-y-An-lisis-de-la-Contrataci-n-P-blica
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

Si `pnpm` no está instalado, ejecuta primero `npm install -g pnpm`.

## Comandos

```bash
pnpm dev      # inicia el entorno local
pnpm build    # genera una compilación de producción
pnpm lint     # revisa el código
pnpm format   # aplica el formato del proyecto
```

## Próximos pasos sugeridos

1. Conectar los conjuntos abiertos de SECOP II.
2. Diseñar el esquema de procesos, contratos, entidades y proveedores.
3. Implementar los primeros diez indicadores reproducibles.
4. Incorporar documentos y explicaciones con trazabilidad a la fuente.
5. Agregar pruebas, control de acceso y configuración de alertas.

## Colaboración

Las contribuciones pueden proponerse mediante *issues* y *pull requests*. Evita incluir datos personales, secretos, credenciales o afirmaciones no verificadas sobre personas o entidades.
