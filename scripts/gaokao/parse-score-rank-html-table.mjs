import fs from 'node:fs';
import path from 'node:path';
import { upsertSource, withDb } from './lib/db.mjs';

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function textFromHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toInt(value) {
  const match = String(value || '').replace(/[,，]/g, '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function parseRows(html) {
  const rows = [];
  const trMatches = html.matchAll(/<tr[\s\S]*?<\/tr>/gi);
  for (const trMatch of trMatches) {
    const tr = trMatch[0];
    const cells = [...tr.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(match => textFromHtml(match[1]));
    if (cells.length < 2) continue;
    if (cells.some(cell => /分数段|累计人数|人数/.test(cell))) continue;

    const score = toInt(cells[0]);
    if (score === null) continue;

    let same = null;
    let cumulative = null;
    if (cells.length >= 3) {
      same = toInt(cells[1]);
      cumulative = toInt(cells[2]);
    } else {
      cumulative = toInt(cells[1]);
      same = cumulative;
    }
    if (cumulative === null) continue;

    rows.push({
      score,
      same_score_count: same,
      cumulative_count: cumulative,
      min_rank: same ? cumulative - same + 1 : null,
      max_rank: cumulative,
      raw_cells: cells
    });
  }
  return rows.sort((a, b) => b.score - a.score);
}

const file = getArg('file');
const province = getArg('province');
const year = Number(getArg('year', '2026'));
const candidateTrack = getArg('candidate-track');
const subjectCombo = getArg('subject-combo', candidateTrack);
const title = getArg('title', `${province}${year}${candidateTrack}一分段表`);
const publisher = getArg('publisher');
const url = getArg('url');

if (!file || !province || !year || !candidateTrack) {
  console.error('Usage: node scripts/gaokao/parse-score-rank-html-table.mjs --province=重庆 --year=2026 --candidate-track=历史类 --file=path/to/table.htm');
  process.exit(1);
}

const resolvedFile = path.resolve(file);
if (!fs.existsSync(resolvedFile)) throw new Error(`File not found: ${resolvedFile}`);

const parsed = parseRows(fs.readFileSync(resolvedFile, 'utf8'));
if (!parsed.length) throw new Error('No score-rank rows parsed.');

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
      parser: 'parse-score-rank-html-table',
      rows: parsed.length
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

  console.log(`Parsed ${parsed.length} score-rank rows for ${province} ${year} ${candidateTrack}.`);
});
