# Catálogo de reglas de riesgo v1

Versión ejecutable actual: `1.2.0`. Los puntajes sirven para priorizar revisión y no representan probabilidad ni prueba de corrupción.

| Código | Peso | Datos requeridos | Criterio | Limitación principal |
| --- | ---: | --- | --- | --- |
| `DIRECT_VALUE_OUTLIER` | 30 | entidad, modalidad, tipo, valor | Contratación directa con valor ≥ 2 veces la mediana de al menos 8 comparables | Depende del alcance y de la muestra cargada |
| `ENTITY_VALUE_OUTLIER` | 30 | entidad, modalidad, tipo, valor | Valor sobre Q3 + 1,5 × rango intercuartílico de al menos 8 comparables | Un objeto de mayor alcance puede justificarlo |
| `SUPPLIER_RECURRENCE` | 20 | entidad y proveedor | El proveedor tiene 3 o más contratos con la entidad | La recurrencia puede ser legítima |
| `SUPPLIER_CONCENTRATION` | 20 | entidad, proveedor y valor | Al menos 2 contratos y 20 % o más del valor de la muestra | No representa el universo nacional |
| `SIMILAR_OBJECTS_NEARBY` | 15 | entidad, objeto y fecha | Similitud de Jaccard ≥ 0,95 dentro de 15 días; solo pares aislados, sin cadenas repetitivas | El lenguaje institucional repetido puede producir coincidencias |
| `POSSIBLE_SPLITTING` | 15 | modalidad, proveedor, categoría, objeto y fecha | Dos contratos directos del mismo proveedor/categoría, similitud ≥ 0,85 y máximo 30 días | Requiere revisión documental y jurídica |
| `YEAR_END_CONCENTRATION` | 10 | entidad, valor y fecha | Al menos 30 % del valor en noviembre–diciembre y cobertura de 10 meses | Depende de una vigencia suficientemente completa |
| `SINGLE_BIDDER_COMPETITIVE` | 25 | modalidad y oferentes únicos | Un único proveedor con respuesta en un proceso competitivo | El conteo debe verificarse frente a lotes y documentos |
| `SHORT_PUBLICATION_TO_AWARD` | 20 | modalidad, publicación y adjudicación | Menos de 10 días calendario en un proceso competitivo | El cronograma válido depende de la modalidad aplicable |
| `ESTIMATED_VALUE_GAP` | 20 | precio base, valor contratado y lotes | Diferencia absoluta ≥ 25 %, razón de escala ≤ 4× y máximo un lote | Razones mayores se separan como posible calidad de datos |

Cada señal conserva sus valores observados, línea base, tamaño de muestra, explicación y limitación en `risk_signals.evidence`.

Las diez reglas del catálogo inicial están implementadas. Una regla puede permanecer sin señales cuando la muestra no satisface sus condiciones o carece de cobertura suficiente.
