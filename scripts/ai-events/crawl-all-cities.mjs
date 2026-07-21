import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLocalEnv, withDb } from './lib/db.mjs';

loadLocalEnv();

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const limitPerSource = arg('limit-per-source', process.env.AI_EVENTS_LIMIT_PER_SOURCE || 12);
const normalizeLimit = arg('normalize-limit', process.env.AI_EVENTS_NORMALIZE_LIMIT || '');
const maxCities = Number(arg('max-cities', process.env.AI_EVENTS_MAX_CITIES || 0));
const mode = arg('mode', process.env.AI_EVENTS_RUN_MODE || (process.env.AI_EVENTS_RAW_ONLY === '1' ? 'raw' : 'full'));
const rawOnly = process.argv.includes('--raw-only') || process.env.AI_EVENTS_RAW_ONLY === '1';
const forceRun = process.argv.includes('--force') || process.env.AI_EVENTS_FORCE_RUN === '1';
const minIntervalMinutes = Number(arg('min-interval-minutes', process.env.AI_EVENTS_MIN_INTERVAL_MINUTES || 0));
const currentFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(currentFile);
const crawlCityScript = path.join(scriptDir, 'crawl-city.mjs');

async function configuredCities(pool) {
  const { rows } = await pool.query(
    `select c.city_key,
            c.display_name,
            count(s.id)::integer as active_sources,
            latest.finished_at as last_success_at
     from "aiEvents_cities" c
     join "aiEvents_sources" s
       on s.city_key = c.city_key
      and s.status = 'active'
     left join lateral (
       select r.finished_at
       from "aiEvents_crawl_runs" r
       where r.city_key = c.city_key
         and r.status = 'succeeded'
       order by r.finished_at desc nulls last
       limit 1
     ) latest on true
     where c.is_active = true
     group by c.city_key, c.display_name, latest.finished_at
     order by c.city_key`,
  );
  return maxCities > 0 ? rows.slice(0, maxCities) : rows;
}

function isDue(city) {
  if (forceRun || minIntervalMinutes <= 0 || !city.last_success_at) return true;
  const lastSuccess = new Date(city.last_success_at).getTime();
  if (!Number.isFinite(lastSuccess)) return true;
  return Date.now() - lastSuccess >= minIntervalMinutes * 60 * 1000;
}

function runCity(city) {
  const args = [
    crawlCityScript,
    `--city-key=${city.city_key}`,
    `--limit-per-source=${limitPerSource}`,
  ];
  if (mode === 'normalize') {
    args.push('--normalize-only');
    if (normalizeLimit) args.push(`--limit=${normalizeLimit}`);
  } else if (rawOnly || mode === 'raw') {
    args.push('--raw-only');
  }

  return new Promise(resolve => {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.on('close', code => resolve({ city, code }));
    child.on('error', error => resolve({ city, code: 1, error }));
  });
}

await withDb(async pool => {
  const allCities = await configuredCities(pool);
  if (allCities.length === 0) {
    throw new Error('No active cities with active sources. Insert rows into aiEvents_cities and aiEvents_sources first.');
  }
  const cities = allCities.filter(isDue);
  if (cities.length === 0) {
    console.log(JSON.stringify({
      ok: true,
      skipped: true,
      reason: 'No city is due for crawling.',
      configured_cities: allCities.length,
      min_interval_minutes: minIntervalMinutes,
    }, null, 2));
    return;
  }

  const results = [];
  for (const city of cities) {
    console.log(JSON.stringify({
      step: 'crawl_city_start',
      city_key: city.city_key,
      active_sources: city.active_sources,
      mode,
    }));
    const result = await runCity(city);
    results.push(result);
    console.log(JSON.stringify({
      step: 'crawl_city_done',
      city_key: city.city_key,
      code: result.code,
      error: result.error?.message || null,
    }));
  }

  const failed = results.filter(result => result.code !== 0);
  console.log(JSON.stringify({
    ok: failed.length === 0,
    mode,
    cities_checked: results.length,
    cities_failed: failed.length,
    failed_city_keys: failed.map(result => result.city.city_key),
  }, null, 2));

  if (failed.length > 0) process.exitCode = 1;
});
