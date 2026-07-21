import { loadLocalEnv, withDb } from './lib/db.mjs';
import { normalizeUrl, normalizeWhitespace } from './lib/normalize.mjs';

loadLocalEnv();

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const dryRun = process.argv.includes('--dry-run') || process.env.AI_EVENTS_SYNC_CITY_SOURCES_DRY_RUN === '1';
const onlyCityKey = arg('city-key', process.env.AI_EVENTS_SYNC_CITY_KEY || '');
const onlySourceKey = arg('source-key', process.env.AI_EVENTS_SYNC_SOURCE_KEY || '');

function slugify(value) {
  return normalizeWhitespace(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function titleSlug(value) {
  const slug = slugify(value);
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join('-');
}

function firstLatinAlias(city) {
  const aliases = Array.isArray(city.aliases) ? city.aliases : [];
  return aliases.find(value => /^[A-Za-z][A-Za-z\s-]*$/.test(String(value || ''))) || '';
}

function platformSlugs(city) {
  return city.platform_slugs && typeof city.platform_slugs === 'object' && !Array.isArray(city.platform_slugs)
    ? city.platform_slugs
    : {};
}

function pickSlug(city, keys, fallback = '') {
  const slugs = platformSlugs(city);
  for (const key of keys) {
    const value = normalizeWhitespace(slugs[key]);
    if (value) return value;
  }
  return fallback;
}

function defaultCitySlug(city) {
  return slugify(firstLatinAlias(city) || city.city_key || city.display_name);
}

function variableMap(city, source) {
  const basicSlug = defaultCitySlug(city);
  const countryCode = normalizeWhitespace(city.country_code).toUpperCase();
  const eventbriteFallback = countryCode === 'CN' ? `china--${basicSlug}` : basicSlug;
  const meetupFallback = countryCode === 'CN' ? `cn--${titleSlug(firstLatinAlias(city) || city.city_key)}` : basicSlug;

  return {
    city_key: city.city_key,
    city_name: city.display_name,
    city_display_name: city.display_name,
    city_slug: pickSlug(city, [
      `${source.source_key}_city_slug`,
      `${source.source_type}_city_slug`,
      source.source_key,
      source.source_type,
      'city_slug',
    ], basicSlug),
    eventbrite_city_slug: pickSlug(city, ['eventbrite_city_slug', 'eventbrite'], eventbriteFallback),
    meetup_location: pickSlug(city, ['meetup_location', 'meetup'], meetupFallback),
    segmentfault_city_id: pickSlug(city, ['segmentfault_city_id', 'segmentfault'], ''),
    luma_city_slug: pickSlug(city, ['luma_city_slug', 'luma'], basicSlug),
    lianpu_city_slug: pickSlug(city, ['lianpu_city_slug', 'lianpu'], basicSlug),
  };
}

function sourceTemplate(source) {
  return normalizeWhitespace(source.url_template || source.url);
}

function templateRequirements(template) {
  return Array.from(template.matchAll(/\{\{([A-Za-z0-9_]+)\}\}/g)).map(match => match[1]);
}

function renderSourceUrl(city, source) {
  const template = sourceTemplate(source);
  if (!template) return { ok: false, reason: 'missing_template' };

  const values = variableMap(city, source);
  if (source.source_key === 'eventbrite_city_search') values.city_slug = values.eventbrite_city_slug;
  if (source.source_key === 'meetup_city_search') values.city_slug = values.meetup_location;
  if (source.source_key === 'segmentfault_events') values.city_slug = values.segmentfault_city_id;
  if (source.source_key === 'luma_city') values.city_slug = values.luma_city_slug;
  if (source.source_key === 'lianpu_city') values.city_slug = values.lianpu_city_slug;

  for (const key of templateRequirements(template)) {
    if (!normalizeWhitespace(values[key])) {
      return { ok: false, reason: `missing_${key}` };
    }
  }

  const url = template.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_, key) => encodeURIComponent(values[key]));
  return { ok: true, url: normalizeUrl(url), values };
}

async function loadCities(pool) {
  const values = [];
  const filters = ['is_active = true'];
  if (onlyCityKey) {
    values.push(onlyCityKey);
    filters.push(`city_key = $${values.length}`);
  }
  const { rows } = await pool.query(
    `select id, city_key, display_name, country_code, aliases, platform_slugs
     from "aiEvents_cities"
     where ${filters.join(' and ')}
     order by city_key`,
    values,
  );
  return rows;
}

async function loadSources(pool) {
  const values = [];
  const filters = [
    `status = 'active'`,
    `fetch_method <> 'html_detail'`,
    `source_type not like '%\\_detail' escape '\\'`,
  ];
  if (onlySourceKey) {
    values.push(onlySourceKey);
    filters.push(`source_key = $${values.length}`);
  }
  const { rows } = await pool.query(
    `select id, source_key, source_type, url, url_template, source_scope, relevance_level, fetch_method, raw_config
     from "aiEvents_sources"
     where ${filters.join(' and ')}
     order by source_key`,
    values,
  );
  return rows;
}

function defaultPriority(source) {
  if (source.relevance_level === 'strong') return 90;
  if (source.relevance_level === 'weak') return 60;
  if (source.relevance_level === 'city_only') return 40;
  return 50;
}

