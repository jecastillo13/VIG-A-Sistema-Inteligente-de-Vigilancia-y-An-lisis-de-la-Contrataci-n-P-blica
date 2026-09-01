# Catálogo de reglas de riesgo v1

Versión ejecutable actual: `1.0.0`. Los puntajes sirven para priorizar revisión y no representan probabilidad ni prueba de corrupción.

| Código | Peso | Datos requeridos | Criterio | Limitación principal |
| --- | ---: | --- | --- | --- |
| `DIRECT_VALUE_OUTLIER` | 30 | entidad, modalidad, tipo, valor | Contratación directa con valor ≥ 2 veces la mediana de al menos 8 comparables | Depende del alcance y de la muestra cargada |
| `ENTITY_VALUE_OUTLIER` | 30 | entidad, modalidad, tipo, valor | Valor sobre Q3 + 1,5 × rango intercuartílico de al menos 8 comparables | Un objeto de mayor alcance puede justificarlo |
| `SUPPLIER_RECURRENCE` | 20 | entidad y proveedor | El proveedor tiene 3 o más contratos con la entidad | La recurrencia puede ser legítima |
| `SUPPLIER_CONCENTRATION` | 20 | entidad, proveedor y valor | Al menos 2 contratos y 20 % o más del valor de la muestra | No representa el universo nacional |

Cada señal conserva sus valores observados, línea base, tamaño de muestra, explicación y limitación en `risk_signals.evidence`.

## Indicadores pendientes por datos

- Único oferente: requiere datos de ofertas.
- Tiempo publicación–adjudicación: requiere fechas del proceso.
- Objetos similares y posible fragmentación: requiere normalización textual y ventanas temporales validadas.
- Diferencia entre valor previsto y contratado: requiere valor estimado del proceso.
- Concentración al cierre de vigencia: se activará al ampliar la muestra a todo 2025 y más entidades.
