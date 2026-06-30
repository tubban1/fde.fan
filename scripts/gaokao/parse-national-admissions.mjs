import { loadLocalEnv } from './lib/env.mjs';
import { withDb } from './lib/db.mjs';
import { generateText } from '../../src/server/diagnosis/text_model_provider.js';

loadLocalEnv();

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const province = getArg('province');
const year = Number(getArg('year', '2026'));
const type = getArg('type'); // 'score_rank' or 'admission_record'
const limitChunks = Number(getArg('limit-chunks', '5'));

if (!province || !type) {
  console.error('Usage: node scripts/gaokao/parse-national-admissions.mjs --province=北京|上海|广东 --year=2026 --type=score_rank|admission_record [--limit-chunks=5]');
  process.exit(1);
}

// Helper: Query matching institution in db
async function findInstitutionId(pool, code, name) {
  if (code) {
    const res = await pool.query('select id from gaokao_institutions where ministry_code = $1 or local_code = $2 limit 1', [code, code]);
    if (res.rows[0]?.id) return res.rows[0].id;
  }
  if (name) {
    const res = await pool.query('select id from gaokao_institutions where name = $1 limit 1', [name]);
    if (res.rows[0]?.id) return res.rows[0].id;
    // Fuzzy matching
    const fuzzyRes = await pool.query('select id from gaokao_institutions where name like $1 limit 1', [`%${name}%`]);
    if (fuzzyRes.rows[0]?.id) return fuzzyRes.rows[0].id;
  }
  return null;
}

async function ensureInstitution(pool, code, name, prov) {
  const existingId = await findInstitutionId(pool, code, name);
  if (existingId) return existingId;

  if (!name) return null;

  try {
    const res = await pool.query(
      `insert into gaokao_institutions (name, province, ministry_code, local_code)
       values ($1, $2, $3, $4)
       on conflict do nothing
       returning id`,
      [name, prov || null, code || null, code || null]
    );
    if (res.rows[0]?.id) return res.rows[0].id;
  } catch (err) {
    console.warn(`Failed to create institution placeholder for ${name}: ${err.message}`);
  }

  // Fallback query
  const fallback = await pool.query('select id from gaokao_institutions where name = $1 limit 1', [name]);
  return fallback.rows[0]?.id || null;
}

// LLM Parsing for score segments (一分一段)
async function extractScoreRankChunks(chunks) {
  const systemPrompt = `You are a professional Gaokao data extraction assistant. 
Your task is to extract score-rank segment table data (一分一段表) from raw text.
Convert the data into a JSON array of objects. Each object MUST strictly have these properties:
- score (number, 100-750)
- same_score_count (number, count of candidates at this score)
- cumulative_count (number, cumulative candidates at or above this score)

Respond ONLY with a valid JSON array. No code block wrappers, no formatting markers, no conversational words.`;

  const userPrompt = `Extract score-rank segments from the following text chunk:\n\n${chunks}\n\nJSON Output:`;
  const responseText = await generateText({
    systemPrompt,
    userPrompt,
    task: 'EXTRACTION'
  });
  
  try {
    const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse LLM JSON for score-rank:', err.message, '\nRaw response:', responseText);
    return [];
  }
}

// LLM Parsing for admission records (录取记录)
async function extractAdmissionRecordsChunks(chunks) {
  const systemPrompt = `You are a professional Gaokao data extraction assistant.
Your task is to extract admission records (录取分数和位次情况) from raw text.
Convert the data into a JSON array of objects. Each object MUST strictly have these properties:
- institution_code (string or null, 4-digit code)
- institution_name (string, e.g. "北京大学")
- major_code (string or null)
- major_name (string)
- subject_combo (string, default "不限", or "物理", "化学" etc.)
- min_score (number, minimum score)
- min_rank (number or null, minimum rank)
- planned_count (number or null, planned intake count)
- admitted_count (number or null, admitted count)

Respond ONLY with a valid JSON array. No code block wrappers, no formatting markers, no conversational words.`;

  const userPrompt = `Extract admission records from the following text chunk:\n\n${chunks}\n\nJSON Output:`;
  const responseText = await generateText({
    systemPrompt,
    userPrompt,
    task: 'EXTRACTION'
  });

  try {
    const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse LLM JSON for admission records:', err.message, '\nRaw response:', responseText);
    return [];
  }
}

