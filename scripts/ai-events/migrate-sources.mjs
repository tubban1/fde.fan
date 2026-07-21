import { loadLocalEnv, withDb } from './lib/db.mjs';

loadLocalEnv();

const canonicalSources = [
  {
    source_key: 'huodongxing_city',
    source_type: 'huodongxing_city',
    url: 'https://www.huodongxing.com/events',
    url_template: 'https://www.huodongxing.com/events?orderby=o&d=t5&tag=AI&city={{city_name}}',
    fetch_method: 'html_list',
    source_scope: 'city_ai',
    relevance_level: 'strong',
  },
  {
    source_key: 'eventbrite_city_search',
    source_type: 'eventbrite_city_search',
    url: 'https://www.eventbrite.com/',
    url_template: 'https://www.eventbrite.com/d/{{city_slug}}/ai/',
    fetch_method: 'html_list',
    source_scope: 'city_ai',
    relevance_level: 'strong',
  },
  {
    source_key: 'luma_city',
    source_type: 'luma_city',
    url: 'https://luma.com/',
    url_template: 'https://luma.com/{{city_slug}}',
    fetch_method: 'html_list',
    source_scope: 'city_only',
    relevance_level: 'city_only',
  },
  {
    source_key: 'meetup_city_search',
    source_type: 'meetup_city_search',
    url: 'https://www.meetup.com/find/',
    url_template: 'https://www.meetup.com/find/?location={{meetup_location}}&source=EVENTS&categoryId=546',
    fetch_method: 'html_list',
    source_scope: 'city_tech',
    relevance_level: 'weak',
  },
  {
    source_key: 'segmentfault_events',
    source_type: 'segmentfault_events',
    url: 'https://segmentfault.com/events',
    url_template: 'https://segmentfault.com/events?city={{segmentfault_city_id}}',
    fetch_method: 'html_list',
    source_scope: 'city_tech',
    relevance_level: 'weak',
  },
  {
    source_key: 'lianpu_city',
    source_type: 'lianpu_city',
    url: 'https://lianpu.com/',
    url_template: 'https://lianpu.com/city/{{city_slug}}',
    fetch_method: 'html_list',
    source_scope: 'city_tech',
    relevance_level: 'weak',
  },
  {
    source_key: 'volcengine_activities',
    source_type: 'volcengine_activities',
    url: 'https://developer.volcengine.com/activities',
    url_template: 'https://developer.volcengine.com/activities',
    fetch_method: 'html_list',
    source_scope: 'ai_global',
    relevance_level: 'strong',
  },
  {
    source_key: 'tencent_cloud_salon_list',
    source_type: 'tencent_cloud_salon_list',
    url: 'https://cloud.tencent.com/developer/salon/activities',
    url_template: 'https://cloud.tencent.com/developer/salon/activities?topic=2212',
    fetch_method: 'html_list',
    source_scope: 'ai_global',
    relevance_level: 'strong',
  },
];

async function tableExists(pool, tableName) {
  const { rows } = await pool.query(
    `select exists (
       select 1
       from information_schema.tables
       where table_schema = 'public'
         and table_name = $1
     ) as exists`,
    [tableName],
  );
  return Boolean(rows[0]?.exists);
}

async function columnExists(pool, tableName, columnName) {
  const { rows } = await pool.query(
    `select exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = $1
         and column_name = $2
     ) as exists`,
    [tableName, columnName],
  );
  return Boolean(rows[0]?.exists);
}

