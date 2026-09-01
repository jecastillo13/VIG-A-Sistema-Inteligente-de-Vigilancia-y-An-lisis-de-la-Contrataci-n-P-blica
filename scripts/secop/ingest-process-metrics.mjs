import pg from 'pg';
import { getSecopConfig, loadLocalEnv } from './config.mjs';
import { SocrataClient } from './client.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
const config = getSecopConfig();
const entityCode = process.argv.find((argument) => argument.startsWith('--entity-code='))?.slice(14) || '700676059';
const dateFrom = process.argv.find((argument) => argument.startsWith('--date-from='))?.slice(12) || '2024-01-01T00:00:00';
const dateTo = process.argv.find((argument) => argument.startsWith('--date-to='))?.slice(10) || '2025-12-31T23:59:59';
const pageSize = 1000;
const socrata = new SocrataClient({ baseUrl: config.baseUrl, datasetId: config.processesDatasetId, appToken: config.appToken });
const database = new pg.Client({ connectionString: process.env.DATABASE_URL });
await database.connect();

function noticeUid(value) {
  return String(value?.url || value || '').match(/[?&]noticeUID=([^&]+)/i)?.[1] || null;
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

try {
  const contracts = await database.query(`SELECT c.id,c.process_id,p.source_url FROM contracts c JOIN processes p ON p.id=c.process_id WHERE c.entity_code=$1`, [entityCode]);
  const wanted = new Map(contracts.rows.map((row) => [noticeUid(row.source_url), row]).filter(([uid]) => uid));
  const matched = new Map();
  const where = `codigo_entidad=${entityCode} AND fecha_de_publicacion_del between '${dateFrom}' and '${dateTo}'`;
  const select = ['id_del_proceso','referencia_del_proceso','fecha_de_publicacion_del','fecha_adjudicacion','precio_base','valor_total_adjudicacion','conteo_de_respuestas_a_ofertas','proveedores_unicos_con','numero_de_lotes','urlproceso'].join(',');
  let offset = 0;
  let scanned = 0;
  while (true) {
    const rows = await socrata.fetchPage({ $select: select, $where: where, $order: 'id_del_proceso', $limit: pageSize, $offset: offset });
    scanned += rows.length;
    for (const row of rows) {
      const uid = noticeUid(row.urlproceso);
      if (!wanted.has(uid)) continue;
      const current = matched.get(uid);
      if (!current || (!current.fecha_adjudicacion && row.fecha_adjudicacion)) matched.set(uid, row);
    }
    if (rows.length < pageSize) break;
    offset += rows.length;
  }

  await database.query('BEGIN');
  for (const [uid, row] of matched) {
    const target = wanted.get(uid);
    await database.query(`UPDATE processes SET official_process_id=$1,reference=COALESCE($2,reference),published_at=$3,awarded_at=$4,estimated_value=$5,awarded_value=$6,offer_count=$7,unique_bidder_count=$8,lot_count=$9,metrics_source_dataset_id=$10,updated_at=NOW() WHERE id=$11`, [
      row.id_del_proceso, row.referencia_del_proceso, row.fecha_de_publicacion_del || null, row.fecha_adjudicacion || null,
      numeric(row.precio_base), numeric(row.valor_total_adjudicacion), numeric(row.conteo_de_respuestas_a_ofertas), numeric(row.proveedores_unicos_con), numeric(row.numero_de_lotes), config.processesDatasetId, target.process_id,
    ]);
  }
  await database.query('COMMIT');
  console.log(JSON.stringify({ datasetId: config.processesDatasetId, entityCode, requestedContracts: wanted.size, scannedProcesses: scanned, matchedContracts: matched.size, missingContracts: wanted.size - matched.size }, null, 2));
} catch (error) {
  await database.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await database.end();
}
