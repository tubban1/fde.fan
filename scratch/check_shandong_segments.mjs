import { withDb } from '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/scripts/gaokao/lib/db.mjs';
import { loadLocalEnv } from '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/scripts/gaokao/lib/env.mjs';

loadLocalEnv();

await withDb(async (pool) => {
  const res = await pool.query(
    `SELECT year, count(*) 
     FROM gaokao_score_rank_segments 
     WHERE province = '山东' 
     GROUP BY year`
  );
  console.log("Shandong score segments by year:");
  res.rows.forEach(r => {
    console.log(`- Year ${r.year}: ${r.count} rows`);
  });
});
