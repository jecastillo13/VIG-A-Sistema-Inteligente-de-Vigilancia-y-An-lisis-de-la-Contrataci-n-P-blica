export const RULE_VERSION = '1.0.0';

export const RULES = {
  DIRECT_VALUE_OUTLIER: { weight: 30, minimumSample: 8 },
  ENTITY_VALUE_OUTLIER: { weight: 30, minimumSample: 8 },
  SUPPLIER_RECURRENCE: { weight: 20, minimumContracts: 3 },
  SUPPLIER_CONCENTRATION: { weight: 20, minimumShare: 0.2, minimumContracts: 2 },
};

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

  for (const contract of contracts) {
    const key = comparableKey(contract);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(contract.value);
    entityTotals.set(contract.entityCode, (entityTotals.get(contract.entityCode) || 0) + contract.value);
    if (contract.supplierCode) {
      const supplierKey = `${contract.entityCode}|${contract.supplierCode}`;
      const current = supplierStats.get(supplierKey) || { count: 0, value: 0 };
      supplierStats.set(supplierKey, { count: current.count + 1, value: current.value + contract.value });
    }
  }

  const signals = [];
  const add = (contract, ruleCode, score, evidence) => signals.push({ contractId: contract.id, ruleCode, ruleVersion: RULE_VERSION, score, evidence });

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
  }
  return signals;
}
