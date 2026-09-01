import path from 'node:path';
import pg from 'pg';
import { loadLocalEnv } from '../secop/config.mjs';
import { readJson } from '../secop/storage.mjs';

loadLocalEnv();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL no está configurada.');
const source = process.argv.find((argument) => argument.startsWith('--file='))?.slice(7)
  || path.join('data', 'runtime', 'contracts-2025-invias', 'contracts.json');
const contracts = await readJson(path.resolve(source), null);
if (!Array.isArray(contracts)) throw new Error(`No se encontró el archivo de contratos: ${source}`);

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
let imported = 0;
try {
  await client.query('BEGIN');
  for (const contract of contracts) {
    await client.query(`
      INSERT INTO entities (code, tax_id, name, department, city, government_order, sector)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (code) DO UPDATE SET tax_id=EXCLUDED.tax_id,name=EXCLUDED.name,department=EXCLUDED.department,city=EXCLUDED.city,government_order=EXCLUDED.government_order,sector=EXCLUDED.sector,updated_at=NOW()
    `, [contract.entity.code, contract.entity.taxId, contract.entity.name, contract.entity.department, contract.entity.city, contract.entity.order, contract.entity.sector]);
    if (contract.supplier.code) {
      await client.query(`
        INSERT INTO suppliers (code, name, is_group, is_sme) VALUES ($1,$2,$3,$4)
        ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,is_group=EXCLUDED.is_group,is_sme=EXCLUDED.is_sme,updated_at=NOW()
      `, [contract.supplier.code, contract.supplier.name || 'Sin nombre', contract.supplier.isGroup, contract.supplier.isSme]);
    }
    if (contract.processId) {
      await client.query(`
        INSERT INTO processes (id, reference, entity_code, description, procurement_method, source_url)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (id) DO UPDATE SET reference=EXCLUDED.reference,entity_code=EXCLUDED.entity_code,description=EXCLUDED.description,procurement_method=EXCLUDED.procurement_method,source_url=EXCLUDED.source_url,updated_at=NOW()
      `, [contract.processId, contract.reference, contract.entity.code, contract.description, contract.procurementMethod, contract.source.processUrl]);
    }
    await client.query(`
      INSERT INTO contracts (id,process_id,reference,status,description,contract_type,procurement_method,procurement_method_justification,signed_at,starts_at,ends_at,value,added_days,main_category_code,entity_code,supplier_code,source_dataset_id,source_process_url,source_updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,description=EXCLUDED.description,ends_at=EXCLUDED.ends_at,value=EXCLUDED.value,added_days=EXCLUDED.added_days,source_updated_at=EXCLUDED.source_updated_at,imported_at=NOW()
    `, [contract.id,contract.processId,contract.reference,contract.status,contract.description,contract.contractType,contract.procurementMethod,contract.procurementMethodJustification,contract.signedAt,contract.startsAt,contract.endsAt,contract.value,contract.addedDays,contract.mainCategoryCode,contract.entity.code,contract.supplier.code,contract.source.datasetId,contract.source.processUrl,contract.source.updatedAt]);
    imported += 1;
  }
  await client.query('COMMIT');
  console.log(`${imported} contratos importados o actualizados.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
