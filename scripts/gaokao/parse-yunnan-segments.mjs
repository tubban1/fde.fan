import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadLocalEnv } from './lib/env.mjs';
import { withDb, upsertSource } from './lib/db.mjs';

loadLocalEnv();

const year = 2026;
const province = '云南';
const rawDir = 'data/gaokao/raw/云南/2026';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  
  const parsed = [];
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i];
    if (i === 0 && row.includes('分数')) continue; // Skip header
    
    const parts = row.split(',').map(p => p.trim());
    if (parts.length < 3) continue;
    
    const [scoreStr, sameStr, cumulativeStr] = parts;
    const scoreMatch = scoreStr.match(/\d+/);
    if (!scoreMatch) continue;
    
    const score = Number(scoreMatch[0]);
    const same = Number(sameStr) || 0;
    const cumulative = Number(cumulativeStr) || 0;
    
    parsed.push({
      score,
      same_score_count: same,
      cumulative_count: cumulative,
      min_rank: same ? cumulative - same + 1 : null,
      max_rank: cumulative,
      row_index: i + 1
    });
  }
  return parsed;
}

await withDb(async pool => {
  const tasks = [
    {
      file: 'yunnan_physics_2026.csv',
      track: '物理类',
      title: '2026年云南省高考成绩分数段统计表（物理类）'
    },
    {
      file: 'yunnan_history_2026.csv',
      track: '历史类',
      title: '2026年云南省高考成绩分数段统计表（历史类）'
    }
  ];

  for (const task of tasks) {
    const localPath = path.join(rawDir, task.file);
    const resolvedPath = path.resolve(localPath);
    
    if (!fs.existsSync(resolvedPath)) {
      console.log(`⚠️ File ${localPath} not found, skipping.`);
      continue;
    }

    const buffer = fs.readFileSync(resolvedPath);
    const hash = sha256(buffer);
    const parsedRows = parseCsv(resolvedPath);

    if (!parsedRows.length) {
      console.log(`⚠️ No rows parsed from ${localPath}`);
      continue;
    }

    console.log(`Parsed ${parsedRows.length} rows from ${task.file}.`);

    // Upsert source document
    const sourceId = await upsertSource(pool, {
      source_type: 'admission_record',
      province,
      year,
      title: task.title,
      publisher: '云南省招生考试院',
      url: 'https://www.6617.com/p_3091248494.html',
      file_url: 'https://www.6617.com/p_3091248494.html',
      file_hash: hash,
      parse_status: 'parsed',
      raw_data: {
        local_path: localPath,
        parser: 'parse-yunnan-segments',
        rows: parsedRows.length
      }
    });

    console.log(`Registered source: "${task.title}" (ID: ${sourceId})`);

    // Bulk insert into gaokao_score_rank_segments
    for (let offset = 0; offset < parsedRows.length; offset += 100) {
      const batch = parsedRows.slice(offset, offset + 100);
      const values = [];
      const placeholders = batch.map((row, index) => {
        const base = index * 11;
        values.push(
          province,
          year,
          task.track, // candidate_track
          task.track, // subject_combo
          row.score,
          row.same_score_count,
          row.cumulative_count,
          row.min_rank,
          row.max_rank,
          sourceId,
          JSON.stringify(row)
        );
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11}::jsonb)`;
      }).join(',');

      await pool.query(
        `insert into gaokao_score_rank_segments
          (province, year, candidate_track, subject_combo, score, same_score_count, cumulative_count, min_rank, max_rank, source_id, raw_data)
         values ${placeholders}
         on conflict (province, year, candidate_track, subject_combo, score) do update
           set same_score_count = excluded.same_score_count,
               cumulative_count = excluded.cumulative_count,
               min_rank = excluded.min_rank,
               max_rank = excluded.max_rank,
               source_id = excluded.source_id,
               raw_data = excluded.raw_data`,
        values
      );
    }

    console.log(`Successfully ingested ${parsedRows.length} segments for Yunnan 2026 ${task.track}.`);
  }
});
