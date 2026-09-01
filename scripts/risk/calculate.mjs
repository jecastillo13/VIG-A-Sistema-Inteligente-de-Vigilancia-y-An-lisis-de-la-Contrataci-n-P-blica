import pg from 'pg';
import { loadLocalEnv } from '../secop/config.mjs';
import { evaluateContracts, RULES, RULE_VERSION } from './engine.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const result = await client.query(`
    SELECT id,entity_code AS "entityCode",supplier_code AS "supplierCode",procurement_method AS "procurementMethod",contract_type AS "contractType",main_category_code AS "mainCategoryCode",description,signed_at AS "signedAt",value::float8
    FROM contracts ORDER BY id
  `);
  const signals = evaluateContracts(result.rows);
  await client.query('BEGIN');
  await client.query('DELETE FROM risk_signals WHERE rule_code=ANY($1::text[])', [Object.keys(RULES)]);
  for (const signal of signals) {
    await client.query(`
      INSERT INTO risk_signals (contract_id,rule_code,rule_version,score,evidence)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (contract_id,rule_code,rule_version) DO UPDATE SET score=EXCLUDED.score,evidence=EXCLUDED.evidence,created_at=NOW()
    `, [signal.contractId, signal.ruleCode, signal.ruleVersion, signal.score, signal.evidence]);
  }
  await client.query('COMMIT');
  console.log(JSON.stringify({ ruleVersion: RULE_VERSION, contracts: result.rows.length, signals: signals.length, affectedContracts: new Set(signals.map((signal) => signal.contractId)).size }, null, 2));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
