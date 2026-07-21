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

const singleEventUrlWhere = `
  lower(source_url_normalized) ~ 'huodongxing\\.com/event/[0-9]+'
  or lower(source_url_normalized) ~ 'eventbrite\\.[^/]+/e/'
  or lower(source_url_normalized) ~ 'meetup\\.com/[^/]+/events/[0-9]+'
  or lower(source_url_normalized) ~ 'segmentfault\\.com/e/[0-9]+'
`;

const orphanSingleEventSourceWhere = `
  not exists (
    select 1
    from "aiEvents_city_sources" cs
    where cs.source_id = s.id
  )
  and (
    s.source_scope = 'single_event'
    or lower(s.url_normalized) ~ 'huodongxing\\.com/event/[0-9]+'
    or lower(s.url_normalized) ~ 'eventbrite\\.[^/]+/e/'
    or lower(s.url_normalized) ~ 'meetup\\.com/[^/]+/events/[0-9]+'
    or lower(s.url_normalized) ~ 'segmentfault\\.com/e/[0-9]+'
  )
`;

await withDb(async pool => {
  const preview = await pool.query(
    `select cs.id, cs.city_key, s.source_type, cs.source_url, cs.status
     from "aiEvents_city_sources" cs
     join "aiEvents_sources" s on s.id = cs.source_id
     where ${singleEventUrlWhere}
     order by cs.city_key, s.source_type, cs.source_url
     limit 20`,
  );

  const bindingCount = await pool.query(
    `select count(*)::integer as count
     from "aiEvents_city_sources"
     where ${singleEventUrlWhere}`,
  );
  const orphanCount = await pool.query(
    `select count(*)::integer as count
     from "aiEvents_sources" s
     where ${orphanSingleEventSourceWhere}`,
  );

  let changedBindings = 0;
  let changedSources = 0;
  if (!dryRun) {
    if (mode === 'archive') {
      const result = await pool.query(
        `update "aiEvents_city_sources"
         set status = 'archived', updated_at = now()
         where ${singleEventUrlWhere}`,
      );
      changedBindings = result.rowCount || 0;
    } else {
      const result = await pool.query(
        `delete from "aiEvents_city_sources"
         where ${singleEventUrlWhere}`,
      );
      changedBindings = result.rowCount || 0;

      const sourceResult = await pool.query(
        `delete from "aiEvents_sources" s
         where ${orphanSingleEventSourceWhere}`,
      );
      changedSources = sourceResult.rowCount || 0;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    dry_run: dryRun,
    mode,
    matched_single_event_city_sources: bindingCount.rows[0]?.count || 0,
    matched_orphan_single_event_sources: orphanCount.rows[0]?.count || 0,
    changed_city_sources: changedBindings,
    changed_sources: changedSources,
    preview: preview.rows.map(row => ({
      city_key: row.city_key,
      source_type: row.source_type,
      status: row.status,
      source_url: row.source_url,
    })),
  }, null, 2));
});
