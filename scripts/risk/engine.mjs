export const RULE_VERSION = '1.1.0';

export const RULES = {
  DIRECT_VALUE_OUTLIER: { weight: 30, minimumSample: 8 },
  ENTITY_VALUE_OUTLIER: { weight: 30, minimumSample: 8 },
  SUPPLIER_RECURRENCE: { weight: 20, minimumContracts: 3 },
  SUPPLIER_CONCENTRATION: { weight: 20, minimumShare: 0.2, minimumContracts: 2 },
  SIMILAR_OBJECTS_NEARBY: { weight: 15, minimumSimilarity: 0.95, maximumDays: 15 },
  POSSIBLE_SPLITTING: { weight: 15, minimumSimilarity: 0.85, maximumDays: 30 },
  YEAR_END_CONCENTRATION: { weight: 10, minimumShare: 0.3, minimumMonths: 10 },
};

const STOP_WORDS = new Set(['para', 'como', 'con', 'del', 'las', 'los', 'una', 'por', 'que', 'sus', 'y', 'en', 'de', 'la', 'el', 'un', 'al']);

function tokens(value) {
  return new Set(String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length >= 3 && !STOP_WORDS.has(word)));
}

function similarity(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size < 8 || b.size < 8) return 0;
  const intersection = [...a].filter((word) => b.has(word)).length;
  return intersection / new Set([...a, ...b]).size;
}

function daysBetween(left, right) {
  return Math.abs(new Date(left).valueOf() - new Date(right).valueOf()) / 86_400_000;
}

function quantile(values, percentile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sorted[lower + 1] === undefined ? sorted[lower] : sorted[lower] + fraction * (sorted[lower + 1] - sorted[lower]);
}

function comparableKey(contract) {
  return `${contract.entityCode}|${contract.procurementMethod || ''}|${contract.contractType || ''}`;
}

