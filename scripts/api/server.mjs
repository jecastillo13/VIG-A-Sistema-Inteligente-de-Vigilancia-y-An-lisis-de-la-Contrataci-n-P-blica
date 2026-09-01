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

const sortFields = {
  signedAt: 'signed_at',
  value: 'value',
  riskScore: 'risk_score',
  entity: 'entity_name',
  supplier: 'supplier_name',
};

function queryOptions(url) {
  const sort = sortFields[url.searchParams.get('sort')] ? url.searchParams.get('sort') : 'signedAt';
  const direction = url.searchParams.get('direction') === 'asc' ? 'ASC' : 'DESC';
  return {
    search: (url.searchParams.get('search') || '').slice(0, 200),
    entity: (url.searchParams.get('entity') || '').slice(0, 200),
    supplier: (url.searchParams.get('supplier') || '').slice(0, 200),
    method: (url.searchParams.get('method') || '').slice(0, 200),
    dateFrom: url.searchParams.get('dateFrom') || '',
    dateTo: url.searchParams.get('dateTo') || '',
    minValue: Math.max(Number(url.searchParams.get('minValue') || 0), 0),
    maxValue: Math.max(Number(url.searchParams.get('maxValue') || 0), 0),
    priorityOnly: url.searchParams.get('priority') === 'true',
    limit: Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500),
    offset: Math.max(Number(url.searchParams.get('offset') || 0), 0),
    sort,
    sortColumn: sortFields[sort],
    direction,
  };
}

async function contractsFromJson(options) {
  const rows = await readJson(jsonPath, []);
  const normalizedSearch = options.search.toLocaleLowerCase('es');
  const filtered = rows.filter((contract) => {
    const haystack = `${contract.id} ${contract.entity.name} ${contract.supplier.name || ''} ${contract.description || ''}`.toLocaleLowerCase('es');
    const signedAt = contract.signedAt ? new Date(contract.signedAt) : null;
    return (!normalizedSearch || haystack.includes(normalizedSearch))
      && (!options.contractId || contract.id === options.contractId)
      && (!options.entity || contract.entity.name?.toLocaleLowerCase('es').includes(options.entity.toLocaleLowerCase('es')))
      && (!options.supplier || contract.supplier.name?.toLocaleLowerCase('es').includes(options.supplier.toLocaleLowerCase('es')))
      && (!options.method || contract.procurementMethod === options.method)
      && (!options.dateFrom || (signedAt && signedAt >= new Date(options.dateFrom)))
      && (!options.dateTo || (signedAt && signedAt <= new Date(`${options.dateTo}T23:59:59.999Z`)))
      && (!options.minValue || Number(contract.value) >= options.minValue)
      && (!options.maxValue || Number(contract.value) <= options.maxValue)
      && (!options.priorityOnly || Number(contract.riskScore || 0) >= 70);
  });
  const field = { signedAt: 'signedAt', value: 'value', riskScore: 'riskScore' }[options.sort];
  filtered.sort((left, right) => {
    const a = options.sort === 'entity' ? left.entity.name : options.sort === 'supplier' ? left.supplier.name : left[field];
    const b = options.sort === 'entity' ? right.entity.name : options.sort === 'supplier' ? right.supplier.name : right[field];
    return String(a || '').localeCompare(String(b || ''), 'es', { numeric: true }) * (options.direction === 'ASC' ? 1 : -1);
  });
  return { rows: filtered.slice(options.offset, options.offset + options.limit), total: filtered.length };
}

