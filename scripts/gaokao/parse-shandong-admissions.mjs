import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import { withDb } from './lib/db.mjs';
import { loadLocalEnv } from './lib/env.mjs';

loadLocalEnv();

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
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanName(value) {
  return normalizeText(value)
    .replace(/\s*（\s*/g, '（')
    .replace(/\s*）\s*/g, '）')
    .trim();
}

function parseExcel(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  let title = '';
  if (rows[0] && rows[0][0]) {
    title = cleanName(rows[0][0]);
  }
  
  let majorCol = -1;
  let instCol = -1;
  let planCol = -1;
  let rankCol = -1;
  let headerRowIndex = 1;
  let isScore = false;
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] || [];
    const foundMajor = row.findIndex(c => cleanName(c).includes('专业代号及名称'));
    if (foundMajor !== -1) {
      headerRowIndex = i;
      majorCol = foundMajor;
      instCol = row.findIndex(c => cleanName(c).includes('院校代号及名称'));
      planCol = row.findIndex(c => cleanName(c).includes('投档计划数'));
      
      const foundRank = row.findIndex(c => cleanName(c).includes('最低位次'));
      if (foundRank !== -1) {
        rankCol = foundRank;
        isScore = false;
      } else {
        const foundScore = row.findIndex(c => cleanName(c).includes('最低分') || cleanName(c).includes('综合分'));
        if (foundScore !== -1) {
          rankCol = foundScore;
          isScore = true;
        }
      }
      break;
    }
  }
  
  if (majorCol === -1 || instCol === -1 || planCol === -1 || rankCol === -1) {
    console.warn(`Could not resolve headers in ${filePath}. Columns: major=${majorCol}, inst=${instCol}, plan=${planCol}, rank=${rankCol}`);
    return { title, records: [] };
  }
  
  const records = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length <= Math.max(majorCol, instCol, planCol, rankCol)) continue;
    
    const majorRaw = cleanName(row[majorCol]);
    const instRaw = cleanName(row[instCol]);
    const planCount = Number(row[planCol]);
    const rawVal = Number(row[rankCol]);
    
    if (!majorRaw || !instRaw || isNaN(planCount) || isNaN(rawVal)) continue;
    
    // Parse institution code and name (e.g. "A001北京大学")
    const instMatch = instRaw.match(/^([A-Z0-9]{4})(.+)$/);
    if (!instMatch) {
      console.warn(`Failed to parse institution field: "${instRaw}" in row ${i}`);
      continue;
    }
    const instCode = instMatch[1];
    const instName = cleanName(instMatch[2]);
    
    // Parse major code and name (e.g. "17文科试验班类(不限...)")
    const majorMatch = majorRaw.match(/^([A-Z0-9]{2})(.+)$/);
    if (!majorMatch) {
      console.warn(`Failed to parse major field: "${majorRaw}" in row ${i}`);
      continue;
    }
    const majorCode = majorMatch[1];
    const majorNameRaw = cleanName(majorMatch[2]);
    
    // Extract subject requirement from trailing parentheses
    let subjectCombo = '不限';
    let majorName = majorNameRaw;
    
    const reqMatch = majorNameRaw.match(/（([^）]+)）$/);
    if (reqMatch) {
      subjectCombo = reqMatch[1].replace(/选考科目类专业|门科目考生均须选考方可报考/g, '').trim();
      majorName = cleanName(majorNameRaw.substring(0, reqMatch.index));
    }
    
    records.push({
      instCode,
      instName,
      majorCode,
      majorName,
      subjectCombo,
      plannedCount: planCount,
      val: Math.round(rawVal),
      isScore
    });
  }
  
  return { title, records };
}

