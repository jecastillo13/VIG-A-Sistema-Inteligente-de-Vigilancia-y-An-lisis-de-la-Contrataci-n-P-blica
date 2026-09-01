import path from 'node:path';

export const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'csv', 'txt']);
export const MAX_DOCUMENT_BYTES = 25_000_000;

export function safeFileName(value) {
  const base = path.basename(String(value || 'documento')).normalize('NFKC');
  return base.replace(/[<>:"/\\|?*\p{Cc}]/gu, '_').replace(/\s+/g, ' ').slice(0, 180) || 'documento';
}

export function validateDocument({ extension, sourceUrl, declaredSize }) {
  const normalizedExtension = String(extension || '').toLowerCase().replace(/^\./, '');
  if (!ALLOWED_EXTENSIONS.has(normalizedExtension)) throw new Error(`Extensión no permitida: ${normalizedExtension || 'vacía'}`);
  const parsed = new URL(sourceUrl);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'community.secop.gov.co') throw new Error('La URL no pertenece al dominio HTTPS oficial de SECOP.');
  if (declaredSize != null && Number(declaredSize) > MAX_DOCUMENT_BYTES) throw new Error('El tamaño declarado supera el límite de 25 MB.');
  return normalizedExtension;
}

export function matchesSignature(buffer, extension) {
  if (extension === 'pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (extension === 'docx' || extension === 'xlsx') return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (extension === 'csv' || extension === 'txt') return !buffer.subarray(0, 512).includes(0);
  return false;
}
