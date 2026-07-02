import fs from 'node:fs';
import path from 'node:path';
import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

const baseDir = 'data/gaokao/raw';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.includes('/2026/')) {
        results.push(filePath);
      }
    }
  }
  return results;
}

const localFiles = walk(baseDir);

await withDb(async pool => {
  console.log(`Analyzing database records for ${localFiles.length} files on disk using batch query...`);
  
  const res = await pool.query(
    `select id, province, year, title, source_type, parse_status, raw_data->>'local_path' as local_path 
       from gaokao_source_documents 
      where raw_data->>'local_path' = any($1)`,
    [localFiles]
  );

  const dbMap = new Map(res.rows.map(r => [r.local_path, r]));
  
  const results = [];
  for (const file of localFiles) {
    const dbRow = dbMap.get(file);
    if (dbRow) {
      results.push({
        path: file,
        province: dbRow.province || '全国',
        title: dbRow.title,
        type: dbRow.source_type,
        status: dbRow.parse_status
      });
    } else {
      results.push({
        path: file,
        province: '未在DB注册',
        title: 'N/A',
        type: 'N/A',
        status: 'N/A'
      });
    }
  }
  
  // Sort by province
  results.sort((a, b) => a.province.localeCompare(b.province));
  
  console.table(results.map(r => ({
    province: r.province,
    path: r.path.replace('data/gaokao/raw/', ''),
    type: r.type,
    status: r.status,
    title: r.title.length > 50 ? r.title.slice(0, 50) + '...' : r.title
  })));
});
