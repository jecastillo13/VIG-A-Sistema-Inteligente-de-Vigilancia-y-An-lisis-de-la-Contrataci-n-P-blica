import { SocrataClient } from './client.mjs';
import { getSecopConfig, pilotEntities } from './config.mjs';

const config = getSecopConfig();
const client = new SocrataClient({ baseUrl: config.baseUrl, datasetId: config.contractsDatasetId, appToken: config.appToken });

for (const entity of pilotEntities) {
  if (entity.code) {
    console.log(`${entity.key}\t${entity.code}\t${entity.label}\tverificado`);
    continue;
  }
  try {
    const rows = await client.fetchPage({ '$q': entity.search, '$select': 'distinct nombre_entidad,codigo_entidad', '$limit': 20 });
    console.log(`\n${entity.key}\t${entity.label}`);
    for (const row of rows) console.log(`  ${row.codigo_entidad || '-'}\t${row.nombre_entidad || '-'}`);
  } catch (error) {
    console.error(`${entity.key}\tERROR\t${error.message}`);
  }
}

