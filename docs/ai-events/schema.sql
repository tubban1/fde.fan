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
  city_id uuid references "aiEvents_cities"(id) on delete set null,
  city_key text not null,
  source_type text not null,
  url text not null,
  url_normalized text not null,
  fetch_method text not null default 'html_list',
  status text not null default 'active' check (status in ('active', 'paused', 'needs_review', 'archived')),
  crawl_frequency_minutes integer not null default 720,
  priority integer not null default 50,
  last_success_at timestamptz,
  last_checked_at timestamptz,
  consecutive_failures integer not null default 0,
  raw_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_key, url_normalized)
);

alter table "aiEvents_sources" add column if not exists city_id uuid references "aiEvents_cities"(id) on delete set null;
alter table "aiEvents_sources" add column if not exists city_key text;
update "aiEvents_sources" s
set city_key = c.city_key
from "aiEvents_cities" c
where s.city_key is null
  and s.city_id = c.id;
do $$
begin
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
delete from "aiEvents_sources" where city_key is null;
alter table "aiEvents_sources" alter column city_key set not null;
alter table "aiEvents_sources" drop column if exists city;

alter table "aiEvents_sources" drop constraint if exists "aiEvents_sources_url_normalized_key";
create unique index if not exists "aiEvents_sources_city_url_idx" on "aiEvents_sources" (city_key, url_normalized);

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
create index if not exists "aiEvents_sources_status_idx" on "aiEvents_sources" (status, city_key, priority desc);
create index if not exists "aiEvents_sources_city_key_idx" on "aiEvents_sources" (city_key, status, priority desc);
create index if not exists "aiEvents_raw_status_idx" on "aiEvents_raw" (processing_status, city, fetched_at desc);
create index if not exists "aiEvents_raw_city_key_idx" on "aiEvents_raw" (city_key, processing_status, fetched_at desc);
create index if not exists "aiEvents_events_time_city_idx" on "aiEvents_events" (start_time, city);
create index if not exists "aiEvents_events_city_key_idx" on "aiEvents_events" (city_key, status, start_time);
create index if not exists "aiEvents_events_status_idx" on "aiEvents_events" (status, start_time);
create index if not exists "aiEvents_events_tags_idx" on "aiEvents_events" using gin (tags);
