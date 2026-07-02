import { withDb } from '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/scripts/gaokao/lib/db.mjs';
import { loadLocalEnv } from '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/scripts/gaokao/lib/env.mjs';

loadLocalEnv();

await withDb(async (pool) => {
  console.log("=== Jiangsu (江苏) Sources ===");
  const jsRes = await pool.query(
    `SELECT id, title, url, parse_status, raw_data->>'local_path' as local_path, year 
     FROM gaokao_source_documents 
     WHERE province = '江苏' 
     ORDER BY year DESC, fetched_at DESC`
  );
  jsRes.rows.forEach(r => {
    console.log(`[${r.year}] ${r.title} | status: ${r.parse_status} | path: ${r.local_path} | url: ${r.url}`);
  });

  console.log("\n=== Anhui (安徽) Sources ===");
  const ahRes = await pool.query(
    `SELECT id, title, url, parse_status, raw_data->>'local_path' as local_path, year 
     FROM gaokao_source_documents 
     WHERE province = '安徽' 
     ORDER BY year DESC, fetched_at DESC`
  );
  ahRes.rows.forEach(r => {
    console.log(`[${r.year}] ${r.title} | status: ${r.parse_status} | path: ${r.local_path} | url: ${r.url}`);
  });
});
