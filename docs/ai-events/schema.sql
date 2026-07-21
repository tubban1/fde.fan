create extension if not exists pgcrypto;

create table if not exists "aiEvents_cities" (
  id uuid primary key default gen_random_uuid(),
  city_key text not null unique,
  display_name text not null,
  country_code text,
  region text,
  timezone text not null default 'Asia/Shanghai',
  aliases jsonb not null default '[]'::jsonb,
  platform_slugs jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "aiEvents_sources" (
  id uuid primary key default gen_random_uuid(),
  source_key text,
  source_type text not null,
  url text not null,
  url_normalized text not null,
  url_template text,
  fetch_method text not null default 'html_list',
  source_scope text not null default 'unknown' check (source_scope in ('city_ai', 'city_tech', 'city_only', 'ai_global', 'single_event', 'unknown')),
  relevance_level text not null default 'unknown' check (relevance_level in ('strong', 'weak', 'city_only', 'event', 'unknown')),
  status text not null default 'active' check (status in ('active', 'paused', 'needs_review', 'archived')),
  raw_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key)
);

alter table "aiEvents_sources" add column if not exists source_key text;
alter table "aiEvents_sources" add column if not exists url_template text;
alter table "aiEvents_sources" add column if not exists source_type text;
alter table "aiEvents_sources" add column if not exists url text;
alter table "aiEvents_sources" add column if not exists url_normalized text;
alter table "aiEvents_sources" add column if not exists fetch_method text not null default 'html_list';
alter table "aiEvents_sources" add column if not exists source_scope text not null default 'unknown';
alter table "aiEvents_sources" add column if not exists relevance_level text not null default 'unknown';
alter table "aiEvents_sources" add column if not exists status text not null default 'active';
alter table "aiEvents_sources" add column if not exists raw_config jsonb not null default '{}'::jsonb;
alter table "aiEvents_sources" add column if not exists created_at timestamptz not null default now();
alter table "aiEvents_sources" add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'aiEvents_sources' and column_name = 'city_key'
  ) then
    execute 'alter table "aiEvents_sources" alter column city_key drop not null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_name = 'aiEvents_sources' and column_name = 'source_kind'
  ) then
    execute '
      update "aiEvents_sources"
      set source_kind = case
            when lower(url_normalized) ~ ''huodongxing\.com/event/[0-9]+''
              or lower(url_normalized) ~ ''eventbrite\.[^/]+/e/''
              or lower(url_normalized) ~ ''meetup\.com/[^/]+/events/[0-9]+''
              or lower(url_normalized) ~ ''segmentfault\.com/e/[0-9]+''
            then ''single_event''
            else ''recurring_source''
          end
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_name = 'aiEvents_sources' and column_name = 'city_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_name = 'aiEvents_sources' and column_name = 'city_key'
  ) then
    execute '
      update "aiEvents_sources" s
      set city_key = c.city_key
      from "aiEvents_cities" c
      where s.city_key is null
        and s.city_id = c.id
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_name = 'aiEvents_sources' and column_name = 'city'
  ) then
    execute '
      update "aiEvents_sources" s
      set city_key = c.city_key,
          city_id = c.id
      from "aiEvents_cities" c
      where s.city_key is null
        and (s.city = c.display_name or c.aliases ? s.city)
    ';
  end if;
end $$;

