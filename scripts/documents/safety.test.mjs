import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesSignature, safeFileName, validateDocument } from './safety.mjs';

test('sanea rutas y caracteres reservados del nombre', () => {
  assert.equal(safeFileName('../informe:final?.pdf'), 'informe_final_.pdf');
});

test('solo acepta URL HTTPS del dominio oficial', () => {
  assert.throws(() => validateDocument({ extension: 'pdf', sourceUrl: 'https://example.com/file.pdf', declaredSize: 10 }), /dominio/);
  assert.equal(validateDocument({ extension: 'PDF', sourceUrl: 'https://community.secop.gov.co/Public/file', declaredSize: 10 }), 'pdf');
});

test('rechaza tamaño o extensión no permitidos', () => {
  assert.throws(() => validateDocument({ extension: 'exe', sourceUrl: 'https://community.secop.gov.co/file', declaredSize: 10 }), /Extensión/);
  assert.throws(() => validateDocument({ extension: 'pdf', sourceUrl: 'https://community.secop.gov.co/file', declaredSize: 30_000_000 }), /25 MB/);
});

test('verifica firmas PDF y formatos ZIP de Office', () => {
  assert.equal(matchesSignature(Buffer.from('%PDF-1.7'), 'pdf'), true);
  assert.equal(matchesSignature(Buffer.from('not a pdf'), 'pdf'), false);
  assert.equal(matchesSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04]), 'docx'), true);
});
