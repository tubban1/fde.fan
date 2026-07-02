import { withDb } from './lib/db.mjs';

const CONFIGS = [
  {
    file: 'data/gaokao/raw/安徽/2026/01bddaece98cde2b.pdf',
    batch: '国家专项计划',
    candidateTrack: '历史科目组合',
    sourceTitle: '2026年国家专项计划（历史科目组合）'
  },
  {
    file: 'data/gaokao/raw/安徽/2026/anhui-national-physics-2026.pdf',
    batch: '国家专项计划',
    candidateTrack: '物理科目组合',
    sourceTitle: '2026年国家专项计划（物理科目组合）'
  },
  {
    file: 'data/gaokao/raw/安徽/2026/05a73ed6e76dab64.pdf',
    batch: '地方专项计划',
    candidateTrack: '物理科目组合',
    sourceTitle: '2026年地方专项计划（物理科目组合）'
  },
  {
    file: 'data/gaokao/raw/安徽/2026/1b4e1bf826d232e2.pdf',
    batch: '高校专项计划',
    candidateTrack: '物理科目组合',
    sourceTitle: '2026年高校专项计划（物理科目组合）'
  },
  {
    file: 'data/gaokao/raw/安徽/2026/ce57915a728b462e.pdf',
    batch: '地方专项计划',
    candidateTrack: '历史科目组合',
    sourceTitle: '2026年地方专项计划（历史科目组合）'
  },
  {
    file: 'data/gaokao/raw/安徽/2026/d438a0c36f6f998f.pdf',
    batch: '高校专项计划',
    candidateTrack: '历史科目组合',
    sourceTitle: '2026年高校专项计划（历史科目组合）'
  }
];

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

