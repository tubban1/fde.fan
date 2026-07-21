import { loadLocalEnv, withDb } from './lib/db.mjs';

loadLocalEnv();

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const dryRun = process.argv.includes('--dry-run') || process.env.AI_EVENTS_PRUNE_DRY_RUN === '1';
const mode = arg('mode', process.env.AI_EVENTS_PRUNE_MODE || 'delete');

if (!['delete', 'archive'].includes(mode)) {
  throw new Error('Invalid prune mode. Use --mode=delete or --mode=archive.');
}

const singleEventWhere = `
  source_kind = 'single_event'
  or source_scope = 'single_event'
  or lower(url_normalized) ~ 'huodongxing\\.com/event/[0-9]+'
  or lower(url_normalized) ~ 'eventbrite\\.[^/]+/e/'
  or lower(url_normalized) ~ 'meetup\\.com/[^/]+/events/[0-9]+'
  or lower(url_normalized) ~ 'segmentfault\\.com/e/[0-9]+'
`;

await withDb(async pool => {
  const preview = await pool.query(
    `select id, city_key, source_type, url, source_kind, source_scope, status
     from "aiEvents_sources"
     where ${singleEventWhere}
     order by city_key, source_type, url
     limit 20`,
  );

  const countResult = await pool.query(
    `select count(*)::integer as count
     from "aiEvents_sources"
     where ${singleEventWhere}`,
  );
  const matched = countResult.rows[0]?.count || 0;

  let changed = 0;
  if (!dryRun && matched > 0) {
    if (mode === 'archive') {
      const result = await pool.query(
        `update "aiEvents_sources"
         set status = 'archived',
             source_kind = 'single_event',
             source_scope = 'single_event',
             relevance_level = 'event',
             updated_at = now()
         where ${singleEventWhere}`,
      );
      changed = result.rowCount || 0;
    } else {
      const result = await pool.query(
        `delete from "aiEvents_sources"
         where ${singleEventWhere}`,
      );
      changed = result.rowCount || 0;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    dry_run: dryRun,
    mode,
    matched_single_event_sources: matched,
    changed_sources: changed,
    preview: preview.rows.map(row => ({
      city_key: row.city_key,
      source_type: row.source_type,
      source_kind: row.source_kind,
      source_scope: row.source_scope,
      status: row.status,
      url: row.url,
    })),
  }, null, 2));
});
