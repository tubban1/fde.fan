import fs from 'node:fs';
import { upsertSource, withDb } from './lib/db.mjs';

const registryPath = process.argv[2] || 'data/gaokao/source-registry.json';
const sources = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

await withDb(async (pool) => {
  let count = 0;
  for (const source of sources) {
    await upsertSource(pool, {
      ...source,
      parse_status: source.verified ? 'verified' : 'pending',
      raw_data: source
    });
    count += 1;
  }
  console.log(`Seeded ${count} gaokao source records from ${registryPath}`);
});
