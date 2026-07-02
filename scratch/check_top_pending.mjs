import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

await withDb(async pool => {
  const res = await pool.query(`
    select id, province, year, title, parse_status, fetched_at, raw_data->>'local_path' as local_path 
      from gaokao_source_documents 
     where raw_data ? 'local_path' and (parse_status is null or parse_status = 'pending')
     order by fetched_at desc
     limit 50
  `);
  
  console.log("Top 50 pending documents to extract:");
  console.table(res.rows.map(r => ({
    province: r.province,
    fetched_at: r.fetched_at,
    title: r.title,
    local_path: r.local_path
  })));
});
