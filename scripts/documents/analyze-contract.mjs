import pg from 'pg';
import { loadLocalEnv } from '../secop/config.mjs';
import { ANALYZER_VERSION, analyzePages } from './analysis.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
const contractId = process.argv.find((argument) => argument.startsWith('--contract-id='))?.slice(14);
if (!contractId) throw new Error('Debes indicar --contract-id=<ID>.');
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
await database.connect();

try {
  const result = await database.query(`SELECT d.id,d.file_name,d.source_url,dp.page_number,dp.text_content FROM documents d JOIN document_pages dp ON dp.document_id=d.id WHERE d.contract_id=$1 AND d.extraction_status='extracted' ORDER BY d.extracted_at DESC,dp.page_number`, [contractId]);
  if (result.rows.length === 0) throw new Error('El contrato no tiene documentos con texto extraído.');
  const byDocument = new Map();
  for (const row of result.rows) {
    if (!byDocument.has(row.id)) byDocument.set(row.id, { id: row.id, fileName: row.file_name, sourceUrl: row.source_url, pages: [] });
    byDocument.get(row.id).pages.push({ pageNumber: row.page_number, text: row.text_content });
  }
  const findings = analyzePages([...byDocument.values()]);
  await database.query('BEGIN');
  await database.query('DELETE FROM document_findings WHERE contract_id=$1', [contractId]);
  for (const finding of findings) {
    await database.query('INSERT INTO document_findings(contract_id,category,status,document_id,page_number,excerpt,matched_term,analyzer_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [contractId, finding.category, finding.status, finding.documentId || null, finding.pageNumber || null, finding.excerpt || null, finding.matchedTerm || null, ANALYZER_VERSION]);
  }
  await database.query('COMMIT');
  console.log(JSON.stringify({ contractId, analyzerVersion: ANALYZER_VERSION, analyzedDocuments: byDocument.size, found: findings.filter((item) => item.status === 'found').length, notFound: findings.filter((item) => item.status === 'not_found').length, categories: findings.map(({ category, status, documentId, pageNumber }) => ({ category, status, documentId, pageNumber })) }, null, 2));
} catch (error) {
  await database.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await database.end();
}
