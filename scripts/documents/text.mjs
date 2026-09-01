import path from 'node:path';

export function textFromItems(items) {
  let result = '';
  for (const item of items) {
    if (!item || typeof item.str !== 'string') continue;
    result += item.str;
    result += item.hasEOL ? '\n' : ' ';
  }
  return result
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function redactPersonalData(value) {
  return String(value)
    .replace(/\b(?:C\.?\s*C\.?|c[eé]dula(?:\s+de\s+ciudadan[ií]a)?)\s*(?:N(?:o|ro)?\.?\s*)?[:#-]?\s*[\d.]{6,}/giu, '[IDENTIFICACIÓN OMITIDA]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[CORREO OMITIDO]')
    .replace(/\b(?:tel[eé]fono|celular|m[oó]vil)\s*[:#-]?\s*(?:\+?57\s*)?[\d ()-]{7,}/giu, '[TELÉFONO OMITIDO]');
}

export function resolveStoredDocument(root, storedPath) {
  if (!storedPath) throw new Error('El documento no tiene una ruta local registrada.');
  const allowedRoot = path.resolve(root, 'data', 'documents');
  const resolved = path.resolve(root, storedPath);
  if (resolved !== allowedRoot && !resolved.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error('La ruta registrada está fuera del repositorio documental permitido.');
  }
  return resolved;
}
