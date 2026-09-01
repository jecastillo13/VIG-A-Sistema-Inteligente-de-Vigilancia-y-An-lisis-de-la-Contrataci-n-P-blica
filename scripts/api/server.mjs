import http from 'node:http';
import path from 'node:path';
import pg from 'pg';
import { loadLocalEnv } from '../secop/config.mjs';
import { readJson } from '../secop/storage.mjs';

loadLocalEnv();
const port = Number(process.env.API_PORT || 4000);
const appUrl = process.env.APP_URL || 'http://localhost:3000';
const backend = process.env.DATA_BACKEND || 'json';
const jsonPath = path.join(process.cwd(), 'data', 'runtime', 'contracts-2025-invias', 'contracts.json');
const pool = backend === 'postgres' ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;

function respond(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': appUrl,
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(value));
}

async function contractsFromJson(search, priorityOnly) {
  const rows = await readJson(jsonPath, []);
  const normalizedSearch = search.toLocaleLowerCase('es');
  return rows.filter((contract) => {
    const haystack = `${contract.id} ${contract.entity.name} ${contract.supplier.name || ''} ${contract.description || ''}`.toLocaleLowerCase('es');
    return (!normalizedSearch || haystack.includes(normalizedSearch)) && (!priorityOnly || Number(contract.riskScore || 0) >= 70);
  });
}

async function contractsFromPostgres(search, limit, offset) {
  const result = await pool.query(`
    SELECT c.id,c.process_id AS "processId",c.reference,c.status,c.description,c.contract_type AS "contractType",c.procurement_method AS "procurementMethod",c.signed_at AS "signedAt",c.value::float8,c.added_days AS "addedDays",c.source_process_url AS "sourceUrl",
      json_build_object('code',e.code,'name',e.name,'department',e.department,'city',e.city) AS entity,
      json_build_object('code',s.code,'name',s.name) AS supplier,
      COALESCE(SUM(rs.score),0)::float8 AS "riskScore"
    FROM contracts c JOIN entities e ON e.code=c.entity_code LEFT JOIN suppliers s ON s.code=c.supplier_code LEFT JOIN risk_signals rs ON rs.contract_id=c.id
    WHERE ($1='' OR c.id ILIKE $2 OR e.name ILIKE $2 OR s.name ILIKE $2 OR c.description ILIKE $2)
    GROUP BY c.id,e.code,s.code ORDER BY c.signed_at DESC,c.id LIMIT $3 OFFSET $4
  `, [search, `%${search}%`, limit, offset]);
  return result.rows;
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return respond(response, 204, null);
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (url.pathname === '/health') return respond(response, 200, { status: 'ok', backend });
    if (url.pathname !== '/contracts') return respond(response, 404, { error: 'Ruta no encontrada' });
    const search = (url.searchParams.get('search') || '').slice(0, 200);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500);
    const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);
    const priorityOnly = url.searchParams.get('priority') === 'true';
    const rows = backend === 'postgres' ? await contractsFromPostgres(search, limit, offset) : (await contractsFromJson(search, priorityOnly)).slice(offset, offset + limit);
    return respond(response, 200, { data: rows, meta: { backend, count: rows.length, limit, offset } });
  } catch (error) {
    console.error(error);
    return respond(response, 500, { error: 'No fue posible consultar los contratos.' });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`API VIGÍA disponible en http://localhost:${port} (${backend})`));

