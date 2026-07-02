import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { upsertSource, withDb } from './lib/db.mjs';

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function toInt(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/[,，\s]/g, '').trim();
  if (!text || text === '-' || text === '—') return null;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function cleanLabel(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function normalizeSubjectCombo(group) {
  const label = cleanLabel(group);
  if (!label || label === '全体' || label === '合计') return '不限';
  return label;
}

function parseGroupedScoreRank(rows) {
  let headerIndex = -1;
  for (let index = 0; index < Math.min(rows.length, 12); index += 1) {
    if (rows[index].some(cell => /分数段|分数/.test(cleanLabel(cell)))) {
      headerIndex = index;
      break;
    }
  }
  if (headerIndex < 0 || headerIndex + 1 >= rows.length) {
    throw new Error('Cannot find score-rank header rows.');
  }

  const groupRow = rows[headerIndex];
  const subHeaderRow = rows[headerIndex + 1] || [];
  const scoreColumn = groupRow.findIndex(cell => /分数段|分数/.test(cleanLabel(cell)));
  if (scoreColumn < 0) throw new Error('Cannot find score column.');

  const groups = [];
  for (let col = scoreColumn + 1; col < Math.max(groupRow.length, subHeaderRow.length); col += 1) {
    const group = cleanLabel(groupRow[col]);
    const subHeader = cleanLabel(subHeaderRow[col]);
    const nextSubHeader = cleanLabel(subHeaderRow[col + 1]);
    if (!group) continue;
    if (!/本段|人数/.test(subHeader)) continue;
    if (!/累计/.test(nextSubHeader)) continue;
    groups.push({
      label: group,
      subject_combo: normalizeSubjectCombo(group),
      sameColumn: col,
      cumulativeColumn: col + 1
    });
    col += 1;
  }

  if (!groups.length) throw new Error('Cannot find grouped count columns.');

  const parsed = [];
  for (let rowIndex = headerIndex + 2; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const score = toInt(row[scoreColumn]);
    if (score === null) continue;

    for (const group of groups) {
      const same = toInt(row[group.sameColumn]);
      const cumulative = toInt(row[group.cumulativeColumn]);
      if (same === null && cumulative === null) continue;
      if (cumulative === null) continue;
      parsed.push({
        score,
        same_score_count: same ?? null,
        cumulative_count: cumulative,
        min_rank: same ? cumulative - same + 1 : null,
        max_rank: cumulative,
        subject_combo: group.subject_combo,
        group_label: group.label,
        row_index: rowIndex + 1
      });
    }
  }

  return parsed;
}

function readRows(file, sheetName) {
  const workbook = XLSX.readFile(file, { cellDates: false });
  const name = sheetName || workbook.SheetNames[0];
  if (!name || !workbook.Sheets[name]) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }
  return XLSX.utils.sheet_to_json(workbook.Sheets[name], {
    header: 1,
    raw: false,
    defval: ''
  });
}

const file = getArg('file');
const province = getArg('province');
const year = Number(getArg('year', '2026'));
const candidateTrack = getArg('candidate-track', '综合改革');
const sheet = getArg('sheet');
const title = getArg('title', `${province}${year}一分一段表`);
const url = getArg('url');
const publisher = getArg('publisher');

if (!file || !province || !year) {
  console.error('Usage: node scripts/gaokao/parse-score-rank-spreadsheet.mjs --province=山东 --year=2026 --file=path/to/file.xls [--candidate-track=综合改革]');
  process.exit(1);
}

const resolvedFile = path.resolve(file);
if (!fs.existsSync(resolvedFile)) throw new Error(`File not found: ${resolvedFile}`);

const rows = readRows(resolvedFile, sheet);
const parsed = parseGroupedScoreRank(rows);
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
      parser: 'parse-score-rank-spreadsheet',
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
        row.subject_combo,
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

  const combos = [...new Set(parsed.map(row => row.subject_combo))].join(', ');
  console.log(`Parsed ${parsed.length} score-rank rows for ${province} ${year}: ${combos}.`);
});
