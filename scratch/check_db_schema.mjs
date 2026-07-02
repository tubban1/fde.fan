import { withDb } from '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/scripts/gaokao/lib/db.mjs';
import { loadLocalEnv } from '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/scripts/gaokao/lib/env.mjs';

loadLocalEnv();

await withDb(async (pool) => {
  const columns = await pool.query(
    `SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'gaokao_admission_records'`
  );
  columns.rows.forEach(col => {
    console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
  });
});
