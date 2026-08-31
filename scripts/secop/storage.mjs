import fs from 'node:fs/promises';
import path from 'node:path';

export async function readJson(location, fallback) {
  try {
    return JSON.parse(await fs.readFile(location, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJsonAtomic(location, value) {
  await fs.mkdir(path.dirname(location), { recursive: true });
  const temporary = `${location}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, location);
}

