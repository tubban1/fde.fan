import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

await withDb(async pool => {
  const res = await pool.query(`
    select year, count(*)::int as count 
      from gaokao_score_rank_segments 
     where province = '云南' 
     group by year 
     order by year desc
  `);
  console.log("Yunnan segments count by year:");
  console.table(res.rows);

  const res2 = await pool.query(`
    select year, count(*)::int as count 
      from gaokao_admission_records 
     where province = '云南' 
     group by year 
     order by year desc
  `);
  console.log("Yunnan admission records count by year:");
  console.table(res2.rows);
});
