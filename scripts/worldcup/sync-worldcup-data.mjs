import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';
import { loadLocalEnv } from '../gaokao/lib/env.mjs';
import { withDb } from '../gaokao/lib/db.mjs';

loadLocalEnv();

const execFileAsync = promisify(execFile);

const IMPORT_FILES = [
  { key: 'sources', table: 'worldcup_sources', file: 'data/worldcup/import/001_sources.csv' },
  { key: 'teams', table: 'worldcup_teams', file: 'data/worldcup/import/002_teams.csv' },
  { key: 'venues', table: 'worldcup_venues', file: 'data/worldcup/import/003_venues.csv' },
  { key: 'matches', table: 'worldcup_matches', file: 'data/worldcup/import/004_matches.csv' },
  { key: 'rankings', table: 'worldcup_team_rankings', file: 'data/worldcup/import/005_team_rankings.csv' },
  { key: 'recent_form', table: 'worldcup_team_form', file: 'data/worldcup/import/006_team_form.csv' },
  { key: 'data_gaps', table: 'worldcup_data_gaps', file: 'data/worldcup/import/008_data_gaps.csv' },
];

const TABLE_ID_RENAMES = {
  teams: ['team_id'],
  venues: ['venue_id'],
  matches: ['match_id'],
  rankings: ['ranking_id'],
  recent_form: ['form_match_id'],
  data_gaps: ['gap_id'],
};

const INT_FIELDS = new Set([
  'season',
  'capacity',
  'home_score_90',
  'away_score_90',
  'home_score_extra',
  'away_score_extra',
  'home_penalties',
  'away_penalties',
  'rank',
  'previous_rank',
  'goals_for',
  'goals_against',
]);

