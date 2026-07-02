create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists gaokao_source_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('official_policy', 'enrollment_plan', 'admission_record', 'institution_site', 'major_catalog', 'charter', 'other')),
  province text,
  year integer,
  institution_id uuid,
  title text not null,
  publisher text,
  url text,
  file_url text,
  file_hash text,
  published_at date,
  fetched_at timestamptz default now(),
  parse_status text not null default 'pending' check (parse_status in ('pending', 'parsed', 'failed', 'verified')),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gaokao_document_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references gaokao_source_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (source_id, chunk_index)
);

create table if not exists gaokao_province_rules (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  year integer not null,
  batch text not null,
  candidate_track text not null default 'general',
  volunteer_mode text not null,
  volunteer_count integer,
  majors_per_volunteer integer,
  has_major_adjustment boolean,
  batch_settings jsonb not null default '{}'::jsonb,
  filing_rules jsonb not null default '{}'::jsonb,
  withdrawal_rules jsonb not null default '{}'::jsonb,
  subject_rules jsonb not null default '{}'::jsonb,
  special_type_rules jsonb not null default '{}'::jsonb,
  source_id uuid references gaokao_source_documents(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (province, year, batch, candidate_track)
);

create table if not exists gaokao_subject_requirement_rules (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  year integer not null,
  degree_level text not null default 'undergraduate',
  rule_scope text not null default 'major' check (rule_scope in ('province', 'institution', 'major_group', 'major')),
  institution_code text,
  major_group_code text,
  major_code text,
  major_name text,
  required_subjects text[] not null default '{}',
  optional_subjects text[] not null default '{}',
  requirement_text text,
  compatibility_notes jsonb not null default '{}'::jsonb,
  source_id uuid references gaokao_source_documents(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gaokao_institutions (
  id uuid primary key default gen_random_uuid(),
  ministry_code text,
  local_code text,
  name text not null,
  former_names text[] not null default '{}',
  province text,
  city text,
  district text,
  ownership text,
  education_level text,
  institution_type text,
  is_985 boolean not null default false,
  is_211 boolean not null default false,
  is_double_first_class boolean not null default false,
  is_public boolean,
  is_private boolean,
  is_independent_college boolean not null default false,
  tags text[] not null default '{}',
  strengths jsonb not null default '{}'::jsonb,
  website text,
  source_id uuid references gaokao_source_documents(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, province, city)
);

create table if not exists gaokao_majors (
  id uuid primary key default gen_random_uuid(),
  major_code text not null,
  name text not null,
  degree_level text not null default 'undergraduate',
  discipline_category text,
  major_class text,
  standard_duration_years numeric(3,1),
  degree_type text,
  tags text[] not null default '{}',
  source_id uuid references gaokao_source_documents(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (major_code, degree_level)
);

create table if not exists gaokao_institution_major_profiles (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references gaokao_institutions(id) on delete cascade,
  major_id uuid references gaokao_majors(id),
  major_name text not null,
  campus text,
  duration_years numeric(3,1),
  tuition_cny integer,
  subject_requirements text[] not null default '{}',
  special_flags text[] not null default '{}',
  is_sino_foreign boolean not null default false,
  is_school_enterprise boolean not null default false,
  is_normal_education boolean not null default false,
  is_medical boolean not null default false,
  is_nursing boolean not null default false,
  is_directional boolean not null default false,
  profile jsonb not null default '{}'::jsonb,
  source_id uuid references gaokao_source_documents(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, major_name, campus)
);

create table if not exists gaokao_enrollment_plans (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  year integer not null,
  batch text not null,
  candidate_track text not null,
  subject_combo text,
  institution_id uuid not null references gaokao_institutions(id),
  institution_code text,
  major_group_code text,
  major_id uuid references gaokao_majors(id),
  major_code text,
  major_name text not null,
  planned_count integer not null,
  tuition_cny integer,
  duration_years numeric(3,1),
  campus text,
  subject_requirements text[] not null default '{}',
  language_requirement text,
  physical_exam_requirement text,
  single_subject_requirement jsonb not null default '{}'::jsonb,
  special_flags text[] not null default '{}',
  source_id uuid references gaokao_source_documents(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gaokao_admission_records (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  year integer not null,
  batch text not null,
  candidate_track text not null,
  subject_combo text,
  institution_id uuid not null references gaokao_institutions(id),
  institution_code text,
  major_group_code text,
  major_id uuid references gaokao_majors(id),
  major_code text,
  major_name text,
  min_score integer,
  min_rank integer,
  avg_score numeric(6,2),
  avg_rank integer,
  max_score integer,
  max_rank integer,
  planned_count integer,
  admitted_count integer,
  collection_volunteer boolean not null default false,
  record_level text not null default 'major' check (record_level in ('institution', 'major_group', 'major')),
  source_id uuid references gaokao_source_documents(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gaokao_score_rank_segments (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  year integer not null,
  candidate_track text not null,
  subject_combo text,
  score integer not null,
  same_score_count integer,
  cumulative_count integer,
  min_rank integer,
  max_rank integer,
  source_id uuid references gaokao_source_documents(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (province, year, candidate_track, subject_combo, score)
);

create table if not exists gaokao_candidate_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text,
  province text not null,
  exam_year integer not null,
  candidate_track text not null,
  subject_combo text,
  total_score integer,
  province_rank integer,
  subject_scores jsonb not null default '{}'::jsonb,
  policy_bonus integer not null default 0,
  application_type text not null default 'ordinary',
  target_batch text,
  profile_status text not null default 'collecting' check (profile_status in ('collecting', 'ready', 'archived')),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gaokao_candidate_preferences (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references gaokao_candidate_profiles(id) on delete cascade,
  preferred_provinces text[] not null default '{}',
  preferred_cities text[] not null default '{}',
  excluded_regions text[] not null default '{}',
  preferred_major_directions text[] not null default '{}',
  excluded_majors text[] not null default '{}',
  priority_school integer not null default 3 check (priority_school between 1 and 5),
  priority_major integer not null default 3 check (priority_major between 1 and 5),
  priority_city integer not null default 3 check (priority_city between 1 and 5),
  priority_employment integer not null default 3 check (priority_employment between 1 and 5),
  accepts_sino_foreign boolean,
  accepts_private boolean,
  accepts_vocational boolean,
  accepts_major_adjustment boolean,
  annual_budget_cny integer,
  risk_preference text not null default 'balanced' check (risk_preference in ('aggressive', 'balanced', 'conservative')),
  rush_ratio numeric(4,3),
  stable_ratio numeric(4,3),
  safe_ratio numeric(4,3),
  long_term_goals text[] not null default '{}',
  personality_profile jsonb not null default '{}'::jsonb,
  subject_aversions text[] not null default '{}',
  family_resources jsonb not null default '{}'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id)
);

create table if not exists gaokao_candidate_interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references gaokao_candidate_profiles(id) on delete cascade,
  session_id text,
  messages jsonb not null default '[]'::jsonb,
  extracted_facts jsonb not null default '{}'::jsonb,
  missing_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gaokao_recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references gaokao_candidate_profiles(id) on delete cascade,
  algorithm_version text not null,
  data_years integer[] not null default '{}',
  input_snapshot jsonb not null,
  strategy jsonb not null default '{}'::jsonb,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists gaokao_recommendation_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references gaokao_recommendation_runs(id) on delete cascade,
  candidate_id uuid not null references gaokao_candidate_profiles(id) on delete cascade,
  item_order integer not null,
  risk_band text not null check (risk_band in ('rush', 'stable', 'safe', 'fallback')),
  institution_id uuid not null references gaokao_institutions(id),
  plan_id uuid references gaokao_enrollment_plans(id),
  major_group_code text,
  major_id uuid references gaokao_majors(id),
  major_name text,
  admit_probability_min numeric(5,4),
  admit_probability_max numeric(5,4),
  rank_gap integer,
  plan_change_ratio numeric(8,4),
  adjustment_risk text,
  withdrawal_risk text,
  major_group_risk text,
  recommendation_reason jsonb not null default '{}'::jsonb,
  risk_notes jsonb not null default '[]'::jsonb,
  alternatives jsonb not null default '[]'::jsonb,
  parent_explanation text,
  student_explanation text,
  created_at timestamptz not null default now(),
  unique (run_id, item_order)
);

create index if not exists idx_gaokao_documents_lookup
  on gaokao_source_documents (source_type, province, year);

create index if not exists idx_gaokao_chunks_source
  on gaokao_document_chunks (source_id, chunk_index);

create index if not exists idx_gaokao_rules_province_year
  on gaokao_province_rules (province, year, batch, candidate_track);

create index if not exists idx_gaokao_subject_rules_lookup
  on gaokao_subject_requirement_rules (province, year, institution_code, major_group_code, major_code);

create index if not exists idx_gaokao_subject_rules_required
  on gaokao_subject_requirement_rules using gin (required_subjects);

create index if not exists idx_gaokao_institutions_region
  on gaokao_institutions (province, city);

create index if not exists idx_gaokao_institutions_tags
  on gaokao_institutions using gin (tags);

create index if not exists idx_gaokao_majors_catalog
  on gaokao_majors (discipline_category, major_class, name);

create index if not exists idx_gaokao_plans_filter
  on gaokao_enrollment_plans (province, year, batch, candidate_track, institution_id);

create index if not exists idx_gaokao_plans_subjects
  on gaokao_enrollment_plans using gin (subject_requirements);

create index if not exists idx_gaokao_admission_rank
  on gaokao_admission_records (province, year, batch, candidate_track, min_rank);

create index if not exists idx_gaokao_admission_institution
  on gaokao_admission_records (institution_id, province, year);

create index if not exists idx_gaokao_score_rank_lookup
  on gaokao_score_rank_segments (province, year, candidate_track, subject_combo, score);

create index if not exists idx_gaokao_candidate_lookup
  on gaokao_candidate_profiles (province, exam_year, candidate_track, province_rank);

create index if not exists idx_gaokao_recommendation_items_run
  on gaokao_recommendation_items (run_id, item_order);

-- Enable this after embeddings are populated. Supabase supports ivfflat for pgvector.
-- create index if not exists idx_gaokao_chunks_embedding
--   on gaokao_document_chunks using ivfflat (embedding vector_cosine_ops)
--   with (lists = 100);