export function evaluateContracts(contracts) {
  const groups = new Map();
  const supplierStats = new Map();
  const entityTotals = new Map();
  const entityYears = new Map();

  for (const contract of contracts) {
    const key = comparableKey(contract);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(contract.value);
    entityTotals.set(contract.entityCode, (entityTotals.get(contract.entityCode) || 0) + contract.value);
    if (contract.signedAt) {
      const date = new Date(contract.signedAt);
      const yearKey = `${contract.entityCode}|${date.getUTCFullYear()}`;
      const current = entityYears.get(yearKey) || { months: new Set(), total: 0, yearEnd: 0 };
      current.months.add(date.getUTCMonth() + 1);
      current.total += contract.value;
      if (date.getUTCMonth() >= 10) current.yearEnd += contract.value;
      entityYears.set(yearKey, current);
    }
    if (contract.supplierCode) {
      const supplierKey = `${contract.entityCode}|${contract.supplierCode}`;
      const current = supplierStats.get(supplierKey) || { count: 0, value: 0 };
      supplierStats.set(supplierKey, { count: current.count + 1, value: current.value + contract.value });
    }
  }

  const signals = [];
  const add = (contract, ruleCode, score, evidence) => signals.push({ contractId: contract.id, ruleCode, ruleVersion: RULE_VERSION, score, evidence });
  const similarMatches = new Map();
  const similarMatchCounts = new Map();
  const splittingMatches = new Map();

  function keepBest(map, contract, other, score, dayDifference) {
    if (!map.has(contract.id) || map.get(contract.id).similarity < score) map.set(contract.id, { contract, otherId: other.id, similarity: score, dayDifference });
  }

  for (let leftIndex = 0; leftIndex < contracts.length; leftIndex += 1) {
    const left = contracts[leftIndex];
    if (!left.signedAt || !left.description) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < contracts.length; rightIndex += 1) {
      const right = contracts[rightIndex];
      if (left.entityCode !== right.entityCode || !right.signedAt || !right.description) continue;
      const dayDifference = daysBetween(left.signedAt, right.signedAt);
      if (dayDifference > RULES.SIMILAR_OBJECTS_NEARBY.maximumDays) continue;
      const score = similarity(left.description, right.description);
      if (score >= RULES.SIMILAR_OBJECTS_NEARBY.minimumSimilarity) {
        keepBest(similarMatches, left, right, score, dayDifference);
        keepBest(similarMatches, right, left, score, dayDifference);
        similarMatchCounts.set(left.id, (similarMatchCounts.get(left.id) || 0) + 1);
        similarMatchCounts.set(right.id, (similarMatchCounts.get(right.id) || 0) + 1);
      }
      const possibleSplit = /directa/i.test(left.procurementMethod || '') && /directa/i.test(right.procurementMethod || '')
        && left.supplierCode && left.supplierCode === right.supplierCode && left.mainCategoryCode && left.mainCategoryCode === right.mainCategoryCode
        && dayDifference <= RULES.POSSIBLE_SPLITTING.maximumDays && score >= RULES.POSSIBLE_SPLITTING.minimumSimilarity;
      if (possibleSplit) {
        keepBest(splittingMatches, left, right, score, dayDifference);
        keepBest(splittingMatches, right, left, score, dayDifference);
      }
    }
  }

  for (const contract of contracts) {
    const peers = groups.get(comparableKey(contract)) || [];
    const median = quantile(peers, 0.5);
    const q1 = quantile(peers, 0.25);
    const q3 = quantile(peers, 0.75);
    const upperFence = q3 + 1.5 * (q3 - q1);

    if (/directa/i.test(contract.procurementMethod || '') && peers.length >= RULES.DIRECT_VALUE_OUTLIER.minimumSample && median > 0 && contract.value >= median * 2) {
      add(contract, 'DIRECT_VALUE_OUTLIER', RULES.DIRECT_VALUE_OUTLIER.weight, {
        explanation: 'El valor es al menos dos veces la mediana de contratos directos comparables de la misma entidad y tipo.',
        observedValue: contract.value, median, ratio: contract.value / median, sampleSize: peers.length,
        limitation: 'La señal depende de la muestra cargada y no implica irregularidad.',
      });
    }

    if (peers.length >= RULES.ENTITY_VALUE_OUTLIER.minimumSample && contract.value > upperFence && upperFence > 0) {
      add(contract, 'ENTITY_VALUE_OUTLIER', RULES.ENTITY_VALUE_OUTLIER.weight, {
        explanation: 'El valor supera el límite superior del rango intercuartílico de contratos comparables.',
        observedValue: contract.value, q1, q3, upperFence, sampleSize: peers.length,
        limitation: 'Una diferencia de alcance contractual puede explicar el valor atípico.',
      });
    }

    if (contract.supplierCode) {
      const supplier = supplierStats.get(`${contract.entityCode}|${contract.supplierCode}`);
      if (supplier.count >= RULES.SUPPLIER_RECURRENCE.minimumContracts) {
        add(contract, 'SUPPLIER_RECURRENCE', RULES.SUPPLIER_RECURRENCE.weight, {
          explanation: 'El proveedor aparece en tres o más contratos de la misma entidad dentro de la muestra.',
          contractCount: supplier.count, supplierCode: contract.supplierCode,
          limitation: 'La recurrencia puede ser legítima y requiere revisar competencia, objeto y periodo.',
        });
      }
      const share = supplier.value / entityTotals.get(contract.entityCode);
      if (supplier.count >= RULES.SUPPLIER_CONCENTRATION.minimumContracts && share >= RULES.SUPPLIER_CONCENTRATION.minimumShare) {
        add(contract, 'SUPPLIER_CONCENTRATION', RULES.SUPPLIER_CONCENTRATION.weight, {
          explanation: 'El proveedor concentra al menos el 20 % del valor contratado por la entidad en la muestra.',
          supplierValue: supplier.value, entityValue: entityTotals.get(contract.entityCode), share,
          limitation: 'La concentración se calcula únicamente sobre los contratos cargados.',
        });
      }
    }

    const similar = similarMatches.get(contract.id);
    if (similar && similarMatchCounts.get(contract.id) === 1) add(contract, 'SIMILAR_OBJECTS_NEARBY', RULES.SIMILAR_OBJECTS_NEARBY.weight, {
      explanation: 'Se encontró otro contrato de la entidad con objeto casi idéntico y firma dentro de una ventana de 15 días.',
      relatedContractId: similar.otherId, similarity: similar.similarity, dayDifference: similar.dayDifference, nearbyMatches: similarMatchCounts.get(contract.id),
      limitation: 'El lenguaje institucional repetido puede producir similitud sin que exista relación indebida.',
    });

    const split = splittingMatches.get(contract.id);
    if (split) add(contract, 'POSSIBLE_SPLITTING', RULES.POSSIBLE_SPLITTING.weight, {
      explanation: 'Otro contrato directo del mismo proveedor y categoría tiene objeto muy similar y fecha cercana.',
      relatedContractId: split.otherId, similarity: split.similarity, dayDifference: split.dayDifference,
      limitation: 'Es una señal de revisión; confirmar alcance, autonomía contractual y reglas aplicables exige análisis documental.',
    });

    if (contract.signedAt) {
      const date = new Date(contract.signedAt);
      const year = entityYears.get(`${contract.entityCode}|${date.getUTCFullYear()}`);
      const share = year?.yearEnd / year?.total;
      if (date.getUTCMonth() >= 10 && year.months.size >= RULES.YEAR_END_CONCENTRATION.minimumMonths && share >= RULES.YEAR_END_CONCENTRATION.minimumShare) {
        add(contract, 'YEAR_END_CONCENTRATION', RULES.YEAR_END_CONCENTRATION.weight, {
          explanation: 'La entidad concentra al menos el 30 % del valor anual de la muestra en noviembre y diciembre.',
          yearEndValue: year.yearEnd, annualValue: year.total, share, coveredMonths: year.months.size,
          limitation: 'Solo se activa cuando la muestra cubre al menos diez meses de la vigencia.',
        });
      }
    }
  }
  return signals;
}
