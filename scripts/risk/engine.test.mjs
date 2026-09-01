import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateContracts, RULE_VERSION } from './engine.mjs';

function contract(id, value, supplierCode = id, method = 'Contratación directa') {
  return { id, value, supplierCode, procurementMethod: method, contractType: 'Servicios', entityCode: 'E1' };
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
