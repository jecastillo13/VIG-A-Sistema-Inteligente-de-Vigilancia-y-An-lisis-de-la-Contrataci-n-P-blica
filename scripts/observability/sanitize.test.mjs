import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeSentryEvent, sanitizeTelemetryText } from './sanitize.mjs';

test('omite identificadores, correos, consultas y rutas documentales', () => {
  const value = sanitizeTelemetryText('CO1.PCCNTR.7257661 persona@example.com data/documents/contrato/archivo.pdf https://example.test/path?id=123');
  assert.equal(value.includes('7257661'), false);
  assert.equal(value.includes('persona@example.com'), false);
  assert.equal(value.includes('archivo.pdf'), false);
  assert.equal(value.includes('id=123'), false);
});

test('elimina contexto personal y breadcrumbs del evento', () => {
  const event = sanitizeSentryEvent({ message: 'Error CO1.PCCNTR.7257661', user: { id: 'persona' }, request: { data: 'contrato' }, extra: { supplier: 'nombre' }, breadcrumbs: [{ message: 'clic' }], contexts: { runtime: { name: 'node' }, contract: { id: 'secret' } } });
  assert.equal(event.user, undefined);
  assert.equal(event.request, undefined);
  assert.equal(event.extra, undefined);
  assert.deepEqual(event.breadcrumbs, []);
  assert.deepEqual(Object.keys(event.contexts), ['runtime']);
  assert.equal(event.message.includes('7257661'), false);
});
