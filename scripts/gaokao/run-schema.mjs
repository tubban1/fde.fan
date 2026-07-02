import fs from 'node:fs';
import { withDb } from './lib/db.mjs';

const schemaPath = process.argv[2] || 'docs/gaokao-admission-schema.sql';
const sql = fs.readFileSync(schemaPath, 'utf8');

await withDb(async (pool) => {
  await pool.query(sql);
  console.log(`Applied schema: ${schemaPath}`);
});
