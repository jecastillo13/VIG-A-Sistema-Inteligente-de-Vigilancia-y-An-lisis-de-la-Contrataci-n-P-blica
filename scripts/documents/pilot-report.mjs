import pg from 'pg';
import { loadLocalEnv } from '../secop/config.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
await database.connect();
try {
  const summary = await database.query(`SELECT COUNT(DISTINCT f.contract_id)::int AS contracts,COUNT(DISTINCT f.document_id) FILTER (WHERE f.document_id IS NOT NULL)::int AS cited_documents,COUNT(*)::int AS category_results,COUNT(*) FILTER (WHERE f.status='found')::int AS found,COUNT(*) FILTER (WHERE f.status='not_found')::int AS not_found,COUNT(r.category)::int AS human_reviewed,COUNT(*) FILTER (WHERE r.category IS NULL)::int AS pending_human_review FROM document_findings f LEFT JOIN document_reviews r USING(contract_id,category)`);
  const categories = await database.query(`SELECT f.category,COUNT(DISTINCT f.contract_id)::int AS contracts,COUNT(*) FILTER (WHERE f.status='found')::int AS found,COUNT(*) FILTER (WHERE f.status='not_found')::int AS not_found,COUNT(r.category)::int AS human_reviewed FROM document_findings f LEFT JOIN document_reviews r USING(contract_id,category) GROUP BY f.category ORDER BY f.category`);
  const extraction = await database.query(`SELECT extraction_status AS status,COUNT(*)::int FROM documents WHERE extraction_status <> 'pending' GROUP BY extraction_status ORDER BY extraction_status`);
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), summary: summary.rows[0], categories: categories.rows, extraction: extraction.rows }, null, 2));
} finally {
  await database.end();
}
