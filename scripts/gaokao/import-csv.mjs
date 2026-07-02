import fs from 'node:fs';
import { upsertSource, withDb } from './lib/db.mjs';

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function normalizeKey(key) {
  return String(key || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function rowsFromCsv(filePath) {
  const parsed = parseCsv(fs.readFileSync(filePath, 'utf8'));
  const headers = parsed.shift().map(normalizeKey);
  return parsed.map(values => Object.fromEntries(headers.map((key, index) => [key, values[index]?.trim() || ''])));
}

function pick(row, keys, fallback = '') {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value !== undefined && value !== '') return value;
  }
  return fallback;
}

function toBool(value) {
  if (value === true || value === false) return value;
  if (!value) return null;
  return /^(true|1|是|yes|y)$/i.test(String(value).trim());
}

function toInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function toArray(value) {
  if (!value) return [];
  return String(value).split(/[;；、|]/).map(item => item.trim()).filter(Boolean);
}

async function ensureInstitution(pool, row, sourceId) {
  const name = pick(row, ['institution_name', 'school_name', '院校名称', '学校名称', 'name']);
  if (!name) throw new Error('Missing institution name.');
  const province = pick(row, ['institution_province', 'school_province', '院校省份', '所在地省份', 'province']);
  const city = pick(row, ['institution_city', 'school_city', '城市', 'city']);
  const existing = await pool.query(
    `select id from gaokao_institutions
      where name = $1 and coalesce(province, '') = coalesce($2, '') and coalesce(city, '') = coalesce($3, '')
      limit 1`,
    [name, province || null, city || null]
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;
  const result = await pool.query(
    `insert into gaokao_institutions
      (ministry_code, local_code, name, province, city, ownership, education_level, institution_type,
       is_985, is_211, is_double_first_class, is_public, is_private, tags, website, source_id, raw_data)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
     returning id`,
    [
      pick(row, ['ministry_code', '教育部代码']),
      pick(row, ['local_code', '院校代码', 'school_code']),
      name,
      province || null,
      city || null,
      pick(row, ['ownership', '主管部门', '办学性质']),
      pick(row, ['education_level', '办学层次']),
      pick(row, ['institution_type', '院校类型']),
      Boolean(toBool(pick(row, ['is_985', '985']))),
      Boolean(toBool(pick(row, ['is_211', '211']))),
      Boolean(toBool(pick(row, ['is_double_first_class', '双一流']))),
      toBool(pick(row, ['is_public', '公办'])),
      toBool(pick(row, ['is_private', '民办'])),
      toArray(pick(row, ['tags', '标签'])),
      pick(row, ['website', '官网']),
      sourceId,
      JSON.stringify(row)
    ]
  );
  return result.rows[0].id;
}

async function importInstitutions(pool, rows, sourceId) {
  for (const row of rows) await ensureInstitution(pool, row, sourceId);
  return rows.length;
}

async function importPlans(pool, rows, sourceId) {
  let count = 0;
  for (const row of rows) {
    const institutionId = await ensureInstitution(pool, row, sourceId);
    await pool.query(
      `insert into gaokao_enrollment_plans
        (province, year, batch, candidate_track, subject_combo, institution_id, institution_code,
         major_group_code, major_code, major_name, planned_count, tuition_cny, duration_years,
         campus, subject_requirements, language_requirement, physical_exam_requirement,
         single_subject_requirement, special_flags, source_id, raw_data)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19,$20,$21::jsonb)`,
      [
        pick(row, ['province', '招生省份', '省份']),
        toInt(pick(row, ['year', '年份'])),
        pick(row, ['batch', '批次'], '普通类'),
        pick(row, ['candidate_track', '科类', '考生类别'], '综合改革'),
        pick(row, ['subject_combo', '选科组合']),
        institutionId,
        pick(row, ['institution_code', '院校代码', 'school_code']),
        pick(row, ['major_group_code', '专业组代码']),
        pick(row, ['major_code', '专业代码']),
        pick(row, ['major_name', '专业名称', '专业']),
        toInt(pick(row, ['planned_count', '计划数', '招生人数'])),
        toInt(pick(row, ['tuition_cny', '学费'])),
        Number(pick(row, ['duration_years', '学制']) || '') || null,
        pick(row, ['campus', '校区', '办学地点']),
        toArray(pick(row, ['subject_requirements', '选科要求'])),
        pick(row, ['language_requirement', '语种要求']),
        pick(row, ['physical_exam_requirement', '体检要求']),
        JSON.stringify({ raw: pick(row, ['single_subject_requirement', '单科要求']) }),
        toArray(pick(row, ['special_flags', '特殊标记'])),
        sourceId,
        JSON.stringify(row)
      ]
    );
    count += 1;
  }
  return count;
}

async function importAdmissions(pool, rows, sourceId) {
  let count = 0;
  for (const row of rows) {
    const institutionId = await ensureInstitution(pool, row, sourceId);
    await pool.query(
      `insert into gaokao_admission_records
        (province, year, batch, candidate_track, subject_combo, institution_id, institution_code,
         major_group_code, major_code, major_name, min_score, min_rank, avg_score, avg_rank,
         max_score, max_rank, planned_count, admitted_count, collection_volunteer, record_level,
         source_id, raw_data)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22::jsonb)`,
      [
        pick(row, ['province', '招生省份', '省份']),
        toInt(pick(row, ['year', '年份'])),
        pick(row, ['batch', '批次'], '普通类'),
        pick(row, ['candidate_track', '科类', '考生类别'], '综合改革'),
        pick(row, ['subject_combo', '选科组合']),
        institutionId,
        pick(row, ['institution_code', '院校代码', 'school_code']),
        pick(row, ['major_group_code', '专业组代码']),
        pick(row, ['major_code', '专业代码']),
        pick(row, ['major_name', '专业名称', '专业']),
        toInt(pick(row, ['min_score', '最低分'])),
        toInt(pick(row, ['min_rank', '最低位次', '位次'])),
        Number(pick(row, ['avg_score', '平均分']) || '') || null,
        toInt(pick(row, ['avg_rank', '平均位次'])),
        toInt(pick(row, ['max_score', '最高分'])),
        toInt(pick(row, ['max_rank', '最高位次'])),
        toInt(pick(row, ['planned_count', '计划数'])),
        toInt(pick(row, ['admitted_count', '录取人数'])),
        Boolean(toBool(pick(row, ['collection_volunteer', '征集志愿']))),
        pick(row, ['record_level', '记录层级'], 'major'),
        sourceId,
        JSON.stringify(row)
      ]
    );
    count += 1;
  }
  return count;
}

const table = getArg('table');
const file = getArg('file');
if (!table || !file) {
  throw new Error('Usage: node scripts/gaokao/import-csv.mjs --table=institutions|plans|admissions --file=data.csv [--source-title=...]');
}

const rows = rowsFromCsv(file);
const sourceTitle = getArg('source-title', `${table} import: ${file}`);

await withDb(async (pool) => {
  const sourceId = await upsertSource(pool, {
    source_type: table === 'plans' ? 'enrollment_plan' : table === 'admissions' ? 'admission_record' : 'institution_site',
    province: getArg('province') || null,
    year: getArg('year') || null,
    title: sourceTitle,
    publisher: getArg('publisher') || 'manual import',
    url: getArg('url') || null,
    parse_status: 'parsed',
    raw_data: { table, file }
  });

  const count = table === 'institutions'
    ? await importInstitutions(pool, rows, sourceId)
    : table === 'plans'
      ? await importPlans(pool, rows, sourceId)
      : table === 'admissions'
        ? await importAdmissions(pool, rows, sourceId)
        : null;

  if (count === null) throw new Error(`Unsupported table: ${table}`);
  console.log(`Imported ${count} rows into ${table}`);
});
