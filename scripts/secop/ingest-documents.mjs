import pg from 'pg';
import { getSecopConfig, loadLocalEnv } from './config.mjs';
import { SocrataClient } from './client.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
const config = getSecopConfig();
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
const socrata = new SocrataClient({ baseUrl: config.baseUrl, datasetId: config.documentsDatasetId, appToken: config.appToken });
await database.connect();

function sourceUrl(value) {
  const url = String(value?.url || value || '');
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'community.secop.gov.co' ? parsed.href : null;
  } catch {
    return null;
  }
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

try {
  const contracts = (await database.query('SELECT id FROM contracts ORDER BY id')).rows.map((row) => row.id);
  const accepted = [];
  const rejected = [];
  for (let index = 0; index < contracts.length; index += 25) {
    const batch = contracts.slice(index, index + 25);
    const quoted = batch.map((id) => `'${id.replaceAll("'", "''")}'`).join(',');
    const rows = await socrata.fetchPage({ $where: `n_mero_de_contrato in(${quoted})`, $limit: 50_000, $order: 'id_documento' });
    for (const row of rows) {
      const url = sourceUrl(row.url_descarga_documento);
      const id = String(row.id_documento || '');
      const contractId = String(row.n_mero_de_contrato || '');
      if (!id || !contracts.includes(contractId) || !url || !row.nombre_archivo) {
        rejected.push({ id, contractId, reason: !url ? 'invalid_source_url' : 'missing_required_field' });
        continue;
      }
      accepted.push({ id, contractId, processReference: row.proceso || null, fileName: String(row.nombre_archivo), extension: String(row.extensi_n || '').toLowerCase() || null, sizeBytes: number(row.tamanno_archivo), description: row.descripci_n || null, uploadedAt: row.fecha_carga || null, url });
    }
  }

  await database.query('BEGIN');
  for (const document of accepted) {
    await database.query(`
      INSERT INTO documents (id,contract_id,process_reference,file_name,extension,size_bytes,description,uploaded_at,source_url,source_dataset_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (id) DO UPDATE SET contract_id=EXCLUDED.contract_id,process_reference=EXCLUDED.process_reference,file_name=EXCLUDED.file_name,extension=EXCLUDED.extension,size_bytes=EXCLUDED.size_bytes,description=EXCLUDED.description,uploaded_at=EXCLUDED.uploaded_at,source_url=EXCLUDED.source_url,source_dataset_id=EXCLUDED.source_dataset_id,indexed_at=NOW()
    `, [document.id,document.contractId,document.processReference,document.fileName,document.extension,document.sizeBytes,document.description,document.uploadedAt,document.url,config.documentsDatasetId]);
  }
  await database.query('COMMIT');
  const rejectionReasons = rejected.reduce((counts, item) => ({ ...counts, [item.reason]: (counts[item.reason] || 0) + 1 }), {});
  console.log(JSON.stringify({ datasetId: config.documentsDatasetId, contracts: contracts.length, accepted: accepted.length, rejected: rejected.length, contractsWithDocuments: new Set(accepted.map((document) => document.contractId)).size, rejectionReasons }, null, 2));
} catch (error) {
  await database.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await database.end();
}
