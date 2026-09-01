import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { loadLocalEnv } from '../secop/config.mjs';

loadLocalEnv();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL no está configurada.');

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  const directory = path.join(process.cwd(), 'db', 'migrations');
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    await client.query(await fs.readFile(path.join(directory, file), 'utf8'));
    console.log(`Migración aplicada: ${file}`);
  }
} finally {
  await client.end();
}

