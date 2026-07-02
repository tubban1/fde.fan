import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

await withDb(async pool => {
  const res = await pool.query(`
    select id, province, year, title, source_type, parse_status, raw_data->>'local_path' as local_path 
      from gaokao_source_documents 
     where year = 2026 
       and (parse_status = 'pending' or parse_status is null)
       and source_type in ('admission_record', 'enrollment_plan')
     order by province, source_type
  `);
  
  console.log(`Found ${res.rows.length} pending 2026 admissions/plans documents:`);
  console.table(res.rows.map(r => ({
    province: r.province,
    type: r.source_type,
    title: r.title.length > 60 ? r.title.slice(0, 60) + '...' : r.title,
    path: r.local_path
  })));
});
