import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { withDb } from './lib/db.mjs';

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function normalizeText(value) {
  return String(value || '')
    .replace(/[０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/[（(]/g, '（')
    .replace(/[）)]/g, '）')
    .replace(/[＆]/g, '&')
    .replace(/[／]/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanName(value) {
  return normalizeText(value)
    .replace(/\s*（\s*/g, '（')
    .replace(/\s*）\s*/g, '）')
    .replace(/\s*·\s*/g, '·')
    .trim();
}

function extractPdfPages(pdfPath, maxPages = 0) {
  const script = `
import json
import sys
from pypdf import PdfReader
reader = PdfReader(sys.argv[1])
max_pages = int(sys.argv[2])
pages = []
for index, page in enumerate(reader.pages):
    if max_pages and index >= max_pages:
        break
    pages.append(page.extract_text() or '')
print(json.dumps(pages, ensure_ascii=False))
`;
  return JSON.parse(execFileSync('python3', ['-c', script, pdfPath, String(maxPages || 0)], {
    encoding: 'utf8',
    maxBuffer: 250 * 1024 * 1024
  }));
}

function inferYearFromPath(pdfPath) {
  const match = String(pdfPath).match(/20\d{2}/);
  return match ? Number(match[0]) : null;
}

function parseInstitution(line) {
  const normalized = cleanName(line);
  const match = normalized.match(/^(\d{4})\s+(.+?)(?:（(.+?)）)?$/);
  if (!match) return null;
  if (/年浙江省|录取情况|分段线|目录|院校代码/.test(normalized)) return null;
  const location = match[3] || '';
  let province = '';
  let city = '';
  if (location) {
    const parts = location.split('·').map(item => item.trim()).filter(Boolean);
    province = parts[0] || '';
    city = parts[1] || '';
  }
  return {
    code: match[1],
    name: cleanName(match[2]),
    province,
    city,
    rawLocation: location
  };
}

function parseInstitutionNameWithCode(code, line) {
  const normalized = cleanName(line);
  if (!code || !normalized) return null;
  if (/^\d{4}$/.test(normalized)) return null;
  if (/年浙江省|录取情况|分段线|目录|院校代码|名称、所在地/.test(normalized)) return null;
  const match = normalized.match(/^(.+?)(?:（(.+?)）)?$/);
  if (!match) return null;
  const location = match[2] || '';
  let province = '';
  let city = '';
  if (location) {
    const parts = location.split('·').map(item => item.trim()).filter(Boolean);
    province = parts[0] || '';
    city = parts[1] || '';
  }
  return {
    code,
    name: cleanName(match[1]),
    province,
    city,
    rawLocation: location
  };
}

function splitSubject(part) {
  const normalized = cleanName(part);
  const subjectRe = /(物理\s*&\s*化学\s*&\s*生物|物理\s*\/\s*化学\s*\/\s*生物|物理\s*\/\s*化学\s*\/\s*技术|物理\s*&\s*化学|物理\s*&\s*生物|物理\s*&\s*地理|化学\s*&\s*生物|历史\s*&\s*地理|历史\s*&\s*思想政治|不限|物理|化学|生物|历史|地理|思想政治|技术)$/;
  const match = normalized.match(subjectRe);
  if (!match) return null;
  const subject = cleanName(match[1]);
  const majorName = cleanName(normalized.slice(0, match.index));
  if (!majorName) return null;
  return { majorName, subject };
}

function parseMajorLine(line) {
  const normalized = cleanName(line);
  if (!normalized || /^(院校代码|名称|选考科目|范围要求|录取人数|学制|平均分|最低分|位次|一段|二段|第 \d+ 页|·\d+·)/.test(normalized)) {
    return null;
  }
  if (/^\d{4}\s+/.test(normalized)) return null;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const numeric = [];
  while (tokens.length && /^\d+$/.test(tokens[tokens.length - 1])) {
    numeric.unshift(tokens.pop());
  }
  if (numeric.length < 5) return null;
  const subjectParts = splitSubject(tokens.join(' '));
  if (!subjectParts) return null;

  const numbers = numeric.map(Number);
  const admittedCount = numbers[0] || null;
  const durationYears = numbers[1] || null;
  const avgScore = numbers[2] || null;
  const minScore = numbers[numbers.length - 2] || null;
  const minRank = numbers[numbers.length - 1] || null;
  if (!minScore || !minRank || minScore > 750 || minRank < 100) return null;

  return {
    ...subjectParts,
    admittedCount,
    durationYears,
    avgScore,
    minScore,
    minRank,
    rawNumbers: numbers,
    rawLine: normalized
  };
}

function inferBatch(line, currentBatch) {
  if (/普通类提前录取/.test(line)) return '普通类提前录取';
  if (/普通类平行投档/.test(line)) return '普通类平行录取';
  if (/艺术类/.test(line)) return '艺术类';
  if (/体育类/.test(line)) return '体育类';
  return currentBatch;
}

function parsePdf(pdfPath, { maxPages = 0 } = {}) {
  const year = inferYearFromPath(pdfPath);
  const pages = extractPdfPages(pdfPath, maxPages);
  const records = [];
  let currentInstitution = null;
  let currentBatch = '普通类';
  let pendingInstitutionCode = '';

  pages.forEach((pageText, pageIndex) => {
    const lines = pageText.split(/\r?\n/).map(normalizeText).filter(Boolean);
    for (const line of lines) {
      currentBatch = inferBatch(line, currentBatch);
      if (/^\d{4}$/.test(line)) {
        pendingInstitutionCode = line;
        continue;
      }
      if (pendingInstitutionCode) {
        const splitInstitution = parseInstitutionNameWithCode(pendingInstitutionCode, line);
        pendingInstitutionCode = '';
        if (splitInstitution) {
          currentInstitution = splitInstitution;
          continue;
        }
      }
      const institution = parseInstitution(line);
      if (institution) {
        currentInstitution = institution;
        continue;
      }
      if (!currentInstitution) continue;
      const major = parseMajorLine(line);
      if (!major) continue;
      records.push({
        province: '浙江',
        year,
        batch: currentBatch,
        candidateTrack: '综合改革',
        subjectCombo: major.subject,
        institution: currentInstitution,
        majorCode: '',
        majorName: major.majorName,
        minScore: major.minScore,
        minRank: major.minRank,
        avgScore: major.avgScore,
        plannedCount: null,
        admittedCount: major.admittedCount,
        durationYears: major.durationYears,
        page: pageIndex + 1,
        rawLine: major.rawLine,
        rawNumbers: major.rawNumbers
      });
    }
  });

  return records;
}

async function getSourceId(pool, pdfPath, year) {
  const byPath = await pool.query(
    `select id from gaokao_source_documents where raw_data->>'local_path' = $1 limit 1`,
    [pdfPath]
  );
  if (byPath.rows[0]?.id) return byPath.rows[0].id;

  const byTitle = await pool.query(
    `select id from gaokao_source_documents
      where province = '浙江' and year = $1 and (title like '%投档及专业录取情况%' or title like $2)
      order by fetched_at desc
      limit 1`,
    [year, `%${path.basename(pdfPath)}%`]
  );
  return byTitle.rows[0]?.id || null;
}

function institutionKey(institution) {
  return `${institution.code}:${institution.name}:${institution.province || ''}:${institution.city || ''}`;
}

async function upsertInstitutions(pool, records, sourceId) {
  const unique = new Map();
  for (const record of records) {
    const key = institutionKey(record.institution);
    if (!unique.has(key)) unique.set(key, record.institution);
  }

  const cache = new Map();
  const institutions = [...unique.values()];
  for (let offset = 0; offset < institutions.length; offset += 250) {
    const batch = institutions.slice(offset, offset + 250);
    const values = [];
    const placeholders = batch.map((institution, index) => {
      const base = index * 6;
      values.push(
        institution.code,
        institution.name,
        institution.province || null,
        institution.city || null,
        sourceId,
        JSON.stringify(institution)
      );
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6}::jsonb)`;
    }).join(',');

    const result = await pool.query(
      `insert into gaokao_institutions
        (local_code, name, province, city, source_id, raw_data)
       values ${placeholders}
       on conflict (name, province, city) do update
         set local_code = coalesce(gaokao_institutions.local_code, excluded.local_code),
             source_id = coalesce(gaokao_institutions.source_id, excluded.source_id)
       returning id, local_code, name, province, city`,
      values
    );
    for (const row of result.rows) {
      cache.set(`${row.local_code}:${row.name}:${row.province || ''}:${row.city || ''}`, row.id);
    }
  }

  return cache;
}

async function insertRecords(pool, records, sourceId) {
  if (!records.length) return 0;
  const institutionIdCache = await upsertInstitutions(pool, records, sourceId);
  const rows = [];
  for (const record of records) {
    const key = institutionKey(record.institution);
    if (!institutionIdCache.has(key)) throw new Error(`Missing institution id for ${key}`);
    rows.push({ ...record, institutionId: institutionIdCache.get(key) });
  }

  await pool.query(`delete from gaokao_admission_records where source_id = $1`, [sourceId]);

  let inserted = 0;
  for (let offset = 0; offset < rows.length; offset += 200) {
    const batch = rows.slice(offset, offset + 200);
    const values = [];
    const placeholders = batch.map((record, index) => {
      const base = index * 22;
      values.push(
        record.province,
        record.year,
        record.batch,
        record.candidateTrack,
        record.subjectCombo,
        record.institutionId,
        record.institution.code,
        '',
        null,
        record.majorCode,
        record.majorName,
        record.minScore,
        record.minRank,
        record.avgScore,
        null,
        null,
        null,
        record.plannedCount,
        record.admittedCount,
        'major',
        sourceId,
        JSON.stringify({
          page: record.page,
          raw_line: record.rawLine,
          raw_numbers: record.rawNumbers,
          duration_years: record.durationYears,
          institution: record.institution
        })
      );
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13},$${base + 14},$${base + 15},$${base + 16},$${base + 17},$${base + 18},$${base + 19},$${base + 20},$${base + 21},$${base + 22}::jsonb)`;
    }).join(',');

    await pool.query(
      `insert into gaokao_admission_records
        (province, year, batch, candidate_track, subject_combo, institution_id, institution_code,
         major_group_code, major_id, major_code, major_name, min_score, min_rank, avg_score,
         avg_rank, max_score, max_rank, planned_count, admitted_count, record_level, source_id, raw_data)
       values ${placeholders}`,
      values
    );
    inserted += batch.length;
  }
  return inserted;
}

const fileArg = getArg('file');
const maxPages = Number(getArg('max-pages', '0'));
const dryRun = hasFlag('dry-run');
const files = fileArg
  ? [fileArg]
  : fs.readdirSync('data/gaokao/raw/浙江', { recursive: true })
    .map(file => path.join('data/gaokao/raw/浙江', file))
    .filter(file => file.endsWith('.pdf') && /2023|2024|2025/.test(file));

for (const file of files) {
  const records = parsePdf(file, { maxPages });
  console.log(`${file}: parsed ${records.length} admission rows`);
  console.log(records.slice(0, 5).map(item => `${item.institution.code} ${item.institution.name} ${item.majorName} ${item.minScore}/${item.minRank}`).join('\n'));
  if (dryRun) continue;

  await withDb(async (pool) => {
    const sourceId = await getSourceId(pool, file, inferYearFromPath(file));
    if (!sourceId) throw new Error(`No source document found for ${file}`);
    const inserted = await insertRecords(pool, records, sourceId);
    await pool.query(`update gaokao_source_documents set parse_status = 'parsed', updated_at = now() where id = $1`, [sourceId]);
    console.log(`${file}: inserted ${inserted} gaokao_admission_records`);
  });
}
