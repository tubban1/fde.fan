import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

await withDb(async pool => {
  const res = await pool.query(`
    select province, count(*) as cnt 
      from gaokao_score_rank_segments 
     where year = 2026 
     group by province 
     order by province
  `);
  console.table(res.rows);
});
