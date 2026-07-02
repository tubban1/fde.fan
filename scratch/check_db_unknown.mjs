import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';
import fs from 'node:fs';
import path from 'node:path';

loadLocalEnv();

const dir = '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/unknown/2026';
const files = fs.readdirSync(dir);

await withDb(async pool => {
  for (const file of files) {
    // Search raw_data->>'local_path' containing the filename
    const res = await pool.query(
      `select id, province, year, title, parse_status 
         from gaokao_source_documents 
        where raw_data->>'local_path' like $1`,
      [`%${file}`]
    );
    if (res.rows.length > 0) {
      console.log(`✅ File ${file} exists: id=${res.rows[0].id}, province=${res.rows[0].province}, year=${res.rows[0].year}, title="${res.rows[0].title}", parse_status=${res.rows[0].parse_status}`);
    } else {
      console.log(`❌ File ${file} is NOT in the database.`);
    }
  }
});
