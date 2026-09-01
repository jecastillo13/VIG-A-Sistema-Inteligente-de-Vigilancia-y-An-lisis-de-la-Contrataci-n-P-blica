import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import { loadLocalEnv } from './secop/config.mjs';

const execFileAsync = promisify(execFile);
loadLocalEnv();

async function probeHttp(name, url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    return { name, ok: response.ok, status: response.status };
  } catch (error) {
    return { name, ok: false, error: String(error.cause?.code || error.message || error) };
  }
}

async function probeDocker() {
  try {
    const { stdout } = await execFileAsync('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 8_000, windowsHide: true });
    return { name: 'docker', ok: true, version: stdout.trim() };
  } catch (error) {
    return { name: 'docker', ok: false, error: String(error.stderr || error.message || error).trim().split('\n').at(-1) };
  }
}

async function probeDatabase() {
  if (!process.env.DATABASE_URL) return { name: 'postgres', ok: false, error: 'DATABASE_URL no configurada' };
  const database = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5_000 });
  try {
    await database.connect();
    const { rows } = await database.query(`SELECT
      (SELECT COUNT(*)::int FROM contracts) AS contracts,
      (SELECT COUNT(*)::int FROM documents) AS documents,
      (SELECT COUNT(*)::int FROM risk_signals) AS risk_signals`);
    return { name: 'postgres', ok: true, ...rows[0] };
  } catch (error) {
    return { name: 'postgres', ok: false, error: String(error.code || error.message || error) };
  } finally {
    await database.end().catch(() => {});
  }
}

const checks = await Promise.all([
  probeHttp('web', 'http://localhost:3000'),
  probeHttp('api-health', 'http://localhost:4000/health'),
  probeHttp('api-contracts', 'http://localhost:4000/contracts?limit=1'),
  probeDocker(),
  probeDatabase(),
]);

const suggestions = [];
if (!checks.find((check) => check.name === 'docker')?.ok) suggestions.push('Abre Docker Desktop y espera “Engine running”. No uses Reset to factory defaults.');
if (!checks.find((check) => check.name === 'postgres')?.ok) suggestions.push('Cuando Docker esté listo, ejecuta: pnpm db:up');
if (!checks.find((check) => check.name === 'web')?.ok || !checks.find((check) => check.name === 'api-health')?.ok) suggestions.push('Ejecuta: pnpm dev:all');
if (checks.find((check) => check.name === 'api-health')?.ok && !checks.find((check) => check.name === 'api-contracts')?.ok) suggestions.push('La API está encendida pero no consulta datos: verifica PostgreSQL antes de repetir la ingesta.');

console.log(JSON.stringify({ healthy: checks.every((check) => check.ok), checkedAt: new Date().toISOString(), checks, suggestions }, null, 2));
