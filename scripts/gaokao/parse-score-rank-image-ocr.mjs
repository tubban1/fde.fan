import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { upsertSource, withDb } from './lib/db.mjs';

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function parseOcrText(text) {
  const rows = new Map();
  for (const line of text.split(/\r?\n/)) {
    const numbers = line.match(/\d+/g)?.map(Number) || [];
    if (numbers.length < 3) continue;

    for (let index = 0; index <= numbers.length - 3; index += 3) {
      const [score, same, cumulative] = numbers.slice(index, index + 3);
      if (score < 100 || score > 750) continue;
      if (same < 0 || same > cumulative) continue;
      const existing = rows.get(score);
      if (!existing || cumulative > existing.cumulative_count) {
        rows.set(score, {
          score,
          same_score_count: same,
          cumulative_count: cumulative,
          min_rank: cumulative - same + 1,
          max_rank: cumulative,
          raw_line: line.trim()
        });
      }
    }
  }
  return [...rows.values()].sort((a, b) => b.score - a.score);
}

const file = getArg('file');
const province = getArg('province');
const year = Number(getArg('year', '2026'));
const candidateTrack = getArg('candidate-track');
const subjectCombo = getArg('subject-combo', candidateTrack);
const title = getArg('title', `${province}${year}${candidateTrack}一分段表`);
const publisher = getArg('publisher');
const url = getArg('url');
const lang = getArg('lang', 'eng');

if (!file || !province || !year || !candidateTrack) {
  console.error('Usage: node scripts/gaokao/parse-score-rank-image-ocr.mjs --province=江苏 --year=2026 --candidate-track=历史等科目类 --file=path/to/table.jpg');
  process.exit(1);
}

const resolvedFile = path.resolve(file);
if (!fs.existsSync(resolvedFile)) throw new Error(`File not found: ${resolvedFile}`);

const text = execFileSync('tesseract', [resolvedFile, 'stdout', '-l', lang, '--psm', '6'], {
  encoding: 'utf8',
  maxBuffer: 80 * 1024 * 1024
});
const parsed = parseOcrText(text);
if (!parsed.length) throw new Error('No score-rank rows parsed from OCR.');

await withDb(async (pool) => {
  const sourceId = await upsertSource(pool, {
    source_type: 'admission_record',
    province,
    year,
    title,
    publisher,
    url: url || undefined,
    file_url: url || undefined,
    parse_status: 'parsed',
    raw_data: {
      local_path: file,
      parser: 'parse-score-rank-image-ocr',
      ocr_language: lang,
      rows: parsed.length,
      min_score: Math.min(...parsed.map(row => row.score)),
      max_score: Math.max(...parsed.map(row => row.score))
    }
  });

  for (let offset = 0; offset < parsed.length; offset += 100) {
    const batch = parsed.slice(offset, offset + 100);
    const values = [];
    const placeholders = batch.map((row, index) => {
      const base = index * 11;
      values.push(
        province,
        year,
        candidateTrack,
        subjectCombo,
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

  console.log(`Parsed ${parsed.length} OCR score-rank rows for ${province} ${year} ${candidateTrack}.`);
});
