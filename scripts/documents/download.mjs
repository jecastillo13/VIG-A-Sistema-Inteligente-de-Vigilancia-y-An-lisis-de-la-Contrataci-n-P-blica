import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { loadLocalEnv } from '../secop/config.mjs';
import { matchesSignature, MAX_DOCUMENT_BYTES, safeFileName, validateDocument } from './safety.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
const documentId = process.argv.find((argument) => argument.startsWith('--document-id='))?.slice(14);
if (!documentId) throw new Error('Debes indicar --document-id=<ID>.');
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
await database.connect();

try {
  const result = await database.query('SELECT * FROM documents WHERE id=$1', [documentId]);
  if (!result.rows[0]) throw new Error('Documento no encontrado en el inventario.');
  const document = result.rows[0];
  const extension = validateDocument({ extension: document.extension, sourceUrl: document.source_url, declaredSize: document.size_bytes });
  const response = await fetch(document.source_url, { redirect: 'error', signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`SECOP respondió ${response.status}.`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_DOCUMENT_BYTES) throw new Error('El archivo descargado supera el límite de 25 MB.');
  if (!matchesSignature(buffer, extension)) throw new Error('La firma binaria no coincide con la extensión declarada.');
  const directory = path.join(process.cwd(), 'data', 'documents', document.contract_id);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${document.id}-${safeFileName(document.file_name)}`;
  const location = path.join(directory, filename);
  const temporary = `${location}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, buffer, { flag: 'wx' });
  await fs.rename(temporary, location);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const mimeType = extension === 'pdf' ? 'application/pdf' : extension === 'csv' ? 'text/csv' : extension === 'txt' ? 'text/plain' : 'application/zip';
  await database.query("UPDATE documents SET download_status='downloaded',sha256=$1,mime_type=$2,local_path=$3 WHERE id=$4", [sha256, mimeType, path.relative(process.cwd(), location), document.id]);
  console.log(JSON.stringify({ id: document.id, contractId: document.contract_id, bytes: buffer.length, sha256, path: path.relative(process.cwd(), location) }, null, 2));
} finally {
  await database.end();
}
