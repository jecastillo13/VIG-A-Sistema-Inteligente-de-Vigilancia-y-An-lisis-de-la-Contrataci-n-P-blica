import assert from 'node:assert/strict';
import test from 'node:test';
import { SocrataClient } from './client.mjs';

test('construye consultas Socrata con parámetros codificados', () => {
  const client = new SocrataClient({ baseUrl: 'https://example.test/resource', datasetId: 'abcd-1234' });
  const url = client.buildUrl({ '$limit': 50, '$where': "codigo_entidad=123" });
  assert.equal(url.origin, 'https://example.test');
  assert.equal(url.searchParams.get('$limit'), '50');
  assert.equal(url.searchParams.get('$where'), 'codigo_entidad=123');
});

test('devuelve una página JSON', async () => {
  const fetchImpl = async () => new Response(JSON.stringify([{ id_contrato: '1' }]), { status: 200 });
  const client = new SocrataClient({ baseUrl: 'https://example.test/resource', datasetId: 'abcd-1234', fetchImpl });
  assert.deepEqual(await client.fetchPage({ '$limit': 1 }), [{ id_contrato: '1' }]);
});

