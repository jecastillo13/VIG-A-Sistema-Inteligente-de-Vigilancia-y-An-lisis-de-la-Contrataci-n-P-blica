import pg from 'pg';
import { loadLocalEnv } from '../secop/config.mjs';
import { evaluateContracts, RULES, RULE_VERSION } from './engine.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está configurada.');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const result = await client.query(`
    SELECT c.id,c.entity_code AS "entityCode",c.supplier_code AS "supplierCode",c.procurement_method AS "procurementMethod",c.contract_type AS "contractType",c.main_category_code AS "mainCategoryCode",c.description,c.signed_at AS "signedAt",c.value::float8,
      p.published_at AS "publishedAt",p.awarded_at AS "awardedAt",p.estimated_value::float8 AS "estimatedValue",p.offer_count AS "offerCount",p.unique_bidder_count AS "uniqueBidderCount",p.lot_count AS "lotCount"
    FROM contracts c LEFT JOIN processes p ON p.id=c.process_id ORDER BY c.id
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
