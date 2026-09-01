import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateContracts, RULE_VERSION } from './engine.mjs';

function contract(id, value, supplierCode = id, method = 'Contratación directa', overrides = {}) {
  return { id, value, supplierCode, procurementMethod: method, contractType: 'Servicios', entityCode: 'E1', ...overrides };
}

test('detecta un valor directo inusual con evidencia reproducible', () => {
  const contracts = Array.from({ length: 8 }, (_, index) => contract(`C${index}`, index === 7 ? 300 : 100));
  const signal = evaluateContracts(contracts).find((item) => item.contractId === 'C7' && item.ruleCode === 'DIRECT_VALUE_OUTLIER');
  assert.equal(signal.ruleVersion, RULE_VERSION);
  assert.equal(signal.score, 30);
  assert.equal(signal.evidence.median, 100);
  assert.equal(signal.evidence.sampleSize, 8);
});

test('no calcula atípicos con una muestra insuficiente', () => {
  const contracts = [contract('C1', 100), contract('C2', 1000)];
  assert.equal(evaluateContracts(contracts).some((item) => item.ruleCode.includes('OUTLIER')), false);
});

test('detecta recurrencia de proveedor en la misma entidad', () => {
  const contracts = [contract('C1', 10, 'P1'), contract('C2', 10, 'P1'), contract('C3', 10, 'P1')];
  const recurrence = evaluateContracts(contracts).filter((item) => item.ruleCode === 'SUPPLIER_RECURRENCE');
  assert.equal(recurrence.length, 3);
  assert.equal(recurrence[0].evidence.contractCount, 3);
});

test('la concentración exige al menos dos contratos del proveedor', () => {
  const contracts = [contract('C1', 90, 'P1'), contract('C2', 10, 'P2')];
  assert.equal(evaluateContracts(contracts).some((item) => item.ruleCode === 'SUPPLIER_CONCENTRATION'), false);
});

test('detecta objetos muy similares firmados en fechas cercanas', () => {
  const description = 'Realizar mantenimiento preventivo correctivo integral de la infraestructura vial urbana del municipio durante la vigencia';
  const contracts = [
    contract('C1', 10, 'P1', 'Licitación', { description, signedAt: '2025-03-01', mainCategoryCode: 'V1.1' }),
    contract('C2', 10, 'P2', 'Licitación', { description, signedAt: '2025-03-10', mainCategoryCode: 'V1.1' }),
  ];
  const similar = evaluateContracts(contracts).filter((item) => item.ruleCode === 'SIMILAR_OBJECTS_NEARBY');
  assert.equal(similar.length, 2);
  assert.equal(similar[0].evidence.relatedContractId, 'C2');
});

test('suprime plantillas repetidas masivamente', () => {
  const description = 'Prestar servicios profesionales especializados para apoyo administrativo técnico financiero jurídico institucional';
  const contracts = Array.from({ length: 5 }, (_, index) => contract(`C${index}`, 10, `P${index}`, 'Licitación', { description, signedAt: `2025-03-${String(index + 1).padStart(2, '0')}` }));
  assert.equal(evaluateContracts(contracts).some((item) => item.ruleCode === 'SIMILAR_OBJECTS_NEARBY'), false);
});

test('posible fragmentación exige mismo proveedor, categoría y contratación directa', () => {
  const description = 'Prestar servicios especializados para mantenimiento integral preventivo correctivo de equipos tecnológicos institucionales';
  const contracts = [
    contract('C1', 10, 'P1', 'Contratación directa', { description, signedAt: '2025-04-01', mainCategoryCode: 'V1.2' }),
    contract('C2', 10, 'P1', 'Contratación directa', { description, signedAt: '2025-04-10', mainCategoryCode: 'V1.2' }),
  ];
  assert.equal(evaluateContracts(contracts).filter((item) => item.ruleCode === 'POSSIBLE_SPLITTING').length, 2);
});

test('concentración de cierre exige cobertura de al menos diez meses', () => {
  const contracts = Array.from({ length: 12 }, (_, month) => contract(`C${month + 1}`, month === 11 ? 100 : 10, `P${month}`, 'Licitación', { signedAt: `2025-${String(month + 1).padStart(2, '0')}-15` }));
  const yearEnd = evaluateContracts(contracts).filter((item) => item.ruleCode === 'YEAR_END_CONCENTRATION');
  assert.equal(yearEnd.length, 2);
  assert.equal(yearEnd.every((item) => item.evidence.coveredMonths === 12), true);
});

test('único oferente solo aplica a procesos competitivos', () => {
  const direct = contract('C1', 10, 'P1', 'Contratación directa', { uniqueBidderCount: 1 });
  const competitive = contract('C2', 10, 'P2', 'Licitación pública', { uniqueBidderCount: 1 });
  const signals = evaluateContracts([direct, competitive]).filter((item) => item.ruleCode === 'SINGLE_BIDDER_COMPETITIVE');
  assert.deepEqual(signals.map((item) => item.contractId), ['C2']);
});

test('detecta una ventana competitiva inferior a diez días', () => {
  const contracts = [contract('C1', 10, 'P1', 'Licitación pública', { publishedAt: '2025-05-01', awardedAt: '2025-05-05' })];
  const signal = evaluateContracts(contracts).find((item) => item.ruleCode === 'SHORT_PUBLICATION_TO_AWARD');
  assert.equal(signal.evidence.awardDays, 4);
});

test('detecta diferencia de valor y excluye procesos con varios lotes', () => {
  const flagged = contract('C1', 150, 'P1', 'Licitación pública', { estimatedValue: 100, lotCount: 1 });
  const multipleLots = contract('C2', 150, 'P2', 'Licitación pública', { estimatedValue: 100, lotCount: 2 });
  const signals = evaluateContracts([flagged, multipleLots]).filter((item) => item.ruleCode === 'ESTIMATED_VALUE_GAP');
  assert.deepEqual(signals.map((item) => item.contractId), ['C1']);
});

test('trata diferencias extremas de escala como calidad de datos y no riesgo', () => {
  const contractWithBadScale = contract('C1', 100, 'P1', 'Licitación pública', { estimatedValue: 100000, lotCount: 1 });
  assert.equal(evaluateContracts([contractWithBadScale]).some((item) => item.ruleCode === 'ESTIMATED_VALUE_GAP'), false);
});
