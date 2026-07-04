import { loadLocalEnv } from '../gaokao/lib/env.mjs';
import { withDb } from '../gaokao/lib/db.mjs';

loadLocalEnv();

const schemaSql = `
create table if not exists worldcup_sources (
  id text primary key,
  source_type text not null,
  source_name text not null,
  source_url text,
  publisher text,
  fetched_at timestamptz,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists worldcup_teams (
  id text primary key,
  fifa_code text,
  iso2 text,
  iso3 text,
  name_en text not null,
  name_zh text,
  confederation text,
  is_host boolean not null default false,
  source_id text references worldcup_sources(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists worldcup_venues (
  id text primary key,
  name text,
  city text,
  country text,
  timezone text,
  capacity integer,
  latitude double precision,
  longitude double precision,
  source_id text references worldcup_sources(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists worldcup_matches (
  id text primary key,
  tournament text not null,
  season integer not null,
  stage text not null,
  round text,
  kickoff_utc timestamptz,
  kickoff_local text,
  timezone text,
  venue_id text references worldcup_venues(id),
  city text,
  home_team_id text references worldcup_teams(id),
  away_team_id text references worldcup_teams(id),
  home_source_rule text,
  away_source_rule text,
  home_source_match_id text references worldcup_matches(id),
  away_source_match_id text references worldcup_matches(id),
  home_score_90 integer,
  away_score_90 integer,
  home_score_extra integer,
  away_score_extra integer,
  home_penalties integer,
  away_penalties integer,
  winner_team_id text references worldcup_teams(id),
  status text not null,
  source_id text references worldcup_sources(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists worldcup_team_rankings (
  id text primary key,
  team_id text references worldcup_teams(id),
  ranking_type text not null,
  ranking_date date,
  rank integer,
  rating double precision,
  previous_rank integer,
  source_id text references worldcup_sources(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists worldcup_team_form (
  id text primary key,
  team_id text references worldcup_teams(id),
  opponent_team_id text references worldcup_teams(id),
  opponent_name_raw text,
  match_date date,
  competition text,
  is_neutral boolean,
  is_home boolean,
  goals_for integer,
  goals_against integer,
  result text,
  opponent_elo double precision,
  source_id text references worldcup_sources(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists worldcup_data_gaps (
  id text primary key,
  match_id text references worldcup_matches(id),
  team_id text references worldcup_teams(id),
  field_name text not null,
  priority text not null,
  reason text,
  suggested_source text,
  status text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

create table if not exists worldcup_odds_snapshots (
  id text primary key,
  match_id text references worldcup_matches(id),
  bookmaker text not null,
  market text not null,
  selection text not null,
  decimal_odds double precision not null,
  snapshot_time timestamptz not null,
  source_id text references worldcup_sources(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists worldcup_market_odds_snapshots (
  id text primary key,
  match_id text references worldcup_matches(id),
  provider_event_id text,
  bookmaker_key text,
  bookmaker_title text,
  market_key text not null,
  market_title text,
  home_odds double precision,
  draw_odds double precision,
  away_odds double precision,
  handicap_line double precision,
  total_line double precision,
  last_update timestamptz,
  snapshot_time timestamptz not null,
  source_id text references worldcup_sources(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists worldcup_weather_snapshots (
  id text primary key,
  match_id text references worldcup_matches(id),
  venue_id text references worldcup_venues(id),
  forecast_time timestamptz,
  snapshot_time timestamptz not null,
  temperature_c double precision,
  apparent_temperature_c double precision,
  humidity_pct double precision,
  precipitation_probability_pct double precision,
  precipitation_mm double precision,
  wind_speed_kmh double precision,
  wind_gusts_kmh double precision,
  weather_code integer,
  source_id text references worldcup_sources(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists worldcup_score_analyses (
  match_id text primary key references worldcup_matches(id),
  status text not null,
  model text,
  predicted_score text,
  score_probabilities jsonb not null default '[]'::jsonb,
  summary_zh text,
  reasoning_md text,
  basis jsonb not null default '{}'::jsonb,
  input_fingerprint text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists worldcup_availability_reports (
  id text primary key,
  match_id text references worldcup_matches(id),
  team_id text references worldcup_teams(id),
  player_name text not null,
  report_type text not null,
  status text not null,
  impact_level text,
  reported_at timestamptz,
  source_id text references worldcup_sources(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
`;

await withDb(async pool => {
  console.log("Creating worldcup tables...");
  await pool.query(schemaSql);
  console.log("Schema creation complete.");
});
