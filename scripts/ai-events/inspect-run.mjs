import { loadLocalEnv, withDb } from './lib/db.mjs';

loadLocalEnv();

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

function safeSummary(message) {
  const text = String(message || '');
  const status = text.match(/Provider request failed\s+(\d+)/)?.[1] || '';
  const jsonText = text.match(/\{[\s\S]*\}$/)?.[0] || '';
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      return {
        status: status || null,
        code: parsed.error?.code || null,
        type: parsed.error?.type || null,
        message: String(parsed.error?.message || '').slice(0, 240) || text.slice(0, 240),
      };
    } catch {
      // Fall through.
    }
  }
  return { status: status || null, code: null, type: null, message: text.slice(0, 240) };
}

const runId = arg('run-id');
const limit = Math.min(Math.max(Number(arg('limit', '20')), 1), 100);

if (!runId) {
  throw new Error('Missing --run-id.');
}

await withDb(async pool => {
  const runResult = await pool.query(
    `select id, city_key, city, status, started_at, finished_at, sources_checked,
            raw_items_found, events_normalized, error_message, raw_summary
     from "aiEvents_crawl_runs"
     where id = $1`,
    [runId],
  );
  const run = runResult.rows[0];
  if (!run) throw new Error(`Run not found: ${runId}`);

  const rawResult = await pool.query(
    `select processing_status, processing_error, count(*)::integer as count
     from "aiEvents_raw"
     where crawl_run_id = $1
     group by processing_status, processing_error
     order by count desc
     limit $2`,
    [runId, limit],
  );

  console.log(JSON.stringify({
    run,
    raw_error_groups: rawResult.rows.map(row => ({
      processing_status: row.processing_status,
      count: row.count,
      error: safeSummary(row.processing_error),
    })),
  }, null, 2));
});
