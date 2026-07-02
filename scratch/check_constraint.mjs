import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

await withDb(async pool => {
  const res = await pool.query(`
    select pg_get_constraintdef(c.oid) as def
      from pg_constraint c
      join pg_class t on c.conrelid = t.oid
     where t.relname = 'gaokao_source_documents'
       and c.conname = 'gaokao_source_documents_parse_status_check'
  `);
  
  if (res.rows[0]) {
    console.log("Constraint Definition:", res.rows[0].def);
  } else {
    console.log("Constraint not found.");
  }
});
