import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

await withDb(async pool => {
  const res = await pool.query(`
    select province, count(*)::int as count 
      from gaokao_source_documents 
     group by province 
     order by count desc
  `);
  console.log("Provinces in gaokao_source_documents:");
  console.table(res.rows);
});