update "aiEvents_sources"
set source_scope = case
      when lower(url_normalized) ~ 'huodongxing\.com/event/[0-9]+'
        or lower(url_normalized) ~ 'eventbrite\.[^/]+/e/'
        or lower(url_normalized) ~ 'meetup\.com/[^/]+/events/[0-9]+'
        or lower(url_normalized) ~ 'segmentfault\.com/e/[0-9]+'
      then 'single_event'
      when lower(url_normalized) ~ 'eventbrite\.[^/]+/d/[^/]+/ai/?'
        or (lower(url_normalized) like '%huodongxing.com/events%' and lower(url_normalized) like '%tag=ai%' and lower(url_normalized) like '%city=%')
      then 'city_ai'
      when lower(url_normalized) like '%segmentfault.com/events%'
        or (lower(url_normalized) like '%meetup.com/find%' and lower(url_normalized) like '%categoryid=546%')
        or lower(url_normalized) like '%lianpu.com/city/%'
      then 'city_tech'
      when lower(url_normalized) ~ 'luma\.com/[^/?#]+/?$'
        or lower(url_normalized) ~ 'lu\.ma/[^/?#]+/?$'
      then 'city_only'
      when lower(url_normalized) like '%developer.volcengine.com/activities%'
        or lower(url_normalized) like '%cloud.tencent.com/developer/salon/activities%'
      then 'ai_global'
      else source_scope
    end,
    relevance_level = case
      when lower(url_normalized) ~ 'huodongxing\.com/event/[0-9]+'
        or lower(url_normalized) ~ 'eventbrite\.[^/]+/e/'
        or lower(url_normalized) ~ 'meetup\.com/[^/]+/events/[0-9]+'
        or lower(url_normalized) ~ 'segmentfault\.com/e/[0-9]+'
      then 'event'
      when lower(url_normalized) ~ 'eventbrite\.[^/]+/d/[^/]+/ai/?'
        or (lower(url_normalized) like '%huodongxing.com/events%' and lower(url_normalized) like '%tag=ai%' and lower(url_normalized) like '%city=%')
        or lower(url_normalized) like '%developer.volcengine.com/activities%'
        or lower(url_normalized) like '%cloud.tencent.com/developer/salon/activities%'
      then 'strong'
      when lower(url_normalized) like '%segmentfault.com/events%'
        or (lower(url_normalized) like '%meetup.com/find%' and lower(url_normalized) like '%categoryid=546%')
        or lower(url_normalized) like '%lianpu.com/city/%'
      then 'weak'
      when lower(url_normalized) ~ 'luma\.com/[^/?#]+/?$'
        or lower(url_normalized) ~ 'lu\.ma/[^/?#]+/?$'
      then 'city_only'
      else relevance_level
    end
where source_scope = 'unknown'
   or relevance_level = 'unknown'
   or lower(url_normalized) ~ 'huodongxing\.com/event/[0-9]+'
   or lower(url_normalized) ~ 'eventbrite\.[^/]+/e/'
   or lower(url_normalized) ~ 'meetup\.com/[^/]+/events/[0-9]+'
   or lower(url_normalized) ~ 'segmentfault\.com/e/[0-9]+';

create table if not exists "aiEvents_city_sources" (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references "aiEvents_cities"(id) on delete cascade,
  city_key text not null,
  source_id uuid not null references "aiEvents_sources"(id) on delete cascade,
  source_url text not null,
  source_url_normalized text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'needs_review', 'archived')),
  crawl_frequency_minutes integer not null default 720,
  priority integer not null default 50,
  last_success_at timestamptz,
  last_checked_at timestamptz,
  consecutive_failures integer not null default 0,
  raw_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_key, source_url_normalized)
);