async function ensureSourceId(pool, localPath, year, title) {
  const relPath = path.relative('/Users/wahaha/Documents/Me/Project/cursor/fde.fan', localPath);
  const existing = await pool.query(
    `select id from gaokao_source_documents where raw_data->>'local_path' = $1 limit 1`,
    [relPath]
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const result = await pool.query(
    `insert into gaokao_source_documents 
      (source_type, province, year, title, publisher, parse_status, raw_data)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb)
     returning id`,
    [
      'admission_record',
      '山东',
      year,
      title,
      '山东省教育招生考试院',
      'pending',
      JSON.stringify({ local_path: relPath })
    ]
  );
  return result.rows[0].id;
}

async function upsertInstitutions(pool, records, sourceId) {
  const unique = new Map();
  for (const record of records) {
    const key = `${record.instCode}:${record.instName}`;
    if (!unique.has(key)) unique.set(key, record);
  }

  const cache = new Map();
  const institutions = [...unique.values()];
  for (let offset = 0; offset < institutions.length; offset += 250) {
    const chunk = institutions.slice(offset, offset + 250);
    const values = [];
    const placeholders = chunk.map((inst, index) => {
      const base = index * 6;
      values.push(
        inst.instCode,
        inst.instName,
        '山东',
        null,
        sourceId,
        JSON.stringify({ parser: 'parse-shandong-admissions', code: inst.instCode, name: inst.instName })
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
       returning id, local_code, name`,
      values
    );
    for (const row of result.rows) {
      cache.set(`${row.local_code}:${row.name}`, row.id);
    }
  }

  return cache;
}

function parseSubjectRequirements(combo) {
  if (!combo || combo === '不限' || combo === '不限选考') return [];
  return combo.split(/[+；、|/&]/).map(item => item.trim()).filter(Boolean);
}

const fileArg = getArg('file');
const dryRun = hasFlag('dry-run');

const targetYears = ['2024', '2025'];
const files = [];

if (fileArg) {
  files.push({
    path: fileArg,
    year: Number(getArg('year') || '2025')
  });
} else {
  for (const yr of targetYears) {
    const dir = `/Users/wahaha/Documents/Me/Project/cursor/fde.fan/data/gaokao/raw/山东/${yr}`;
    if (!fs.existsSync(dir)) continue;
    fs.readdirSync(dir).forEach(f => {
      if (f.endsWith('.xls') || f.endsWith('.xlsx')) {
        files.push({
          path: path.join(dir, f),
          year: Number(yr)
        });
      }
    });
  }
}

console.log(`Discovered ${files.length} Shandong admissions spreadsheet(s).`);

for (const fInfo of files) {
  console.log(`\n----------------------------------------`);
  console.log(`Processing: ${fInfo.path} (Year: ${fInfo.year})`);
  const parsed = parseExcel(fInfo.path);
  console.log(`Excel Title: "${parsed.title}"`);
  console.log(`Parsed ${parsed.records.length} records.`);
  
  if (parsed.records.length === 0) {
    console.warn(`No valid rows parsed from ${fInfo.path}`);
    continue;
  }
  
  console.log("Sample records:");
  console.log(parsed.records.slice(0, 5).map(r => `  - ${r.instCode} ${r.instName} | ${r.majorCode} ${r.majorName} (${r.subjectCombo}) -> Plan: ${r.plannedCount}, Value: ${r.val} (isScore: ${r.isScore})`).join('\n'));
  
  if (dryRun) continue;
  
  await withDb(async (pool) => {
    const sourceId = await ensureSourceId(pool, fInfo.path, fInfo.year, parsed.title || `山东${fInfo.year}年普通类常规批投档情况`);
    
    // Resolve batch (e.g. "普通类常规批第1次志愿")
    let batch = '普通类常规批平行录取';
    if (parsed.title.includes('第2次')) batch = '普通类常规批第2次志愿';
    else if (parsed.title.includes('第3次')) batch = '普通类常规批第3次志愿';
    else if (parsed.title.includes('第1次')) batch = '普通类常规批第1次志愿';
    
    // Resolve institutions cache
    const instCache = await upsertInstitutions(pool, parsed.records, sourceId);
    
    // Clean old records for this source
    await pool.query(`delete from gaokao_admission_records where source_id = $1`, [sourceId]);
    
    // Insert in batches
    let inserted = 0;
    const chunkSize = 200;
    for (let offset = 0; offset < parsed.records.length; offset += chunkSize) {
      const chunk = parsed.records.slice(offset, offset + chunkSize);
      const values = [];
      const placeholders = chunk.map((rec, index) => {
        const base = index * 23;
        const instId = instCache.get(`${rec.instCode}:${rec.instName}`);
        values.push(
          '山东',
          fInfo.year,
          batch,
          '综合改革',
          rec.subjectCombo,
          instId,
          rec.instCode,
          null, // major_group_code
          null, // major_id
          rec.majorCode,
          rec.majorName,
          rec.isScore ? rec.val : null, // min_score
          rec.isScore ? null : rec.val, // min_rank
          null, // avg_score
          null, // avg_rank
          null, // max_score
          null, // max_rank
          rec.plannedCount,
          null, // admitted_count
          batch.includes('第2次') || batch.includes('第3次'), // collection_volunteer
          'major',
          sourceId,
          JSON.stringify({ parser: 'parse-shandong-admissions', subject_requirements: parseSubjectRequirements(rec.subjectCombo) })
        );
        return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13},$${base + 14},$${base + 15},$${base + 16},$${base + 17},$${base + 18},$${base + 19},$${base + 20},$${base + 21},$${base + 22},$${base + 23}::jsonb)`;
      }).join(',');
      
      await pool.query(
        `insert into gaokao_admission_records
          (province, year, batch, candidate_track, subject_combo, institution_id, institution_code,
           major_group_code, major_id, major_code, major_name, min_score, min_rank, avg_score,
           avg_rank, max_score, max_rank, planned_count, admitted_count, collection_volunteer, record_level, source_id, raw_data)
         values ${placeholders}`,
        values
      );
      inserted += chunk.length;
    }
    
    await pool.query(
      `update gaokao_source_documents set parse_status = 'parsed', updated_at = now() where id = $1`,
      [sourceId]
    );
    console.log(`Inserted ${inserted} records into gaokao_admission_records.`);
  });
}
