import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import pg from 'pg';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { loadLocalEnv } from '../secop/config.mjs';
import { redactPersonalData, resolveStoredDocument, textFromItems } from './text.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
const documentId = process.argv.find((argument) => argument.startsWith('--document-id='))?.slice(14);
if (!documentId) throw new Error('Debes indicar --document-id=<ID>.');

const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
await database.connect();

try {
  const result = await database.query('SELECT * FROM documents WHERE id=$1', [documentId]);
  const document = result.rows[0];
  if (!document) throw new Error('Documento no encontrado en el inventario.');
  if (document.download_status !== 'downloaded' || !document.local_path) throw new Error('Primero debes descargar el documento de forma controlada.');
  if (String(document.extension).toLowerCase() !== 'pdf') throw new Error('La extracción inicial solo admite documentos PDF.');
  const location = resolveStoredDocument(process.cwd(), document.local_path);
  const buffer = await fs.readFile(location);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  if (!document.sha256 || sha256 !== document.sha256) throw new Error('La huella local no coincide con la registrada al descargar.');

  await database.query("UPDATE documents SET extraction_status='extracting',extraction_error=NULL WHERE id=$1", [documentId]);
  const task = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  const pdf = await task.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = redactPersonalData(textFromItems(content.items));
    pages.push({ pageNumber, text, charCount: text.length });
    page.cleanup();
  }
  await task.destroy();

  const totalChars = pages.reduce((sum, page) => sum + page.charCount, 0);
  const status = totalChars > 0 ? 'extracted' : 'no_text';
  await database.query('BEGIN');
  await database.query('DELETE FROM document_pages WHERE document_id=$1', [documentId]);
  for (const page of pages) {
    await database.query('INSERT INTO document_pages(document_id,page_number,text_content,char_count,extraction_method) VALUES($1,$2,$3,$4,$5)', [documentId, page.pageNumber, page.text, page.charCount, 'pdfjs-dist']);
  }
  await database.query('UPDATE documents SET extraction_status=$1,page_count=$2,text_char_count=$3,extracted_at=NOW(),extraction_error=NULL WHERE id=$4', [status, pages.length, totalChars, documentId]);
  await database.query('COMMIT');
  console.log(JSON.stringify({ id: documentId, contractId: document.contract_id, status, pages: pages.length, characters: totalChars, sha256 }, null, 2));
} catch (error) {
  await database.query('ROLLBACK').catch(() => {});
  await database.query("UPDATE documents SET extraction_status='failed',extraction_error=$1 WHERE id=$2", [String(error.message || error).slice(0, 500), documentId]).catch(() => {});
  throw error;
} finally {
  await database.end();
}
