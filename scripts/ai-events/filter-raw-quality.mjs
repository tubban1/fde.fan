import { loadLocalEnv, withDb } from './lib/db.mjs';
import { classifyIgnorableRaw, compactRawQualityRow } from './lib/raw-quality.mjs';

loadLocalEnv();

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const dryRun = process.argv.includes('--dry-run') || process.env.AI_EVENTS_FILTER_RAW_DRY_RUN === '1';
const status = arg('status', process.env.AI_EVENTS_FILTER_RAW_STATUS || 'pending');
const limit = Number(arg('limit', process.env.AI_EVENTS_FILTER_RAW_LIMIT || 5000));
const previewLimit = Number(arg('preview-limit', process.env.AI_EVENTS_FILTER_RAW_PREVIEW_LIMIT || 30));

await withDb(async pool => {
  const values = [];
  const filters = [];
  if (status !== 'all') {
    values.push(status);
    filters.push(`processing_status = $${values.length}`);
  }
  const whereSql = filters.length ? `where ${filters.join(' and ')}` : '';
  const { rows } = await pool.query(
    `select id, city_key, city, source_type, source_url, raw_title, raw_text, raw_payload,
            processing_status, fetched_at
     from "aiEvents_raw"
     ${whereSql}
     order by fetched_at asc
     limit ${Math.max(1, Math.floor(limit))}`,
    values,
  );

  const ignorable = [];
  for (const row of rows) {
    const classification = classifyIgnorableRaw(row);
    if (!classification.ignore) continue;
    ignorable.push({
      row,
      classification,
    });
  }

  let rawIgnored = 0;
  let eventsArchived = 0;
  const reasonCounts = {};
  for (const item of ignorable) {
    reasonCounts[item.classification.reason] = (reasonCounts[item.classification.reason] || 0) + 1;
  }

  if (!dryRun && ignorable.length > 0) {
    await pool.query('begin');
    try {
      for (const item of ignorable) {
        const rawResult = await pool.query(
          `update "aiEvents_raw"
           set processing_status = 'ignored',
               processing_error = $2
           where id = $1
             and processing_status <> 'ignored'`,
          [item.row.id, `Cheap filter ignored raw: ${item.classification.reason}`],
        );
        rawIgnored += rawResult.rowCount || 0;
      }
      const rawIds = ignorable.map(item => item.row.id);
      const eventResult = await pool.query(
        `update "aiEvents_events"
         set status = 'archived', updated_at = now()
         where raw_id = any($1::uuid[])
           and status <> 'archived'`,
        [rawIds],
      );
      eventsArchived = eventResult.rowCount || 0;
      await pool.query('commit');
    } catch (error) {
      await pool.query('rollback');
      throw error;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    dry_run: dryRun,
    inspected_status: status,
    inspected_rows: rows.length,
    matched_ignorable_raw: ignorable.length,
    raw_ignored: rawIgnored,
    events_archived: eventsArchived,
    reason_counts: reasonCounts,
    preview: ignorable.slice(0, previewLimit).map(item => compactRawQualityRow(
      item.row,
      item.classification.reason,
      item.classification.detected_date ? { detected_date: item.classification.detected_date } : {},
    )),
  }, null, 2));
});
