import { loadLocalEnv, withDb } from './lib/db.mjs';

loadLocalEnv();

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const mode = arg('mode', 'archive-invalid-city');
const dryRun = process.argv.includes('--dry-run');

if (mode !== 'archive-invalid-city') {
  throw new Error(`Unsupported cleanup mode: ${mode}`);
}

await withDb(async pool => {
  const invalid = await pool.query(
    `select e.id, e.raw_id, e.city, e.city_key, e.title
     from "aiEvents_events" e
     join "aiEvents_cities" c on c.city_key = e.city_key
     where e.status <> 'archived'
       and e.city <> '线上'
       and e.city <> c.display_name
       and not (c.aliases ? e.city)
     order by e.updated_at desc
     limit 500`,
  );

  if (!dryRun && invalid.rows.length > 0) {
    const eventIds = invalid.rows.map(row => row.id);
    const rawIds = invalid.rows.map(row => row.raw_id).filter(Boolean);
    await pool.query(
      `update "aiEvents_events"
       set status = 'archived', updated_at = now()
       where id = any($1::uuid[])`,
      [eventIds],
    );
    if (rawIds.length > 0) {
      await pool.query(
        `update "aiEvents_raw"
         set processing_status = 'ignored',
             processing_error = 'Archived normalized event because city does not match city_key'
         where id = any($1::uuid[])`,
        [rawIds],
      );
    }
  }

  console.log(JSON.stringify({
    ok: true,
    dry_run: dryRun,
    mode,
    invalid_city_events: invalid.rows.length,
    rows: invalid.rows.slice(0, 20),
  }, null, 2));
});
