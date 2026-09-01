import assert from 'node:assert/strict';
import test from 'node:test';
import { validateReview } from './reviews.mjs';

test('acepta una decisión humana válida', () => {
  assert.deepEqual(validateReview({ category: 'need', decision: 'confirmed', note: ' Cita correcta ' }), { category: 'need', decision: 'confirmed', note: 'Cita correcta' });
});

test('rechaza categorías y decisiones desconocidas', () => {
  assert.throws(() => validateReview({ category: 'other', decision: 'confirmed' }), /categoría/);
  assert.throws(() => validateReview({ category: 'need', decision: 'maybe' }), /decisión/);
});

test('limita la extensión de la nota', () => {
  assert.throws(() => validateReview({ category: 'need', decision: 'confirmed', note: 'a'.repeat(501) }), /500/);
});
