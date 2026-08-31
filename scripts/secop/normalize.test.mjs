import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeContract } from './normalize.mjs';

const validRow = {
  id_contrato: 'CO1.PCCNTR.1',
  proceso_de_compra: 'CO1.BDOS.1',
  fecha_de_firma: '2025-01-15T00:00:00.000',
  valor_del_contrato: '1250000',
  nombre_entidad: 'ENTIDAD DE PRUEBA',
  codigo_entidad: '123',
  proveedor_adjudicado: 'PROVEEDOR DE PRUEBA',
  urlproceso: { url: 'https://community.secop.gov.co/example' },
};

test('normaliza un contrato válido', () => {
  const result = normalizeContract(validRow);
  assert.equal(result.ok, true);
  assert.equal(result.value.value, 1_250_000);
  assert.equal(result.value.entity.code, '123');
  assert.equal(result.value.source.processUrl, 'https://community.secop.gov.co/example');
});

test('rechaza contratos sin identificador', () => {
  const result = normalizeContract({ ...validRow, id_contrato: '' });
  assert.deepEqual(result, { ok: false, reason: 'missing_contract_id' });
});

test('rechaza valores negativos o fechas inválidas', () => {
  assert.equal(normalizeContract({ ...validRow, valor_del_contrato: '-1' }).reason, 'invalid_contract_value');
  assert.equal(normalizeContract({ ...validRow, fecha_de_firma: 'no-es-fecha' }).reason, 'invalid_signature_date');
});

