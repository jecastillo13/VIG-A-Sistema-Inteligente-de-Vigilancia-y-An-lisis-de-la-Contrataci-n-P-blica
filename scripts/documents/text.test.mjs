import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { redactPersonalData, resolveStoredDocument, textFromItems } from './text.mjs';

test('conserva saltos de página y normaliza espacios del texto', () => {
  assert.equal(textFromItems([{ str: 'Línea', hasEOL: false }, { str: 'uno', hasEOL: true }, { str: 'Final', hasEOL: false }]), 'Línea uno\nFinal');
});

test('rechaza rutas fuera del almacén documental', () => {
  const root = path.resolve('proyecto');
  assert.throws(() => resolveStoredDocument(root, '../secreto.pdf'), /fuera/);
  assert.equal(resolveStoredDocument(root, 'data/documents/contrato/archivo.pdf'), path.resolve(root, 'data/documents/contrato/archivo.pdf'));
});

test('omite identificaciones, correos y teléfonos personales', () => {
  const source = 'C.C. No. 1.234.567.890, correo persona@example.com, celular: 300 123 4567';
  const redacted = redactPersonalData(source);
  assert.equal(redacted.includes('1.234.567.890'), false);
  assert.equal(redacted.includes('persona@example.com'), false);
  assert.equal(redacted.includes('300 123 4567'), false);
  assert.match(redacted, /IDENTIFICACIÓN OMITIDA/);
});