const FLOAT_FIELDS = new Set(['latitude', 'longitude', 'rating', 'opponent_elo']);
const BOOLEAN_FIELDS = new Set(['is_host', 'is_neutral', 'is_home']);
const JSON_FIELDS = new Set(['raw_data']);

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
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeKey(key) {
  return String(key || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function rowsFromCsv(filePath) {
  const parsed = parseCsv(fs.readFileSync(filePath, 'utf8'));
  const headers = parsed.shift().map(normalizeKey);
  return parsed.map((row) => Object.fromEntries(headers.map((key, index) => [key, row[index]?.trim() || null])));
}

function normalizeValue(key, value) {
  if (value === '' || value === undefined) return null;
  if (BOOLEAN_FIELDS.has(key)) {
    const text = String(value || '').toLowerCase().replace(/"/g, '');
    return text === 'true' || text === '1';
  }
  if (INT_FIELDS.has(key)) return value == null ? null : Number.parseInt(String(value), 10);
  if (FLOAT_FIELDS.has(key)) return value == null ? null : Number.parseFloat(String(value));
  if (JSON_FIELDS.has(key)) return value || '{}';
  return value;
}

async function ensureRunTable(pool) {
  await pool.query(`
    create table if not exists worldcup_ingestion_runs (
      id text primary key,
      job_name text not null,
      status text not null,
      started_at timestamptz not null default now(),
      finished_at timestamptz,
      source_summary jsonb not null default '{}'::jsonb,
      records_fetched jsonb not null default '{}'::jsonb,
      records_upserted jsonb not null default '{}'::jsonb,
      error_message text,
      log_text text,
      created_at timestamptz not null default now()
    )
  `);
}

async function startRun(pool) {
  const id = `worldcup-sync-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
  await pool.query(
    `insert into worldcup_ingestion_runs (id, job_name, status) values ($1, $2, $3)`,
    [id, 'worldcup-data-sync', 'running'],
  );
  return id;
}

async function finishRun(pool, runId, status, payload) {
  await pool.query(
    `update worldcup_ingestion_runs
      set status = $2,
          finished_at = now(),
          source_summary = $3::jsonb,
          records_fetched = $4::jsonb,
          records_upserted = $5::jsonb,
          error_message = $6,
          log_text = $7
      where id = $1`,
    [
      runId,
      status,
      JSON.stringify(payload.sourceSummary || {}),
      JSON.stringify(payload.recordsFetched || {}),
      JSON.stringify(payload.recordsUpserted || {}),
      payload.errorMessage || null,
      payload.logText || '',
    ],
  );
}

async function ensureSource(pool, rowObj) {
  const sourceName = rowObj.source_name;
  if (!sourceName) return null;
  const sourceUrl = rowObj.source_url || null;
  const fetchedAt = rowObj.fetched_at || null;
  const existing = await pool.query(
    `select id from worldcup_sources where source_name = $1 and coalesce(source_url, '') = coalesce($2, '') limit 1`,
    [sourceName, sourceUrl],
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const sourceId = `auto-${sourceName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const result = await pool.query(
    `insert into worldcup_sources (id, source_type, source_name, source_url, fetched_at, raw_data)
     values ($1, 'auto', $2, $3, $4, '{}'::jsonb)
     on conflict (id) do update set
       source_name = excluded.source_name,
       source_url = excluded.source_url,
       fetched_at = excluded.fetched_at
     returning id`,
    [sourceId, sourceName, sourceUrl, fetchedAt],
  );
  return result.rows[0].id;
}

function normalizeRow(key, row) {
  const rowObj = { ...row };
  for (const candidate of TABLE_ID_RENAMES[key] || []) {
    if (candidate in rowObj) {
      rowObj.id = rowObj[candidate];
      delete rowObj[candidate];
      break;
    }
  }

  for (const [field, value] of Object.entries(rowObj)) {
    rowObj[field] = normalizeValue(field, value);
  }

  return rowObj;
}

function buildUpsertQuery(tableKey, tableName, columns) {
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

  if (tableKey === 'data_gaps') {
    const updates = columns
      .filter((column) => !['id', 'created_at'].includes(column))
      .map((column) => {
        if (column === 'status') {
          return `${column} = case when ${tableName}.status = 'resolved' then ${tableName}.status else excluded.${column} end`;
        }
        if (column === 'resolved_at' || column === 'resolved_by') {
          return `${column} = coalesce(${tableName}.${column}, excluded.${column})`;
        }
        return `${column} = excluded.${column}`;
      });
    return `insert into ${tableName} (${columns.join(', ')}) values (${placeholders})
      on conflict (id) do update set ${updates.join(', ')}
      returning (xmax = 0) as inserted`;
  }

  const updates = columns
    .filter((column) => !['id', 'created_at'].includes(column))
    .map((column) => `${column} = excluded.${column}`);
  if (columns.includes('updated_at')) {
    updates.push('updated_at = now()');
  }

  return `insert into ${tableName} (${columns.join(', ')}) values (${placeholders})
    on conflict (id) do update set ${updates.join(', ')}
    returning (xmax = 0) as inserted`;
}

async function upsertRows(pool, item) {
  const rows = rowsFromCsv(item.file);
  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    const rowObj = normalizeRow(item.key, row);
    let finalRow = { ...rowObj };

    if (item.key !== 'sources') {
      const sourceId = await ensureSource(pool, rowObj);
      finalRow = Object.fromEntries(
        Object.entries(finalRow).filter(([key]) => !['source_name', 'source_url', 'fetched_at'].includes(key)),
      );
      if (sourceId) finalRow.source_id = sourceId;
    }

    if (item.key === 'sources') {
      finalRow = {
        id: finalRow.id,
        source_type: finalRow.source_type || 'auto',
        source_name: finalRow.source_name,
        source_url: finalRow.source_url,
        publisher: finalRow.publisher,
        fetched_at: finalRow.fetched_at,
        raw_data: finalRow.raw_data || '{}',
      };
    }

    const columns = Object.keys(finalRow);
    if (!finalRow.id) {
      throw new Error(`Missing id for ${item.key}: ${JSON.stringify(rowObj)}`);
    }

    const result = await pool.query(buildUpsertQuery(item.key, item.table, columns), Object.values(finalRow));
    if (result.rows[0]?.inserted) inserted += 1;
    else updated += 1;
  }

  return { fetched: rows.length, inserted, updated };
}

async function main() {
  let runId = '';
  const payload = {
    sourceSummary: {
      openfootball: 'https://github.com/openfootball/worldcup.json',
      fifaRankings: 'https://inside.fifa.com/fifa-world-ranking/men',
      internationalResults: 'https://github.com/martj42/international_results',
    },
    recordsFetched: {},
    recordsUpserted: {},
    logText: '',
  };

  await withDb(async (pool) => {
    await ensureRunTable(pool);
    runId = await startRun(pool);
  });

  try {
    const fetchResult = await execFileAsync(process.execPath, ['scripts/worldcup/fetch_real_worldcup_data.mjs'], {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 20,
    });
    payload.logText += fetchResult.stdout || '';
    if (fetchResult.stderr) payload.logText += `\n[stderr]\n${fetchResult.stderr}`;

    await withDb(async (pool) => {
      for (const item of IMPORT_FILES) {
        if (!fs.existsSync(item.file)) {
          throw new Error(`Missing import file: ${item.file}`);
        }
        const result = await upsertRows(pool, item);
        payload.recordsFetched[item.key] = result.fetched;
        payload.recordsUpserted[item.key] = {
          inserted: result.inserted,
          updated: result.updated,
        };
        console.log(`[${item.key}] fetched=${result.fetched} inserted=${result.inserted} updated=${result.updated}`);
      }

      await finishRun(pool, runId, 'success', payload);
    });

    console.log(`World Cup sync complete. run_id=${runId}`);
  } catch (error) {
    payload.errorMessage = error.message || String(error);
    payload.logText += `\n[error]\n${error.stack || error.message || String(error)}`;
    await withDb(async (pool) => {
      await finishRun(pool, runId, 'failed', payload);
    });
    console.error(`World Cup sync failed. run_id=${runId}`);
    console.error(error);
    process.exit(1);
  }
}

await main();
