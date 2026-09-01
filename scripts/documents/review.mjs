import pg from 'pg';
import { loadLocalEnv } from '../secop/config.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
const option = (name) => process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
const contractId = option('contract-id');
const category = option('category');
const decision = option('decision');
const note = option('note') || null;
if (!contractId || !category || !decision) throw new Error('Debes indicar --contract-id, --category y --decision=confirmed|rejected.');
if (!['confirmed', 'rejected'].includes(decision)) throw new Error('La decisión debe ser confirmed o rejected.');
if (note && note.length > 500) throw new Error('La nota no puede superar 500 caracteres.');

const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
await database.connect();
try {
  const finding = await database.query('SELECT status,document_id,page_number FROM document_findings WHERE contract_id=$1 AND category=$2', [contractId, category]);
  if (!finding.rows[0]) throw new Error('No existe un hallazgo para esa categoría y contrato.');
  await database.query(`INSERT INTO document_reviews(contract_id,category,decision,note) VALUES($1,$2,$3,$4) ON CONFLICT(contract_id,category) DO UPDATE SET decision=EXCLUDED.decision,note=EXCLUDED.note,reviewer='human',reviewed_at=NOW()`, [contractId, category, decision, note]);
  console.log(JSON.stringify({ contractId, category, finding: finding.rows[0], decision, note, reviewedBy: 'human' }, null, 2));
} finally {
  await database.end();
}
