import { withDb } from '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/scripts/gaokao/lib/db.mjs';
import { loadLocalEnv } from '/Users/wahaha/Documents/Me/Project/cursor/fde.fan/scripts/gaokao/lib/env.mjs';

loadLocalEnv();

const provinces = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'
];

await withDb(async (pool) => {
  // Query doc count
  const docsRes = await pool.query(
    `SELECT province, COUNT(*) as count 
     FROM gaokao_source_documents 
     GROUP BY province`
  );
  const docMap = Object.fromEntries(docsRes.rows.map(r => [r.province, Number(r.count)]));

  // Query chunks count
  const chunksRes = await pool.query(
    `SELECT s.province, COUNT(c.id) as count
     FROM gaokao_document_chunks c
     JOIN gaokao_source_documents s ON c.source_id = s.id
     GROUP BY s.province`
  );
  const chunkMap = Object.fromEntries(chunksRes.rows.map(r => [r.province, Number(r.count)]));

  // Query admission records count
  const recordsRes = await pool.query(
    `SELECT province, COUNT(*) as count 
     FROM gaokao_admission_records 
     GROUP BY province`
  );
  const recordMap = Object.fromEntries(recordsRes.rows.map(r => [r.province, Number(r.count)]));

  console.log("=== GAOKAO NATIONAL DATA AUDIT ===");
  console.log("Province | Raw Documents | RAG Chunks | Structured Admission Records");
  console.log("---------|---------------|------------|-----------------------------");
  for (const p of provinces) {
    const docs = docMap[p] || 0;
    const chunks = chunkMap[p] || 0;
    const records = recordMap[p] || 0;
    console.log(`${p.padEnd(8)} | ${String(docs).padEnd(13)} | ${String(chunks).padEnd(10)} | ${String(records).padEnd(27)}`);
  }
});