alter table "aiEvents_city_sources" add column if not exists city_id uuid references "aiEvents_cities"(id) on delete cascade;
alter table "aiEvents_city_sources" add column if not exists city_key text;
alter table "aiEvents_city_sources" add column if not exists source_id uuid references "aiEvents_sources"(id) on delete cascade;
alter table "aiEvents_city_sources" add column if not exists source_url text;
alter table "aiEvents_city_sources" add column if not exists source_url_normalized text;
alter table "aiEvents_city_sources" add column if not exists status text not null default 'active';
alter table "aiEvents_city_sources" add column if not exists crawl_frequency_minutes integer not null default 720;
alter table "aiEvents_city_sources" add column if not exists priority integer not null default 50;
alter table "aiEvents_city_sources" add column if not exists last_success_at timestamptz;
alter table "aiEvents_city_sources" add column if not exists last_checked_at timestamptz;
alter table "aiEvents_city_sources" add column if not exists consecutive_failures integer not null default 0;
alter table "aiEvents_city_sources" add column if not exists raw_config jsonb not null default '{}'::jsonb;
alter table "aiEvents_city_sources" add column if not exists created_at timestamptz not null default now();
alter table "aiEvents_city_sources" add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'aiEvents_sources' and column_name = 'city_key'
  ) then
    insert into "aiEvents_sources" (source_key, source_type, url, url_normalized, url_template, fetch_method, source_scope, relevance_level, status, raw_config)
    select distinct on (legacy.source_type)
           legacy.source_type,
           legacy.source_type,
           legacy.url,
           legacy.url_normalized,
           legacy.url,
           legacy.fetch_method,
           case when legacy.source_scope = 'single_event' then 'unknown' else legacy.source_scope end,
           case when legacy.relevance_level = 'event' then 'unknown' else legacy.relevance_level end,
           'active',
           '{}'::jsonb
    from "aiEvents_sources" legacy
    where legacy.city_key is not null
      and legacy.source_scope <> 'single_event'
      and not exists (
        select 1 from "aiEvents_sources" generic
        where generic.source_key = legacy.source_type
      )
    order by legacy.source_type, legacy.priority desc nulls last, legacy.created_at asc;

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
      and legacy.source_scope <> 'single_event'
    on conflict (city_key, source_url_normalized) do update set
      source_id = excluded.source_id,
      city_id = excluded.city_id,
      status = excluded.status,
      crawl_frequency_minutes = excluded.crawl_frequency_minutes,
      priority = excluded.priority,
      raw_config = excluded.raw_config,
      updated_at = now();

    update "aiEvents_raw" r
    set source_id = cs.source_id
    from "aiEvents_city_sources" cs
    join "aiEvents_sources" generic on generic.id = cs.source_id
    where r.city_key = cs.city_key
      and r.source_type = generic.source_type;

    delete from "aiEvents_sources"
    where city_key is not null
       or source_scope = 'single_event';
  end if;
end $$;

update "aiEvents_sources"
set source_key = coalesce(source_key, source_type),
    url_template = coalesce(url_template, url),
    url_normalized = coalesce(url_normalized, url),
    updated_at = now()
where source_key is null
   or url_template is null
   or url_normalized is null;

with canonical(source_type, source_key, url, url_template, source_scope, relevance_level, fetch_method) as (
  values
    ('huodongxing_city', 'huodongxing_city', 'https://www.huodongxing.com/events', 'https://www.huodongxing.com/events?orderby=o&d=t5&tag=AI&city={{city_name}}', 'city_ai', 'strong', 'html_list'),
    ('eventbrite_city_search', 'eventbrite_city_search', 'https://www.eventbrite.com/', 'https://www.eventbrite.com/d/{{city_slug}}/ai/', 'city_ai', 'strong', 'html_list'),
    ('luma_city', 'luma_city', 'https://luma.com/', 'https://luma.com/{{city_slug}}', 'city_only', 'city_only', 'html_list'),
    ('meetup_city_search', 'meetup_city_search', 'https://www.meetup.com/find/', 'https://www.meetup.com/find/?location={{meetup_location}}&source=EVENTS&categoryId=546', 'city_tech', 'weak', 'html_list'),
    ('segmentfault_events', 'segmentfault_events', 'https://segmentfault.com/events', 'https://segmentfault.com/events?city={{segmentfault_city_id}}', 'city_tech', 'weak', 'html_list'),
    ('lianpu_city', 'lianpu_city', 'https://lianpu.com/', 'https://lianpu.com/city/{{city_slug}}', 'city_tech', 'weak', 'html_list'),
    ('volcengine_activities', 'volcengine_activities', 'https://developer.volcengine.com/activities', 'https://developer.volcengine.com/activities', 'ai_global', 'strong', 'html_list'),
    ('tencent_cloud_salon_list', 'tencent_cloud_salon_list', 'https://cloud.tencent.com/developer/salon/activities', 'https://cloud.tencent.com/developer/salon/activities?topic=2212', 'ai_global', 'strong', 'html_list')
)
update "aiEvents_sources" s
set source_key = canonical.source_key,
    url = canonical.url,
    url_normalized = canonical.url,
    url_template = canonical.url_template,
    source_scope = canonical.source_scope,
    relevance_level = canonical.relevance_level,
    fetch_method = canonical.fetch_method,
    updated_at = now()