async function ensureCitySourcesIndex(pool) {
  const { rows } = await pool.query(
    `select exists (
       select 1
       from information_schema.tables
       where table_schema = 'public'
         and table_name = 'aiEvents_city_sources'
     ) as exists`,
  );
  if (!rows[0]?.exists) {
    throw new Error('Missing aiEvents_city_sources. Run pnpm ai-events:schema before syncing city sources.');
  }
  await pool.query(`create unique index if not exists "aiEvents_city_sources_city_url_idx" on "aiEvents_city_sources" (city_key, source_url_normalized)`);
}

const staleTemplateBindingWhere = `
  position('{{' in coalesce(s.url_template, '')) > 0
  and (
    cs.source_url = s.url
    or cs.source_url_normalized = s.url_normalized
    or lower(regexp_replace(coalesce(cs.source_url_normalized, ''), '/+$', '')) =
       lower(regexp_replace(coalesce(s.url_normalized, ''), '/+$', ''))
  )
`;

async function staleTemplateBindingCount(pool) {
  const { rows } = await pool.query(
    `select count(*)::integer as count
     from "aiEvents_city_sources" cs
     join "aiEvents_sources" s on s.id = cs.source_id
     where ${staleTemplateBindingWhere}`,
  );
  return rows[0]?.count || 0;
}

async function removeStaleTemplateBindings(pool) {
  const result = await pool.query(
    `delete from "aiEvents_city_sources" cs
     using "aiEvents_sources" s
     where cs.source_id = s.id
       and ${staleTemplateBindingWhere}`,
  );
  return result.rowCount || 0;
}

async function duplicateCitySourceBindingCount(pool) {
  const { rows } = await pool.query(
    `select coalesce(sum(count - 1), 0)::integer as count
     from (
       select count(*)::integer as count
       from "aiEvents_city_sources" cs
       join "aiEvents_sources" s on s.id = cs.source_id
       where cs.status = 'active'
         and s.status = 'active'
       group by cs.city_key, s.source_key
       having count(*) > 1
     ) duplicates`,
  );
  return rows[0]?.count || 0;
}

async function removeDuplicateCitySourceBindings(pool) {
  const result = await pool.query(`
    with ranked_bindings as (
      select cs.id,
             row_number() over (
               partition by cs.city_key, s.source_key
               order by
                 case when cs.raw_config->>'generated_from_template' = 'true' then 0 else 1 end,
                 cs.priority desc,
                 cs.updated_at desc,
                 cs.created_at desc,
                 cs.id asc
             ) as rank
      from "aiEvents_city_sources" cs
      join "aiEvents_sources" s on s.id = cs.source_id
      where cs.status = 'active'
        and s.status = 'active'
    )
    delete from "aiEvents_city_sources" cs
    using ranked_bindings
    where cs.id = ranked_bindings.id
      and ranked_bindings.rank > 1
  `);
  return result.rowCount || 0;
}

await withDb(async pool => {
  await ensureCitySourcesIndex(pool);
  const staleTemplateBindingsMatched = await staleTemplateBindingCount(pool);
  const staleTemplateBindingsDeleted = dryRun ? 0 : await removeStaleTemplateBindings(pool);
  const duplicateCitySourceBindingsMatched = await duplicateCitySourceBindingCount(pool);
  const duplicateCitySourceBindingsDeleted = dryRun ? 0 : await removeDuplicateCitySourceBindings(pool);
  const cities = await loadCities(pool);
  const sources = await loadSources(pool);
  let planned = 0;
  let inserted = 0;
  let existingUpdated = 0;
  const skipped = [];

  for (const city of cities) {
    for (const source of sources) {
      const rendered = renderSourceUrl(city, source);
      if (!rendered.ok) {
        skipped.push({
          city_key: city.city_key,
          source_key: source.source_key,
          reason: rendered.reason,
        });
        continue;
      }
      planned += 1;
      if (dryRun) continue;

      const result = await pool.query(
        `insert into "aiEvents_city_sources"
           (city_id, city_key, source_id, source_url, source_url_normalized, status, priority, raw_config)
         values ($1,$2,$3,$4,$5,'active',$6,$7::jsonb)
         on conflict (city_key, source_url_normalized) do update set
           city_id = excluded.city_id,
           source_id = excluded.source_id,
           updated_at = now()
         returning (xmax = 0) as inserted`,
        [
          city.id,
          city.city_key,
          source.id,
          rendered.url,
          normalizeUrl(rendered.url),
          defaultPriority(source),
          JSON.stringify({
            generated_from_template: true,
            source_key: source.source_key,
          }),
        ],
      );
      if (result.rows[0]?.inserted) inserted += 1;
      else existingUpdated += 1;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    dry_run: dryRun,
    cities_checked: cities.length,
    sources_checked: sources.length,
    combinations_planned: planned,
    stale_template_bindings_matched: staleTemplateBindingsMatched,
    stale_template_bindings_deleted: staleTemplateBindingsDeleted,
    duplicate_city_source_bindings_matched: duplicateCitySourceBindingsMatched,
    duplicate_city_source_bindings_deleted: duplicateCitySourceBindingsDeleted,
    city_sources_inserted: inserted,
    city_sources_existing_touched: existingUpdated,
    skipped_count: skipped.length,
    skipped: skipped.slice(0, 20),
  }, null, 2));
});
