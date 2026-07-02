import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

await withDb(async pool => {
  const pending = await pool.query(`
    select id, province, year, title, source_type, parse_status, raw_data->>'local_path' as local_path 
      from gaokao_source_documents 
     where parse_status = 'pending' or parse_status is null
     order by province, year desc
  `);
  
  console.log(`Found ${pending.rows.length} pending source documents in DB:`);
  console.table(pending.rows.map(r => ({
    id: r.id,
    province: r.province || '全国',
    year: r.year,
    title: r.title,
    type: r.source_type,
    local_path: r.local_path
  })));
});
