import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
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
const ODDS_MARKET_TITLES = {
  h2h: '胜平负',
  spreads: '让球',
  totals: '大小球',
  outrights: '冠军/晋级期货',
};

const DEFAULT_ODDS_BOOKMAKERS = [
  'pinnacle',
  'bet365',
  'williamhill',
  'unibet',
  'betfair',
  'matchbook',
  'draftkings',
  'fanduel',
  'betmgm',
  'caesars',
];

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

async function ensureEnrichmentTables(pool) {
  await pool.query(`
    create table if not exists worldcup_market_odds_snapshots (
      id text primary key,
      match_id text references worldcup_matches(id),
      provider_event_id text,
      bookmaker_key text,
      bookmaker_title text,
      market_key text not null,
      market_title text,
      home_odds double precision,
      draw_odds double precision,
      away_odds double precision,
      handicap_line double precision,
      total_line double precision,
      last_update timestamptz,
      snapshot_time timestamptz not null,
      source_id text references worldcup_sources(id),
      raw_data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create table if not exists worldcup_weather_snapshots (
      id text primary key,
      match_id text references worldcup_matches(id),
      venue_id text references worldcup_venues(id),
      forecast_time timestamptz,
      snapshot_time timestamptz not null,
      temperature_c double precision,
      apparent_temperature_c double precision,
      humidity_pct double precision,
      precipitation_probability_pct double precision,
      precipitation_mm double precision,
      wind_speed_kmh double precision,
      wind_gusts_kmh double precision,
      weather_code integer,
      source_id text references worldcup_sources(id),
      raw_data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
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

async function ensureNamedSource(pool, source) {
  return ensureSource(pool, {
    source_name: source.source_name,
    source_url: source.source_url,
    fetched_at: source.fetched_at || new Date().toISOString(),
  });
}

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function stableHash(value) {
  return crypto.createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 12);
}

function normalizeTeamName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/\b(united states|usa|u\.s\.a\.)\b/g, 'usa')
    .replace(/\bdr congo\b/g, 'congo dr')
    .replace(/\bcape verde\b/g, 'cabo verde')
    .replace(/\bczech republic\b/g, 'czechia')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTeamNameSet(teamId, nameEn) {
  const values = new Set([
    normalizeTeamName(teamId.replace(/-/g, ' ')),
    normalizeTeamName(nameEn),
  ]);
  const aliases = {
    usa: ['united states', 'usa'],
    'south-korea': ['south korea', 'korea republic'],
    'dr-congo': ['dr congo', 'congo dr', 'congo democratic republic'],
    'cape-verde': ['cape verde', 'cabo verde'],
    'czech-republic': ['czech republic', 'czechia'],
    'ivory-coast': ['ivory coast', "cote d'ivoire"],
    'cura-ao': ['curacao', 'curaçao'],
    turkey: ['turkey', 'turkiye'],
  };
  for (const alias of aliases[teamId] || []) values.add(normalizeTeamName(alias));
  return values;
}

function closestHourlyIndex(times, kickoffIso) {
  if (!times?.length || !kickoffIso) return -1;
  const target = new Date(kickoffIso).getTime();
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < times.length; index += 1) {
    const time = new Date(times[index]).getTime();
    const distance = Math.abs(time - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

async function fetchJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    const cause = error.cause ? ` cause=${error.cause.code || error.cause.message || String(error.cause)}` : '';
    throw new Error(`Fetch failed for ${url}: ${error.message || String(error)}${cause}`);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

function serializeError(error) {
  return {
    message: error.message || String(error),
    cause: error.cause ? (error.cause.code || error.cause.message || String(error.cause)) : null,
  };
}

async function fetchWeatherSnapshots(pool) {
  const sourceId = await ensureNamedSource(pool, {
    source_name: 'open-meteo',
    source_url: 'https://open-meteo.com/',
  });
  const matches = await pool.query(`
    select
      m.id,
      m.kickoff_utc,
      m.venue_id,
      v.latitude,
      v.longitude,
      v.timezone
    from worldcup_matches m
    join worldcup_venues v on v.id = m.venue_id
    where m.status in ('scheduled', 'active')
      and m.kickoff_utc is not null
      and v.latitude is not null
      and v.longitude is not null
      and m.kickoff_utc between now() - interval '2 hours' and now() + interval '16 days'
  `);

  let inserted = 0;
  let updated = 0;
  const snapshotTime = new Date().toISOString();

  for (const match of matches.rows) {
    const params = new URLSearchParams({
      latitude: String(match.latitude),
      longitude: String(match.longitude),
      hourly: [
        'temperature_2m',
        'apparent_temperature',
        'relative_humidity_2m',
        'precipitation_probability',
        'precipitation',
        'wind_speed_10m',
        'wind_gusts_10m',
        'weather_code',
      ].join(','),
      timezone: 'UTC',
      forecast_days: '16',
    });
    const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    const index = closestHourlyIndex(data.hourly?.time, match.kickoff_utc);
    if (index < 0) continue;

    const row = {
      id: `weather-${match.id}-${slug(snapshotTime.slice(0, 13))}`,
      match_id: match.id,
      venue_id: match.venue_id,
      forecast_time: data.hourly.time[index],
      snapshot_time: snapshotTime,
      temperature_c: data.hourly.temperature_2m?.[index] ?? null,
      apparent_temperature_c: data.hourly.apparent_temperature?.[index] ?? null,
      humidity_pct: data.hourly.relative_humidity_2m?.[index] ?? null,
      precipitation_probability_pct: data.hourly.precipitation_probability?.[index] ?? null,
      precipitation_mm: data.hourly.precipitation?.[index] ?? null,
      wind_speed_kmh: data.hourly.wind_speed_10m?.[index] ?? null,
      wind_gusts_kmh: data.hourly.wind_gusts_10m?.[index] ?? null,
      weather_code: data.hourly.weather_code?.[index] ?? null,
      source_id: sourceId,
      raw_data: JSON.stringify({ match, units: data.hourly_units, selected_index: index }),
    };

    const result = await pool.query(
      `insert into worldcup_weather_snapshots (
        id, match_id, venue_id, forecast_time, snapshot_time,
        temperature_c, apparent_temperature_c, humidity_pct,
        precipitation_probability_pct, precipitation_mm, wind_speed_kmh,
        wind_gusts_kmh, weather_code, source_id, raw_data
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
      on conflict (id) do update set
        forecast_time = excluded.forecast_time,
        snapshot_time = excluded.snapshot_time,
        temperature_c = excluded.temperature_c,
        apparent_temperature_c = excluded.apparent_temperature_c,
        humidity_pct = excluded.humidity_pct,
        precipitation_probability_pct = excluded.precipitation_probability_pct,
        precipitation_mm = excluded.precipitation_mm,
        wind_speed_kmh = excluded.wind_speed_kmh,
        wind_gusts_kmh = excluded.wind_gusts_kmh,
        weather_code = excluded.weather_code,
        raw_data = excluded.raw_data
      returning (xmax = 0) as inserted`,
      Object.values(row),
    );
    if (result.rows[0]?.inserted) inserted += 1;
    else updated += 1;
  }

  return { fetched: matches.rows.length, inserted, updated };
}

function extractH2hOdds(event, bookmaker, match) {
  const market = bookmaker.markets?.find((item) => item.key === 'h2h');
  if (!market) return null;
  let homeOdds = null;
  let drawOdds = null;
  let awayOdds = null;
  const homeNames = buildTeamNameSet(match.home_team_id, match.home_name_en);
  const awayNames = buildTeamNameSet(match.away_team_id, match.away_name_en);

  for (const outcome of market.outcomes || []) {
    const name = normalizeTeamName(outcome.name);
    if (name === 'draw') drawOdds = outcome.price;
    else if (homeNames.has(name)) homeOdds = outcome.price;
    else if (awayNames.has(name)) awayOdds = outcome.price;
  }

  if (!homeOdds && !drawOdds && !awayOdds) return null;
  return {
    market,
    homeOdds,
    drawOdds,
    awayOdds,
  };
}

async function fetchOddsSnapshots(pool) {
  const apiKey = process.env.ODDS_API || process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.log('[odds] ODDS_API is not configured; skipping odds sync');
    return { fetched: 0, inserted: 0, updated: 0, skipped: true };
  }

  const sourceId = await ensureNamedSource(pool, {
    source_name: 'the-odds-api',
    source_url: 'https://the-odds-api.com/',
  });
  const sportKeys = (process.env.THE_ODDS_SPORT_KEYS || 'soccer_fifa_world_cup')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const bookmakers = (process.env.THE_ODDS_BOOKMAKERS || DEFAULT_ODDS_BOOKMAKERS.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(',');
  const markets = (process.env.THE_ODDS_MARKETS || 'h2h')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(',');

  const matches = await pool.query(`
    select
      m.id,
      m.kickoff_utc,
      m.home_team_id,
      m.away_team_id,
      ht.name_en as home_name_en,
      at.name_en as away_name_en
    from worldcup_matches m
    join worldcup_teams ht on ht.id = m.home_team_id
    join worldcup_teams at on at.id = m.away_team_id
    where m.status in ('scheduled', 'active')
      and m.kickoff_utc is not null
      and m.kickoff_utc >= now() - interval '4 hours'
  `);
  const matchIndex = new Map();
  for (const match of matches.rows) {
    const homeNames = buildTeamNameSet(match.home_team_id, match.home_name_en);
    const awayNames = buildTeamNameSet(match.away_team_id, match.away_name_en);
    for (const home of homeNames) {
      for (const away of awayNames) {
        matchIndex.set(`${home}|${away}`, match);
        matchIndex.set(`${away}|${home}`, match);
      }
    }
  }

  let fetched = 0;
  let inserted = 0;
  let updated = 0;
  const snapshotTime = new Date().toISOString();

  for (const sportKey of sportKeys) {
    const params = new URLSearchParams({
      apiKey,
      regions: process.env.THE_ODDS_REGIONS || 'us,uk,eu',
      markets,
      oddsFormat: 'decimal',
      dateFormat: 'iso',
      bookmakers,
    });
    const events = await fetchJson(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?${params.toString()}`);
    fetched += events.length;

    for (const event of events) {
      const key = `${normalizeTeamName(event.home_team)}|${normalizeTeamName(event.away_team)}`;
      const match = matchIndex.get(key);
      if (!match) continue;

      for (const bookmaker of event.bookmakers || []) {
        const h2h = extractH2hOdds(event, bookmaker, match);
        if (!h2h) continue;
        const row = {
          id: `odds-${match.id}-${slug(bookmaker.key)}-h2h-${stableHash([bookmaker.last_update, h2h.homeOdds, h2h.drawOdds, h2h.awayOdds])}`,
          match_id: match.id,
          provider_event_id: event.id,
          bookmaker_key: bookmaker.key,
          bookmaker_title: bookmaker.title,
          market_key: 'h2h',
          market_title: ODDS_MARKET_TITLES.h2h,
          home_odds: h2h.homeOdds,
          draw_odds: h2h.drawOdds,
          away_odds: h2h.awayOdds,
          handicap_line: null,
          total_line: null,
          last_update: bookmaker.last_update || event.commence_time || null,
          snapshot_time: snapshotTime,
          source_id: sourceId,
          raw_data: JSON.stringify({ sportKey, event, bookmaker }),
        };
        const result = await pool.query(
          `insert into worldcup_market_odds_snapshots (
            id, match_id, provider_event_id, bookmaker_key, bookmaker_title,
            market_key, market_title, home_odds, draw_odds, away_odds,
            handicap_line, total_line, last_update, snapshot_time, source_id, raw_data
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)
          on conflict (id) do update set
            provider_event_id = excluded.provider_event_id,
            bookmaker_title = excluded.bookmaker_title,
            home_odds = excluded.home_odds,
            draw_odds = excluded.draw_odds,
            away_odds = excluded.away_odds,
            last_update = excluded.last_update,
            snapshot_time = excluded.snapshot_time,
            raw_data = excluded.raw_data
          returning (xmax = 0) as inserted`,
          Object.values(row),
        );
        if (result.rows[0]?.inserted) inserted += 1;
        else updated += 1;
      }
    }
  }

  return { fetched, inserted, updated };
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
      weather: 'https://open-meteo.com/',
      odds: 'https://the-odds-api.com/',
    },
    recordsFetched: {},
    recordsUpserted: {},
    logText: '',
  };

  await withDb(async (pool) => {
    await ensureRunTable(pool);
    await ensureEnrichmentTables(pool);
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

      try {
        const weatherResult = await fetchWeatherSnapshots(pool);
        payload.recordsFetched.weather = weatherResult.fetched;
        payload.recordsUpserted.weather = {
          inserted: weatherResult.inserted,
          updated: weatherResult.updated,
        };
        console.log(`[weather] fetched=${weatherResult.fetched} inserted=${weatherResult.inserted} updated=${weatherResult.updated}`);
      } catch (error) {
        const serialized = serializeError(error);
        payload.recordsFetched.weather = 0;
        payload.recordsUpserted.weather = { inserted: 0, updated: 0, error: serialized.message, cause: serialized.cause };
        payload.logText += `\n[weather warning]\n${error.stack || serialized.message}`;
        console.warn(`[weather] skipped error=${serialized.message}`);
      }

      try {
        const oddsResult = await fetchOddsSnapshots(pool);
        payload.recordsFetched.odds = oddsResult.fetched;
        payload.recordsUpserted.odds = {
          inserted: oddsResult.inserted,
          updated: oddsResult.updated,
          skipped: oddsResult.skipped || false,
        };
        console.log(`[odds] fetched=${oddsResult.fetched} inserted=${oddsResult.inserted} updated=${oddsResult.updated}${oddsResult.skipped ? ' skipped=true' : ''}`);
      } catch (error) {
        const serialized = serializeError(error);
        payload.recordsFetched.odds = 0;
        payload.recordsUpserted.odds = { inserted: 0, updated: 0, error: serialized.message, cause: serialized.cause };
        payload.logText += `\n[odds warning]\n${error.stack || serialized.message}`;
        console.warn(`[odds] skipped error=${serialized.message}`);
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
