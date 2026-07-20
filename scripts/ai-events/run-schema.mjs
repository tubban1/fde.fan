import fs from 'node:fs';
import { loadLocalEnv, withDb } from './lib/db.mjs';

loadLocalEnv();

const schemaPath = process.argv[2] || 'docs/ai-events/schema.sql';
const sql = fs.readFileSync(schemaPath, 'utf8');

await withDb(async pool => {
  await pool.query(sql);
  console.log(`Applied AI events schema: ${schemaPath}`);
});