await withDb(async (pool) => {
  // 1. Fetch RAG chunks for targeted province and year
  console.log(`Gathering chunks for ${province} ${year} (${type})...`);
  const docKeyword = type === 'score_rank' ? '%分数段%' : '%控制线%录取%';
  const chunkRows = await pool.query(
    `select c.id, c.content, c.source_id, s.title
       from gaokao_document_chunks c
       join gaokao_source_documents s on c.source_id = s.id
      where s.province = $1 and s.year = $2
      order by s.fetched_at desc, c.chunk_index asc
      limit $3`,
    [province, year, limitChunks]
  );

  if (!chunkRows.rows.length) {
    console.warn(`No active document chunks found in database for ${province} ${year} (${type}).`);
    console.log('Skipping extraction. Please run crawl-official-sources.mjs with --write-db first.');
    return;
  }

  console.log(`Retrieved ${chunkRows.rows.length} chunk(s) from document: "${chunkRows.rows[0].title}"`);
  
  // Combine contents for LLM
  const combinedText = chunkRows.rows.map(r => r.content).join('\n\n');
  const sourceId = chunkRows.rows[0].source_id;

  if (type === 'score_rank') {
    const parsedSegments = await extractScoreRankChunks(combinedText);
    console.log(`LLM extracted ${parsedSegments.length} score segments.`);
    
    let successCount = 0;
    for (const seg of parsedSegments) {
      const candidateTrack = '综合改革';
      const subjectCombo = '不限';
      const minRank = seg.cumulative_count - seg.same_score_count + 1;
      const maxRank = seg.cumulative_count;
      
      try {
        await pool.query(
          `insert into gaokao_score_rank_segments
            (province, year, candidate_track, subject_combo, score, same_score_count, cumulative_count, min_rank, max_rank, source_id, raw_data)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
           on conflict (province, year, candidate_track, subject_combo, score) do update
             set same_score_count = excluded.same_score_count,
                 cumulative_count = excluded.cumulative_count,
                 min_rank = excluded.min_rank,
                 max_rank = excluded.max_rank,
                 source_id = excluded.source_id,
                 raw_data = excluded.raw_data`,
          [
            province,
            year,
            candidateTrack,
            subjectCombo,
            seg.score,
            seg.same_score_count,
            seg.cumulative_count,
            minRank,
            maxRank,
            sourceId,
            JSON.stringify(seg)
          ]
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to insert score segment ${seg.score}:`, err.message);
      }
    }
    console.log(`Successfully imported ${successCount} score segment records for ${province} ${year}.`);

  } else if (type === 'admission_record') {
    const parsedRecords = await extractAdmissionRecordsChunks(combinedText);
    console.log(`LLM extracted ${parsedRecords.length} admission records.`);

    let successCount = 0;
    for (const rec of parsedRecords) {
      const candidateTrack = '综合改革';
      const batch = '普通类平行录取';
      const resolvedInstId = await ensureInstitution(pool, rec.institution_code, rec.institution_name, province);
      
      if (!resolvedInstId) {
        console.warn(`Skipping record for ${rec.institution_name} - ${rec.major_name} (Unable to resolve/create institution_id)`);
        continue;
      }
      
      try {
        await pool.query(
          `insert into gaokao_admission_records
            (province, year, batch, candidate_track, subject_combo, institution_id, institution_code,
             major_group_code, major_id, major_code, major_name, min_score, min_rank, avg_score,
             avg_rank, max_score, max_rank, planned_count, admitted_count, record_level, source_id, raw_data)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22::jsonb)`,
          [
            province,
            year,
            batch,
            candidateTrack,
            rec.subject_combo || '不限',
            resolvedInstId,
            rec.institution_code || '',
            null,
            null,
            rec.major_code || '',
            rec.major_name,
            rec.min_score,
            rec.min_rank || null,
            null,
            null,
            null,
            null,
            rec.planned_count || null,
            rec.admitted_count || null,
            'major',
            sourceId,
            JSON.stringify(rec)
          ]
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to insert admission record for ${rec.institution_name} - ${rec.major_name}:`, err.message);
      }
    }
    console.log(`Successfully imported ${successCount} admission records for ${province} ${year}.`);
  }
});
