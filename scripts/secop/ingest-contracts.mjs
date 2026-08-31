import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SocrataClient } from './client.mjs';
import { getSecopConfig, pilotEntities } from './config.mjs';
import { normalizeContract } from './normalize.mjs';
import { readJson, writeJsonAtomic } from './storage.mjs';

function argumentsFrom(argv) {
  const values = Object.fromEntries(argv.filter((item) => item.startsWith('--')).map((item) => {
    const [key, ...rest] = item.slice(2).split('=');
    return [key, rest.join('=') || true];
  }));
  const year = Number(values.year || 2025);
  const limit = Math.min(Math.max(Number(values.limit || 100), 1), 10_000);
  const pageSize = Math.min(Math.max(Number(values['page-size'] || 50), 1), 1_000);
  const entity = pilotEntities.find((item) => item.key === (values.entity || 'invias'));
  if (!Number.isInteger(year) || year < 2015 || year > new Date().getUTCFullYear()) throw new Error('La vigencia no es válida.');
  if (!entity) throw new Error(`Entidad piloto desconocida: ${values.entity}`);
  if (!entity.code) throw new Error(`La entidad ${entity.label} aún no tiene un código SECOP verificado.`);
  return { year, limit, pageSize, entity, reset: values.reset === true };
}

export async function runIngestion(options = argumentsFrom(process.argv.slice(2))) {
  const config = getSecopConfig();
  const runKey = `contracts-${options.year}-${options.entity.key}`;
  const runtime = path.join(process.cwd(), 'data', 'runtime', runKey);
  const dataPath = path.join(runtime, 'contracts.json');
  const checkpointPath = path.join(runtime, 'checkpoint.json');
  const reportPath = path.join(process.cwd(), 'outputs', 'secop', `${runKey}-report.json`);

  const existing = options.reset ? [] : await readJson(dataPath, []);
  const checkpoint = options.reset ? null : await readJson(checkpointPath, null);
  const contracts = new Map(existing.map((contract) => [contract.id, contract]));
  let offset = checkpoint?.status === 'running' ? checkpoint.offset : 0;
  const report = {
    runKey,
    datasetId: config.contractsDatasetId,
    year: options.year,
    entity: { key: options.entity.key, code: options.entity.code, label: options.entity.label },
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'running',
    requestedLimit: options.limit,
    pageSize: options.pageSize,
    pages: 0,
    received: 0,
    accepted: 0,
    rejected: 0,
    duplicates: 0,
    rejectionReasons: {},
    output: path.relative(process.cwd(), dataPath),
  };

  const client = new SocrataClient({
    baseUrl: config.baseUrl,
    datasetId: config.contractsDatasetId,
    appToken: config.appToken,
  });
  const start = `${options.year}-01-01T00:00:00`;
  const end = `${options.year}-12-31T23:59:59`;

  try {
    while (report.received < options.limit) {
      const requested = Math.min(options.pageSize, options.limit - report.received);
      const rows = await client.fetchPage({
        '$where': `codigo_entidad=${options.entity.code} AND fecha_de_firma between '${start}' and '${end}'`,
        '$order': 'id_contrato',
        '$limit': requested,
        '$offset': offset,
      });
      if (rows.length === 0) break;
      report.pages += 1;
      report.received += rows.length;
      for (const row of rows) {
        const normalized = normalizeContract(row);
        if (!normalized.ok) {
          report.rejected += 1;
          report.rejectionReasons[normalized.reason] = (report.rejectionReasons[normalized.reason] || 0) + 1;
          continue;
        }
        if (contracts.has(normalized.value.id)) report.duplicates += 1;
        else report.accepted += 1;
        contracts.set(normalized.value.id, normalized.value);
      }
      offset += rows.length;
      await writeJsonAtomic(dataPath, [...contracts.values()].sort((a, b) => a.id.localeCompare(b.id)));
      await writeJsonAtomic(checkpointPath, { runKey, status: 'running', offset, updatedAt: new Date().toISOString() });
      if (rows.length < requested) break;
    }
    report.status = 'completed';
    report.completedAt = new Date().toISOString();
    report.totalStored = contracts.size;
    await writeJsonAtomic(checkpointPath, { runKey, status: 'completed', offset, updatedAt: report.completedAt });
    await writeJsonAtomic(reportPath, report);
    return report;
  } catch (error) {
    report.status = 'failed';
    report.completedAt = new Date().toISOString();
    report.error = error.message;
    await writeJsonAtomic(reportPath, report);
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runIngestion().then((report) => console.log(JSON.stringify(report, null, 2))).catch((error) => {
    console.error(`Error de ingesta: ${error.message}`);
    process.exitCode = 1;
  });
}