from canonical
where s.source_type = canonical.source_type;

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
  and ranked_sources.rank > 1;

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
  and ranked_sources.rank > 1;

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
  and ranked_sources.rank > 1;

with allowed_sources(source_key) as (
  values
    ('huodongxing_city'),
    ('eventbrite_city_search'),
    ('luma_city'),
    ('meetup_city_search'),
    ('segmentfault_events'),
    ('lianpu_city'),
    ('volcengine_activities'),
    ('tencent_cloud_salon_list')
)
delete from "aiEvents_city_sources" cs
using "aiEvents_sources" s
where cs.source_id = s.id
  and (
    coalesce(s.source_key, s.source_type) not in (select source_key from allowed_sources)
    or s.fetch_method = 'html_detail'
    or s.source_type like '%\_detail' escape '\'
  );

with allowed_sources(source_key) as (
  values
    ('huodongxing_city'),
    ('eventbrite_city_search'),
    ('luma_city'),
    ('meetup_city_search'),
    ('segmentfault_events'),
    ('lianpu_city'),
    ('volcengine_activities'),
    ('tencent_cloud_salon_list')
)
delete from "aiEvents_sources" s
where (
    coalesce(s.source_key, s.source_type) not in (select source_key from allowed_sources)
    or s.fetch_method = 'html_detail'
    or s.source_type like '%\_detail' escape '\'
  )
  and not exists (
    select 1
    from "aiEvents_city_sources" cs
    where cs.source_id = s.id
  );

delete from "aiEvents_city_sources" cs
using "aiEvents_sources" s
where cs.source_id = s.id
  and position('{{' in coalesce(s.url_template, '')) > 0
  and (
    cs.source_url = s.url
    or cs.source_url_normalized = s.url_normalized
    or lower(regexp_replace(coalesce(cs.source_url_normalized, ''), '/+$', '')) =
       lower(regexp_replace(coalesce(s.url_normalized, ''), '/+$', ''))
  );

alter table "aiEvents_sources" drop constraint if exists "aiEvents_sources_url_normalized_key";
alter table "aiEvents_sources" drop constraint if exists "aiEvents_sources_city_key_url_normalized_key";
drop index if exists "aiEvents_sources_city_url_idx";

alter table "aiEvents_sources" drop column if exists city;
alter table "aiEvents_sources" drop column if exists city_id;
alter table "aiEvents_sources" drop column if exists city_key;
alter table "aiEvents_sources" drop column if exists source_kind;
alter table "aiEvents_sources" drop column if exists crawl_frequency_minutes;
alter table "aiEvents_sources" drop column if exists priority;
alter table "aiEvents_sources" drop column if exists last_success_at;
alter table "aiEvents_sources" drop column if exists last_checked_at;
alter table "aiEvents_sources" drop column if exists consecutive_failures;

alter table "aiEvents_sources" alter column source_key set not null;
alter table "aiEvents_sources" alter column source_type set not null;
alter table "aiEvents_sources" alter column url set not null;
alter table "aiEvents_sources" alter column url_normalized set not null;
alter table "aiEvents_sources" alter column url_template set not null;
create unique index if not exists "aiEvents_sources_source_key_idx" on "aiEvents_sources" (source_key);
create unique index if not exists "aiEvents_city_sources_city_url_idx" on "aiEvents_city_sources" (city_key, source_url_normalized);

