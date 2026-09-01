import fs from 'node:fs';
import path from 'node:path';

export const pilotEntities = [
  { key: 'cce', label: 'Colombia Compra Eficiente', search: 'AGENCIA NACIONAL CONTRATACION PUBLICA COLOMBIA COMPRA EFICIENTE' },
  { key: 'invias', label: 'Instituto Nacional de Vías (INVÍAS)', search: 'INVIAS', code: '700676059' },
  { key: 'men', label: 'Ministerio de Educación Nacional', search: 'MINISTERIO EDUCACION NACIONAL' },
  { key: 'antioquia', label: 'Gobernación de Antioquia', search: 'GOBERNACION ANTIOQUIA' },
  { key: 'cali', label: 'Alcaldía de Santiago de Cali', search: 'ALCALDIA SANTIAGO CALI' },
  { key: 'cartagena', label: 'Alcaldía Mayor de Cartagena de Indias', search: 'ALCALDIA CARTAGENA INDIAS' },
  { key: 'pasto', label: 'Alcaldía de Pasto', search: 'ALCALDIA PASTO' },
  { key: 'unal', label: 'Universidad Nacional de Colombia', search: 'UNIVERSIDAD NACIONAL COLOMBIA' },
];

export function loadLocalEnv(root = process.cwd()) {
  for (const filename of ['.env.local', '.env']) {
    const location = path.join(root, filename);
    if (!fs.existsSync(location)) continue;
    for (const line of fs.readFileSync(location, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

export function getSecopConfig() {
  loadLocalEnv();
  return {
    baseUrl: process.env.SECOP_API_BASE_URL || 'https://www.datos.gov.co/resource',
    contractsDatasetId: process.env.SECOP_CONTRACTS_DATASET_ID || 'jbjy-vk9h',
    processesDatasetId: process.env.SECOP_PROCESSES_DATASET_ID || 'p6dx-8zbt',
    biddersDatasetId: process.env.SECOP_BIDDERS_DATASET_ID || 'hgi6-6wh3',
    documentsDatasetId: process.env.SECOP_DOCUMENTS_DATASET_ID || 'dmgg-8hin',
    appToken: process.env.SOCRATA_APP_TOKEN || '',
  };
}
