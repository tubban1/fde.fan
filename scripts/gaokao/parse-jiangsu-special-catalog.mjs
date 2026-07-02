import XLSX from 'xlsx';
import { upsertSource, withDb } from './lib/db.mjs';

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function durationYears(value) {
  const text = clean(value);
  if (text === '四') return 4;
  if (text === '五') return 5;
  if (text === '三') return 3;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function tuition(value) {
  const match = clean(value).replace(/[,，]/g, '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

async function ensureInstitution(pool, code, name, sourceId) {
  const result = await pool.query(
    `insert into gaokao_institutions (local_code, name, source_id, raw_data)
     values ($1,$2,$3,$4::jsonb)
     on conflict (name, province, city) do update
       set local_code = coalesce(gaokao_institutions.local_code, excluded.local_code),
           updated_at = now()
     returning id`,
    [code || null, name, sourceId, JSON.stringify({ parser: 'parse-jiangsu-special-catalog' })]
  );
  return result.rows[0].id;
}

function buildValues(rows, mapper) {
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const mapped = mapper(row);
    values.push(...mapped);
    const offset = rowIndex * mapped.length;
    return `(${mapped.map((_, colIndex) => `$${offset + colIndex + 1}`).join(',')})`;
  });
  return { values, placeholders: placeholders.join(',') };
}

async function insertInBatches(pool, rows, chunkSize, sqlForChunk, mapper) {
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const { values, placeholders } = buildValues(chunk, mapper);
    await pool.query(sqlForChunk(placeholders), values);
  }
}

function parseCatalog(file, catalogType) {
  const wb = XLSX.readFile(file, { cellDates: false });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
  const parsed = [];
  let candidateTrack = '';
  let institutionCode = '';
  let institutionName = '';
  let majorGroupCode = '';
  let majorGroupName = '';
  let headerSeen = false;

  for (const row of rows) {
    const code = clean(row[0]);
    const name = clean(row[1]);
    const subjectRequirement = clean(row[2]);
    const duration = clean(row[3]);
    const fee = clean(row[4]);

    if (!code && !name) continue;
    if (/历史等科目类|物理等科目类/.test(name || code)) {
      candidateTrack = /物理/.test(name || code) ? '物理等科目类' : '历史等科目类';
      continue;
    }
    if (code === '代号') {
      headerSeen = true;
      continue;
    }
    if (!headerSeen) continue;

    if (/^\d{4}$/.test(code)) {
      institutionCode = code;
      institutionName = name;
      majorGroupCode = '';
      majorGroupName = '';
      continue;
    }
    if (/^\d{4}[A-Z]\d$/i.test(code)) {
      majorGroupCode = code;
      majorGroupName = name;
      continue;
    }
    if (!candidateTrack || !institutionName || !/^[A-Z]\d$/i.test(code)) continue;

    parsed.push({
      candidate_track: candidateTrack,
      institution_code: institutionCode,
      institution_name: institutionName,
      major_group_code: majorGroupCode,
      major_group_name: majorGroupName,
      major_code: code,
      major_name: name,
      subject_requirements: subjectRequirement && subjectRequirement !== '不限' ? [subjectRequirement] : [],
      subject_combo: subjectRequirement || null,
      duration_years: durationYears(duration),
      tuition_cny: tuition(fee),
      catalog_type: catalogType,
      raw_row: row
    });
  }
  return parsed;
}

const file = getArg('file');
const catalogType = getArg('catalog-type', '特殊类型招生专业目录');
const batch = getArg('batch', catalogType);
const sourceTitle = getArg('source-title', catalogType);
const url = getArg('url');
const dryRun = hasFlag('dry-run');
if (!file) {
  console.error('Usage: node scripts/gaokao/parse-jiangsu-special-catalog.mjs --file=... --catalog-type=综合评价招生B类');
  process.exit(1);
}

const parsed = parseCatalog(file, catalogType);
if (!parsed.length) throw new Error('No catalog rows parsed.');

if (dryRun) {
  const byTrack = parsed.reduce((acc, row) => {
    acc[row.candidate_track] = (acc[row.candidate_track] || 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({ file, catalogType, rows: parsed.length, byTrack }, null, 2));
  process.exit(0);
}

await withDb(async (pool) => {
  await pool.query('begin');
  try {
    const sourceId = await upsertSource(pool, {
      source_type: 'enrollment_plan',
      province: '江苏',
      year: 2026,
      title: sourceTitle,
      publisher: '江苏省教育考试院',
      url: url || undefined,
      file_url: url || undefined,
      parse_status: 'parsed',
      raw_data: {
        local_path: file,
        parser: 'parse-jiangsu-special-catalog',
        rows: parsed.length
      }
    });

    await pool.query(
      `delete from gaokao_enrollment_plans
        where province = '江苏'
          and year = 2026
          and batch = $1
          and special_flags @> array[$2]::text[]`,
      [batch, catalogType]
    );
    await pool.query(
      `delete from gaokao_subject_requirement_rules
        where province = '江苏'
          and year = 2026
          and raw_data->>'parser' = 'parse-jiangsu-special-catalog'
          and raw_data->>'catalog_type' = $1`,
      [catalogType]
    );

    const institutionIds = new Map();
    for (const row of parsed) {
      const key = `${row.institution_code}:${row.institution_name}`;
      if (!institutionIds.has(key)) {
        institutionIds.set(key, await ensureInstitution(pool, row.institution_code, row.institution_name, sourceId));
      }
      row.institution_id = institutionIds.get(key);
    }

    await insertInBatches(
      pool,
      parsed,
      100,
      placeholders => `insert into gaokao_enrollment_plans
        (province, year, batch, candidate_track, subject_combo, institution_id, institution_code,
         major_group_code, major_code, major_name, planned_count, tuition_cny, duration_years,
         subject_requirements, special_flags, source_id, raw_data)
       values ${placeholders}`,
      row => [
        '江苏',
        2026,
        batch,
        row.candidate_track,
        row.subject_combo,
        row.institution_id,
        row.institution_code,
        row.major_group_code,
        row.major_code,
        row.major_name,
        0,
        row.tuition_cny,
        row.duration_years,
        row.subject_requirements,
        [catalogType, '专业目录无计划数'],
        sourceId,
        JSON.stringify(row)
      ]
    );

    await insertInBatches(
      pool,
      parsed,
      100,
      placeholders => `insert into gaokao_subject_requirement_rules
        (province, year, degree_level, rule_scope, institution_code, major_group_code,
         major_code, major_name, required_subjects, requirement_text, source_id, raw_data)
       values ${placeholders}`,
      row => [
        '江苏',
        2026,
        'undergraduate',
        row.major_group_code ? 'major_group' : 'major',
        row.institution_code,
        row.major_group_code,
        row.major_code,
        row.major_name,
        row.subject_requirements,
        row.subject_combo,
        sourceId,
        JSON.stringify({
          parser: 'parse-jiangsu-special-catalog',
          catalog_type: catalogType,
          row
        })
      ]
    );

    await pool.query('commit');
    console.log(`Imported ${parsed.length} Jiangsu special catalog plan row(s): ${catalogType}.`);
  } catch (error) {
    await pool.query('rollback');
    throw error;
  }
});