create table if not exists "aiEvents_crawl_runs" (
  id uuid primary key default gen_random_uuid(),
  city_id uuid references "aiEvents_cities"(id) on delete set null,
  city_key text,
  city text not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  sources_checked integer not null default 0,
  raw_items_found integer not null default 0,
  events_normalized integer not null default 0,
  error_message text,
  raw_summary jsonb not null default '{}'::jsonb
);

alter table "aiEvents_crawl_runs" add column if not exists city_id uuid references "aiEvents_cities"(id) on delete set null;
alter table "aiEvents_crawl_runs" add column if not exists city_key text;

create table if not exists "aiEvents_raw" (
  id uuid primary key default gen_random_uuid(),
  crawl_run_id uuid references "aiEvents_crawl_runs"(id) on delete set null,
  source_id uuid references "aiEvents_sources"(id) on delete set null,
  city_id uuid references "aiEvents_cities"(id) on delete set null,
  city_key text,
  city text not null,
  source_type text not null,
  source_url text not null,
  source_url_normalized text not null,
  fetched_url text not null,
  content_type text,
  raw_title text,
  raw_text text,
  raw_payload jsonb not null default '{}'::jsonb,
  processing_status text not null default 'pending' check (processing_status in ('pending', 'processed', 'failed', 'ignored')),
  processing_error text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source_url_normalized, city)
);

alter table "aiEvents_raw" add column if not exists city_id uuid references "aiEvents_cities"(id) on delete set null;
alter table "aiEvents_raw" add column if not exists city_key text;

create table if not exists "aiEvents_events" (
  id uuid primary key default gen_random_uuid(),
  raw_id uuid references "aiEvents_raw"(id) on delete set null,
  city_id uuid references "aiEvents_cities"(id) on delete set null,
  city_key text,
  city text,
  title text not null,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  timezone text not null default 'Asia/Shanghai',
  venue text,
  address text,
  online_url text,
  organizer text,
  speakers text[] not null default '{}',
  tags text[] not null default '{}',
  price text,
  source_url text not null,
  source_url_normalized text not null,
  event_url text,
  confidence_score numeric(5,2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'needs_review', 'archived')),
  provider_model text,
  normalized_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_url_normalized)
);

alter table "aiEvents_events" add column if not exists city_id uuid references "aiEvents_cities"(id) on delete set null;
alter table "aiEvents_events" add column if not exists city_key text;
alter table "aiEvents_events" add column if not exists provider_model text;
alter table "aiEvents_events" add column if not exists tags text[] not null default '{}';

create index if not exists "aiEvents_cities_active_idx" on "aiEvents_cities" (is_active, country_code, city_key);
create index if not exists "aiEvents_sources_status_idx" on "aiEvents_sources" (status, source_type);
create index if not exists "aiEvents_sources_scope_idx" on "aiEvents_sources" (source_scope, relevance_level);
create index if not exists "aiEvents_city_sources_status_idx" on "aiEvents_city_sources" (status, city_key, priority desc);
create index if not exists "aiEvents_city_sources_city_key_idx" on "aiEvents_city_sources" (city_key, status, priority desc);
create index if not exists "aiEvents_raw_status_idx" on "aiEvents_raw" (processing_status, city, fetched_at desc);
create index if not exists "aiEvents_raw_city_key_idx" on "aiEvents_raw" (city_key, processing_status, fetched_at desc);
create index if not exists "aiEvents_events_time_city_idx" on "aiEvents_events" (start_time, city);
create index if not exists "aiEvents_events_city_key_idx" on "aiEvents_events" (city_key, status, start_time);
create index if not exists "aiEvents_events_status_idx" on "aiEvents_events" (status, start_time);
create index if not exists "aiEvents_events_tags_idx" on "aiEvents_events" using gin (tags);
