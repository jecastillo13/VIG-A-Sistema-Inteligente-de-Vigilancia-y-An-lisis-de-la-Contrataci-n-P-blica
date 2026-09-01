import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePages, excerptAround } from './analysis.mjs';

test('clasifica evidencia y conserva documento y página', () => {
  const findings = analyzePages([{ id: 'doc-1', fileName: 'Estudio.pdf', sourceUrl: 'https://example.test', pages: [{ pageNumber: 3, text: 'PRESUPUESTO OFICIAL\nEl valor estimado corresponde a cien pesos.' }] }]);
  const budget = findings.find((finding) => finding.category === 'budget');
  assert.equal(budget.status, 'found');
  assert.equal(budget.documentId, 'doc-1');
  assert.equal(budget.pageNumber, 3);
  assert.match(budget.excerpt, /PRESUPUESTO OFICIAL/);
  assert.equal(findings.find((finding) => finding.category === 'market').status, 'not_found');
});

test('encuentra términos sin depender de mayúsculas o tildes', () => {
  const findings = analyzePages([{ id: 'doc-2', pages: [{ pageNumber: 1, text: 'ANALISIS DEL SECTOR y precios observados.' }] }]);
  assert.equal(findings.find((finding) => finding.category === 'market').status, 'found');
});

test('prioriza el encabezado formal sobre menciones secundarias', () => {
  const findings = analyzePages([{ id: 'doc-3', pages: [{ pageNumber: 1, text: '1. DEFINICIÓN DE LA NECESIDAD\nLa entidad requiere apoyo.' }, { pageNumber: 9, text: 'La experiencia responde a la necesidad que la entidad pretende satisfacer.' }] }]);
  assert.equal(findings.find((finding) => finding.category === 'need').pageNumber, 1);
});

test('limita el fragmento citado', () => {
  const text = `${'a'.repeat(300)} presupuesto oficial ${'b'.repeat(700)}`;
  assert.ok(excerptAround(text, 300, 19).length <= 600);
});