async function contractsFromPostgres(options, contractId = '') {
  const result = await pool.query(`
    WITH listed AS (
      SELECT c.id,c.process_id AS "processId",c.reference,c.status,c.description,c.contract_type AS "contractType",c.procurement_method AS "procurementMethod",c.signed_at AS "signedAt",c.signed_at,c.value::float8,c.added_days AS "addedDays",c.source_process_url AS "sourceUrl",
        e.name AS entity_name,COALESCE(s.name,'') AS supplier_name,
        json_build_object('code',e.code,'name',e.name,'department',e.department,'city',e.city) AS entity,
        json_build_object('code',s.code,'name',s.name) AS supplier,
        json_build_object('id',p.official_process_id,'publishedAt',p.published_at,'awardedAt',p.awarded_at,'estimatedValue',p.estimated_value::float8,'awardedValue',p.awarded_value::float8,'offerCount',p.offer_count,'uniqueBidderCount',p.unique_bidder_count,'lotCount',p.lot_count) AS process,
        (SELECT COUNT(*)::int FROM documents d WHERE d.contract_id=c.id) AS "documentCount",
        COALESCE((SELECT json_agg(document_row ORDER BY document_row."uploadedAt" DESC) FROM (SELECT d.id,d.file_name AS "fileName",d.extension,d.size_bytes::float8 AS "sizeBytes",d.description,d.uploaded_at AS "uploadedAt",d.source_url AS "sourceUrl" FROM documents d WHERE d.contract_id=c.id ORDER BY d.uploaded_at DESC NULLS LAST,d.id LIMIT 5) document_row),'[]'::json) AS documents,
        COALESCE((SELECT json_agg(extracted_document ORDER BY extracted_document."extractedAt" DESC) FROM (SELECT d.id,d.file_name AS "fileName",d.source_url AS "sourceUrl",d.page_count AS "pageCount",d.text_char_count AS "textCharCount",d.extracted_at AS "extractedAt",COALESCE((SELECT json_agg(json_build_object('pageNumber',page_excerpt.page_number,'excerpt',page_excerpt.excerpt) ORDER BY page_excerpt.page_number) FROM (SELECT dp.page_number,LEFT(dp.text_content,600) AS excerpt FROM document_pages dp WHERE dp.document_id=d.id AND dp.char_count > 0 ORDER BY dp.page_number LIMIT 3) page_excerpt),'[]'::json) AS pages FROM documents d WHERE d.contract_id=c.id AND d.extraction_status='extracted' ORDER BY d.extracted_at DESC LIMIT 3) extracted_document),'[]'::json) AS "extractedDocuments",
        LEAST(COALESCE(SUM(rs.score),0),100)::float8 AS "riskScore",LEAST(COALESCE(SUM(rs.score),0),100) AS risk_score,
        COALESCE(json_agg(json_build_object('code',rs.rule_code,'version',rs.rule_version,'score',rs.score::float8,'evidence',rs.evidence) ORDER BY rs.score DESC) FILTER (WHERE rs.id IS NOT NULL),'[]'::json) AS "riskSignals"
      FROM contracts c JOIN entities e ON e.code=c.entity_code LEFT JOIN suppliers s ON s.code=c.supplier_code LEFT JOIN processes p ON p.id=c.process_id LEFT JOIN risk_signals rs ON rs.contract_id=c.id
      WHERE ($1='' OR c.id=$1) AND ($2='' OR c.id ILIKE $3 OR e.name ILIKE $3 OR s.name ILIKE $3 OR c.description ILIKE $3)
        AND ($4='' OR e.name ILIKE $5) AND ($6='' OR s.name ILIKE $7) AND ($8='' OR c.procurement_method=$8)
        AND ($9='' OR c.signed_at >= $9::date) AND ($10='' OR c.signed_at < ($10::date + INTERVAL '1 day'))
        AND ($11=0 OR c.value >= $11) AND ($12=0 OR c.value <= $12)
      GROUP BY c.id,e.code,s.code,p.id
    )
    SELECT *,COUNT(*) OVER()::int AS total_count FROM listed
    WHERE (NOT $13 OR risk_score >= 70)
    ORDER BY ${options.sortColumn} ${options.direction},id ASC LIMIT $14 OFFSET $15
  `, [contractId, options.search, `%${options.search}%`, options.entity, `%${options.entity}%`, options.supplier, `%${options.supplier}%`, options.method, options.dateFrom, options.dateTo, options.minValue, options.maxValue, options.priorityOnly, options.limit, options.offset]);
  const total = result.rows[0]?.total_count || 0;
  return { rows: result.rows.map((row) => {
    const cleaned = { ...row };
    for (const key of ['total_count', 'entity_name', 'supplier_name', 'signed_at', 'risk_score']) delete cleaned[key];
    return cleaned;
  }), total };
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return respond(response, 204, null);
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (url.pathname === '/health') return respond(response, 200, { status: 'ok', backend });
    const detailMatch = url.pathname.match(/^\/contracts\/([^/]+)$/);
    if (url.pathname !== '/contracts' && !detailMatch) return respond(response, 404, { error: 'Ruta no encontrada' });
    const options = queryOptions(url);
    const result = backend === 'postgres'
      ? await contractsFromPostgres({ ...options, limit: detailMatch ? 1 : options.limit, offset: 0 }, detailMatch ? decodeURIComponent(detailMatch[1]) : '')
      : await contractsFromJson({ ...options, contractId: detailMatch ? decodeURIComponent(detailMatch[1]) : '', limit: detailMatch ? 1 : options.limit, offset: detailMatch ? 0 : options.offset });
    if (detailMatch) return result.rows[0] ? respond(response, 200, { data: result.rows[0], meta: { backend } }) : respond(response, 404, { error: 'Contrato no encontrado' });
    return respond(response, 200, { data: result.rows, meta: { backend, count: result.rows.length, total: result.total, limit: options.limit, offset: options.offset, sort: options.sort, direction: options.direction.toLowerCase() } });
  } catch (error) {
    console.error(error);
    return respond(response, 500, { error: 'No fue posible consultar los contratos.' });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`API VIGÍA disponible en http://localhost:${port} (${backend})`));