function tuition(value) {
  const text = clean(value).replace(/[,，]/g, '');
  if (!text || text === '免费') return null;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function subjectRequirements(text) {
  const req = clean(text);
  if (!req || /不限$/.test(req)) return [];
  return req.split('+').map(clean).filter(Boolean);
}

function isNoise(line) {
  return !line
    || /^# /.test(line)
    || /^---/.test(line)
    || /^第\s*\d+\s*页/.test(line)
    || /^2026年/.test(line)
    || /^说明/.test(line)
    || /^院校/.test(line)
    || /^代码/.test(line)
    || /^组号/.test(line)
    || /^专业/.test(line)
    || /^学制/.test(line)
    || /^收费标准/.test(line)
    || /^招生/.test(line)
    || /^计划\s+备注$/.test(line)
    || /^备注/.test(line)
    || /^[(（]年[)）]/.test(line)
    || /^\d+\./.test(line);
}

function parseRows(text, config) {
  const rows = [];
  let pendingRemark = '';
  let current = null;
  const rowPattern = /^(\d{4})\s+(.+?)\s+(\d{3})\s+([^\s]+)\s+([A-Z0-9]{2})\s+(.+?)\s+([三四五]|\d+)\s+([^\s]+)\s+(\d+)(?:\s+(.*))?$/;

  for (const rawLine of text.split(/\n+/)) {
    const line = clean(rawLine);
    if (isNoise(line)) {
      pendingRemark = '';
      continue;
    }

    const match = line.match(rowPattern);
    if (match) {
      current = {
        institution_code: match[1],
        institution_name: match[2],
        major_group_code: match[3],
        subject_combo: match[4],
        major_code: match[5],
        major_name: match[6],
        duration_years: match[7] === '三' ? 3 : match[7] === '四' ? 4 : match[7] === '五' ? 5 : Number(match[7]),
        tuition_cny: tuition(match[8]),
        planned_count: Number(match[9]),
        remark: clean([pendingRemark, match[10]].filter(Boolean).join(' ')),
        batch: config.batch,
        candidate_track: config.candidateTrack,
        source_title: config.sourceTitle
      };
      rows.push(current);
      pendingRemark = '';
      continue;
    }

    if (current) {
      current.remark = clean([current.remark, line].filter(Boolean).join(' '));
    } else {
      pendingRemark = clean([pendingRemark, line].filter(Boolean).join(' '));
    }
  }

  return rows;
}

async function loadSourceText(pool, file) {
  const source = await pool.query(
    `select d.id, d.title, d.url, count(c.id)::int as chunks
       from gaokao_source_documents d
       left join gaokao_document_chunks c on c.source_id = d.id
      where d.province = '安徽'
        and d.year = 2026
        and d.raw_data->>'local_path' = $1
      group by d.id, d.title, d.url
      order by chunks desc, d.fetched_at desc
      limit 1`,
    [file]
  );
  if (!source.rows[0]?.id) return null;

  const chunks = await pool.query(
    `select content
       from gaokao_document_chunks
      where source_id = $1
      order by chunk_index`,
    [source.rows[0].id]
  );
  return {
    source: source.rows[0],
    text: chunks.rows.map(row => row.content).join('\n')
  };
}

async function ensureInstitution(pool, code, name, sourceId) {
  const result = await pool.query(
    `insert into gaokao_institutions (local_code, name, source_id, raw_data)
     values ($1,$2,$3,$4::jsonb)
     on conflict (name, province, city) do update
       set local_code = coalesce(gaokao_institutions.local_code, excluded.local_code),
           updated_at = now()
     returning id`,
    [code || null, name, sourceId, JSON.stringify({ parser: 'parse-anhui-special-plans' })]
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

const onlyBatch = getArg('batch');
const dryRun = hasFlag('dry-run');
const configs = onlyBatch ? CONFIGS.filter(config => config.batch === onlyBatch) : CONFIGS;

await withDb(async (pool) => {
  const parsedBySource = [];
  for (const config of configs) {
    const loaded = await loadSourceText(pool, config.file);
    if (!loaded) {
      console.warn(`Missing extracted chunks for ${config.file}`);
      continue;
    }
    const rows = parseRows(loaded.text, config).map(row => ({
      ...row,
      source_id: loaded.source.id,
      source_url: loaded.source.url
    }));
    parsedBySource.push({ config, source: loaded.source, rows });
  }

  if (dryRun) {
    console.log(JSON.stringify(parsedBySource.map(item => ({
      file: item.config.file,
      title: item.config.sourceTitle,
      rows: item.rows.length,
      first: item.rows[0],
      last: item.rows[item.rows.length - 1]
    })), null, 2));
    return;
  }

  await pool.query('begin');
  try {
    for (const item of parsedBySource) {
      await pool.query(
        `delete from gaokao_enrollment_plans
          where province = '安徽'
            and year = 2026
            and batch = $1
            and candidate_track = $2
            and raw_data->>'parser' = 'parse-anhui-special-plans'`,
        [item.config.batch, item.config.candidateTrack]
      );
      await pool.query(
        `delete from gaokao_subject_requirement_rules
          where province = '安徽'
            and year = 2026
            and raw_data->>'parser' = 'parse-anhui-special-plans'
            and raw_data->>'batch' = $1
            and raw_data->>'candidate_track' = $2`,
        [item.config.batch, item.config.candidateTrack]
      );

      const institutionIds = new Map();
      for (const row of item.rows) {
        const key = `${row.institution_code}:${row.institution_name}`;
        if (!institutionIds.has(key)) {
          institutionIds.set(key, await ensureInstitution(pool, row.institution_code, row.institution_name, row.source_id));
        }
        row.institution_id = institutionIds.get(key);
      }

      await insertInBatches(
        pool,
        item.rows,
        100,
        placeholders => `insert into gaokao_enrollment_plans
          (province, year, batch, candidate_track, subject_combo, institution_id, institution_code,
           major_group_code, major_code, major_name, planned_count, tuition_cny, duration_years,
           subject_requirements, special_flags, source_id, raw_data)
         values ${placeholders}`,
        row => [
          '安徽',
          2026,
          row.batch,
          row.candidate_track,
          row.subject_combo,
          row.institution_id,
          row.institution_code,
          row.major_group_code,
          row.major_code,
          row.major_name,
          row.planned_count,
          row.tuition_cny,
          row.duration_years,
          subjectRequirements(row.subject_combo),
          [row.batch],
          row.source_id,
          JSON.stringify({ ...row, parser: 'parse-anhui-special-plans' })
        ]
      );

      await insertInBatches(
        pool,
        item.rows,
        100,
        placeholders => `insert into gaokao_subject_requirement_rules
          (province, year, degree_level, rule_scope, institution_code, major_group_code,
           major_code, major_name, required_subjects, requirement_text, source_id, raw_data)
         values ${placeholders}`,
        row => [
          '安徽',
          2026,
          'undergraduate',
          'major_group',
          row.institution_code,
          row.major_group_code,
          row.major_code,
          row.major_name,
          subjectRequirements(row.subject_combo),
          row.subject_combo,
          row.source_id,
          JSON.stringify({ ...row, parser: 'parse-anhui-special-plans' })
        ]
      );

      console.log(`Imported ${item.rows.length} Anhui plan row(s): ${item.config.sourceTitle}.`);
    }
    await pool.query('commit');
  } catch (error) {
    await pool.query('rollback');
    throw error;
  }
});
