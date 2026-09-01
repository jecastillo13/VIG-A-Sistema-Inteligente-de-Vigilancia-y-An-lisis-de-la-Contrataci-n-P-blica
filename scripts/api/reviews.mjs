export const REVIEW_CATEGORIES = new Set(['need', 'justification', 'budget', 'market']);
export const REVIEW_DECISIONS = new Set(['confirmed', 'rejected']);

export function validateReview(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('El cuerpo de la revisión no es válido.');
  const category = String(value.category || '');
  const decision = String(value.decision || '');
  const note = value.note == null ? null : String(value.note).trim();
  if (!REVIEW_CATEGORIES.has(category)) throw new Error('La categoría de revisión no es válida.');
  if (!REVIEW_DECISIONS.has(decision)) throw new Error('La decisión de revisión no es válida.');
  if (note && note.length > 500) throw new Error('La nota no puede superar 500 caracteres.');
  return { category, decision, note: note || null };
}
