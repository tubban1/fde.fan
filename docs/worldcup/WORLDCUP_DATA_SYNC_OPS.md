# World Cup Data Sync Ops

## Purpose

Keep World Cup match data, rankings, recent form, and data gaps updated in Supabase until the tournament ends.

## Commands

Single run:

```bash
npm run worldcup:sync
```

Daemon mode for Docker/HuggingFace:

```bash
npm run worldcup:sync:daemon
```

HuggingFace Worker Space:

Use the root `Dockerfile`. The container starts the daemon automatically and exposes a health endpoint on port `7860`:

```text
/
/healthz
```

The worker Space does not need Vercel, Python, or the prediction API. It only writes to Supabase and records every run in `worldcup_ingestion_runs`.

## Environment

Required:

```bash
SUPABASE_DB_URL=postgresql://...
```

Optional:

```bash
WORLDCUP_SYNC_INTERVAL_MINUTES=30
WORLDCUP_SYNC_UNTIL=2026-07-20T00:00:00Z
ADMIN_ACCESS_TOKEN=your-admin-token
ODDS_API=your-the-odds-api-key
THE_ODDS_SPORT_KEYS=soccer_fifa_world_cup
THE_ODDS_MARKETS=h2h
THE_ODDS_REGIONS=us,uk,eu
```

`ODDS_API` belongs in the HuggingFace data worker Space only. Do not put it in Vercel or any `PUBLIC_*` frontend environment variable.

## Data Sources

- `openfootball/worldcup.json` for schedule and results.
- FIFA ranking endpoint for latest FIFA rankings.
- `martj42/international_results` for recent international form.

## Logging

Every run writes to:

```sql
worldcup_ingestion_runs
```

Useful query:

```sql
select
  id,
  status,
  started_at,
  finished_at,
  records_fetched,
  records_upserted,
  error_message
from worldcup_ingestion_runs
order by started_at desc
limit 20;
```

## Admin Protection

`/admin/*`, `/api/worldcup/gaps`, and `/api/worldcup/manual-features` are protected by `ADMIN_ACCESS_TOKEN` in production.

Open the admin page with:

```text
https://www.fde.fan/admin/worldcup/gaps?admin_token=YOUR_TOKEN
```

The token is stored as an HttpOnly cookie for same-origin admin API calls.