async function sourceColumns(pool) {
  const { rows } = await pool.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'aiEvents_sources'
     order by ordinal_position`,
  );
  return rows.map(row => row.column_name);
}

async function ensureBaseColumns(pool) {
  const statements = [
    `alter table "aiEvents_sources" add column if not exists source_key text`,
    `alter table "aiEvents_sources" add column if not exists url_template text`,
    `alter table "aiEvents_sources" add column if not exists source_scope text not null default 'unknown'`,
    `alter table "aiEvents_sources" add column if not exists relevance_level text not null default 'unknown'`,
    `alter table "aiEvents_sources" add column if not exists raw_config jsonb not null default '{}'::jsonb`,
    `alter table "aiEvents_sources" add column if not exists created_at timestamptz not null default now()`,
    `alter table "aiEvents_sources" add column if not exists updated_at timestamptz not null default now()`,
  ];
  for (const statement of statements) await pool.query(statement);

  if (await columnExists(pool, 'aiEvents_sources', 'city_key')) {
    await pool.query(`alter table "aiEvents_sources" alter column city_key drop not null`);
  }
}

async function ensureCitySourcesTable(pool) {
  await pool.query(`
    create table if not exists "aiEvents_city_sources" (
      id uuid primary key default gen_random_uuid(),
      city_id uuid references "aiEvents_cities"(id) on delete cascade,
      city_key text,
      source_id uuid references "aiEvents_sources"(id) on delete cascade,
      source_url text,
      source_url_normalized text,
      status text not null default 'active',
      crawl_frequency_minutes integer not null default 720,
      priority integer not null default 50,
      last_success_at timestamptz,
      last_checked_at timestamptz,
      consecutive_failures integer not null default 0,
      raw_config jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  const statements = [
    `alter table "aiEvents_city_sources" add column if not exists city_id uuid references "aiEvents_cities"(id) on delete cascade`,
    `alter table "aiEvents_city_sources" add column if not exists city_key text`,
    `alter table "aiEvents_city_sources" add column if not exists source_id uuid references "aiEvents_sources"(id) on delete cascade`,
    `alter table "aiEvents_city_sources" add column if not exists source_url text`,
    `alter table "aiEvents_city_sources" add column if not exists source_url_normalized text`,
    `alter table "aiEvents_city_sources" add column if not exists status text not null default 'active'`,
    `alter table "aiEvents_city_sources" add column if not exists crawl_frequency_minutes integer not null default 720`,
    `alter table "aiEvents_city_sources" add column if not exists priority integer not null default 50`,
    `alter table "aiEvents_city_sources" add column if not exists last_success_at timestamptz`,
    `alter table "aiEvents_city_sources" add column if not exists last_checked_at timestamptz`,
    `alter table "aiEvents_city_sources" add column if not exists consecutive_failures integer not null default 0`,
    `alter table "aiEvents_city_sources" add column if not exists raw_config jsonb not null default '{}'::jsonb`,
    `alter table "aiEvents_city_sources" add column if not exists created_at timestamptz not null default now()`,
    `alter table "aiEvents_city_sources" add column if not exists updated_at timestamptz not null default now()`,
  ];
  for (const statement of statements) await pool.query(statement);
  await pool.query(`create unique index if not exists "aiEvents_city_sources_city_url_idx" on "aiEvents_city_sources" (city_key, source_url_normalized)`);
}

async function upsertCanonicalSources(pool) {
  let changed = 0;
  for (const source of canonicalSources) {
    const existing = await pool.query(
      `select id
       from "aiEvents_sources"
       where source_key = $1
          or (source_key is null and source_type = $2)
       order by created_at asc
       limit 1`,
      [source.source_key, source.source_type],
    );
    if (existing.rows[0]) {
      const result = await pool.query(
        `update "aiEvents_sources"
         set source_key = $2,
             source_type = $3,
             url = $4,
             url_normalized = $4,
             url_template = $5,
             fetch_method = $6,
             source_scope = $7,
             relevance_level = $8,
             status = case when status = 'archived' then 'active' else status end,
             updated_at = now()
         where id = $1`,
        [
          existing.rows[0].id,
          source.source_key,
          source.source_type,
          source.url,
          source.url_template,
          source.fetch_method,
          source.source_scope,
          source.relevance_level,
        ],
      );
      changed += result.rowCount || 0;
    } else {
      const result = await pool.query(
        `insert into "aiEvents_sources"
           (source_key, source_type, url, url_normalized, url_template, fetch_method,
            source_scope, relevance_level, status, raw_config)
         values ($1,$2,$3,$3,$4,$5,$6,$7,'active','{}'::jsonb)`,
        [
          source.source_key,
          source.source_type,
          source.url,
          source.url_template,
          source.fetch_method,
          source.source_scope,
          source.relevance_level,
        ],
      );
      changed += result.rowCount || 0;
    }
  }
  return changed;
}

async function migrateLegacyCitySources(pool) {
  if (!(await columnExists(pool, 'aiEvents_sources', 'city_key'))) return 0;

  const result = await pool.query(`
    insert into "aiEvents_city_sources"
      (city_id, city_key, source_id, source_url, source_url_normalized, status,
       crawl_frequency_minutes, priority, last_success_at, last_checked_at, consecutive_failures, raw_config)
    select c.id,
           legacy.city_key,
           generic.id,
           legacy.url,
           legacy.url_normalized,
           legacy.status,
           coalesce(legacy.crawl_frequency_minutes, 720),
           coalesce(legacy.priority, 50),
           legacy.last_success_at,
           legacy.last_checked_at,
           coalesce(legacy.consecutive_failures, 0),
           legacy.raw_config
    from "aiEvents_sources" legacy
    join "aiEvents_cities" c on c.city_key = legacy.city_key
    join "aiEvents_sources" generic on generic.source_key = legacy.source_type
    where legacy.city_key is not null
      and coalesce(legacy.source_scope, 'unknown') <> 'single_event'
      and lower(legacy.url_normalized) !~ 'huodongxing\\.com/event/[0-9]+'
      and lower(legacy.url_normalized) !~ 'eventbrite\\.[^/]+/e/'
      and lower(legacy.url_normalized) !~ 'meetup\\.com/[^/]+/events/[0-9]+'
      and lower(legacy.url_normalized) !~ 'segmentfault\\.com/e/[0-9]+'
    on conflict (city_key, source_url_normalized) do update set
      source_id = excluded.source_id,
      city_id = excluded.city_id,
      status = excluded.status,
      crawl_frequency_minutes = excluded.crawl_frequency_minutes,
      priority = excluded.priority,
      raw_config = excluded.raw_config,
      updated_at = now()
  `);
  return result.rowCount || 0;
}

async function relinkAndRemoveDuplicateSources(pool) {
  const relinkCitySources = await pool.query(`
    with ranked_sources as (
      select id,
             first_value(id) over (
               partition by coalesce(source_key, source_type)
               order by
                 case when url !~* '(beijing|shanghai|chengdu|geneva|city=|location=|/d/|/city/|\\?q=)' then 0 else 1 end,
                 created_at asc,
                 id asc
             ) as keeper_id,
             row_number() over (
               partition by coalesce(source_key, source_type)
               order by
                 case when url !~* '(beijing|shanghai|chengdu|geneva|city=|location=|/d/|/city/|\\?q=)' then 0 else 1 end,
                 created_at asc,
                 id asc
             ) as rank
      from "aiEvents_sources"
    )
    update "aiEvents_city_sources" cs
    set source_id = ranked_sources.keeper_id,
        updated_at = now()
    from ranked_sources
    where cs.source_id = ranked_sources.id
      and ranked_sources.rank > 1
  `);

  const relinkRaw = await pool.query(`
    with ranked_sources as (
      select id,
             first_value(id) over (
               partition by coalesce(source_key, source_type)
               order by
                 case when url !~* '(beijing|shanghai|chengdu|geneva|city=|location=|/d/|/city/|\\?q=)' then 0 else 1 end,
                 created_at asc,
                 id asc
             ) as keeper_id,
             row_number() over (
               partition by coalesce(source_key, source_type)
               order by
                 case when url !~* '(beijing|shanghai|chengdu|geneva|city=|location=|/d/|/city/|\\?q=)' then 0 else 1 end,
                 created_at asc,
                 id asc
             ) as rank
      from "aiEvents_sources"
    )
    update "aiEvents_raw" r
    set source_id = ranked_sources.keeper_id
    from ranked_sources
    where r.source_id = ranked_sources.id
      and ranked_sources.rank > 1
  `);

  const deletedSources = await pool.query(`
    with ranked_sources as (
      select id,
             row_number() over (
               partition by coalesce(source_key, source_type)
               order by
                 case when url !~* '(beijing|shanghai|chengdu|geneva|city=|location=|/d/|/city/|\\?q=)' then 0 else 1 end,
                 created_at asc,
                 id asc
             ) as rank
      from "aiEvents_sources"
    )
    delete from "aiEvents_sources" s
    using ranked_sources
    where s.id = ranked_sources.id
      and ranked_sources.rank > 1
  `);

  return {
    city_sources_relinked: relinkCitySources.rowCount || 0,
    raw_relinked: relinkRaw.rowCount || 0,
    duplicate_sources_deleted: deletedSources.rowCount || 0,
  };
}

async function dropLegacySourceColumns(pool) {
  const statements = [
    `alter table "aiEvents_sources" drop constraint if exists "aiEvents_sources_url_normalized_key"`,
    `alter table "aiEvents_sources" drop constraint if exists "aiEvents_sources_city_key_url_normalized_key"`,
    `drop index if exists "aiEvents_sources_city_url_idx"`,
    `alter table "aiEvents_sources" drop column if exists city`,
    `alter table "aiEvents_sources" drop column if exists city_id`,
    `alter table "aiEvents_sources" drop column if exists city_key`,
    `alter table "aiEvents_sources" drop column if exists source_kind`,
    `alter table "aiEvents_sources" drop column if exists crawl_frequency_minutes`,
    `alter table "aiEvents_sources" drop column if exists priority`,
    `alter table "aiEvents_sources" drop column if exists last_success_at`,
    `alter table "aiEvents_sources" drop column if exists last_checked_at`,
    `alter table "aiEvents_sources" drop column if exists consecutive_failures`,
  ];
  for (const statement of statements) await pool.query(statement);
}

async function applyConstraints(pool) {
  const statements = [
    `update "aiEvents_sources"
     set source_key = coalesce(source_key, source_type),
         url_template = coalesce(url_template, url),
         url_normalized = coalesce(url_normalized, url)
     where source_key is null or url_template is null or url_normalized is null`,
    `alter table "aiEvents_sources" alter column source_key set not null`,
    `alter table "aiEvents_sources" alter column source_type set not null`,
    `alter table "aiEvents_sources" alter column url set not null`,
    `alter table "aiEvents_sources" alter column url_normalized set not null`,
    `alter table "aiEvents_sources" alter column url_template set not null`,
    `create unique index if not exists "aiEvents_sources_source_key_idx" on "aiEvents_sources" (source_key)`,
    `create unique index if not exists "aiEvents_city_sources_city_url_idx" on "aiEvents_city_sources" (city_key, source_url_normalized)`,
  ];
  for (const statement of statements) await pool.query(statement);
}

async function audit(pool) {
  const [sources, citySources, citySpecificSources] = await Promise.all([
    pool.query(`select count(*)::integer as count from "aiEvents_sources"`),
    pool.query(`select count(*)::integer as count from "aiEvents_city_sources"`),
    pool.query(`
      select count(*)::integer as count
      from "aiEvents_sources"
      where lower(url) ~ '(beijing|shanghai|chengdu|geneva|city=|location=|/d/[^/]+/ai|/city/|\\?q=)'
         or lower(url_normalized) ~ '(beijing|shanghai|chengdu|geneva|city=|location=|/d/[^/]+/ai|/city/|\\?q=)'
    `),
  ]);
  return {
    source_columns: await sourceColumns(pool),
    sources_count: sources.rows[0]?.count || 0,
    city_sources_count: citySources.rows[0]?.count || 0,
    city_specific_sources_count: citySpecificSources.rows[0]?.count || 0,
  };
}

await withDb(async pool => {
  if (!(await tableExists(pool, 'aiEvents_sources'))) {
    console.log(JSON.stringify({
      ok: true,
      skipped: true,
      reason: 'aiEvents_sources does not exist yet. Run ai-events:schema first on a fresh database.',
    }, null, 2));
    return;
  }

  await ensureBaseColumns(pool);
  await ensureCitySourcesTable(pool);
  const canonicalSourcesChanged = await upsertCanonicalSources(pool);
  const citySourcesMigrated = await migrateLegacyCitySources(pool);
  const relinked = await relinkAndRemoveDuplicateSources(pool);
  await dropLegacySourceColumns(pool);
  await applyConstraints(pool);
  const summary = await audit(pool);

  console.log(JSON.stringify({
    ok: true,
    canonical_sources_changed: canonicalSourcesChanged,
    city_sources_migrated: citySourcesMigrated,
    ...relinked,
    ...summary,
  }, null, 2));
});
