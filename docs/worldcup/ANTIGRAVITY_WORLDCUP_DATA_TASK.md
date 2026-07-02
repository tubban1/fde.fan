# Antigravity 任务书：世界杯预测数据收集、清洗与导入

任务目标：为世界杯预测智能体建立第一版可用数据底座。先完成“稳定公开数据 + 可手动补充实时数据”的闭环，不要求一开始接完整商业 API。

## 1. 工作范围

请优先完成以下数据：

1. 2026 世界杯赛程与赛果。
2. 参赛球队标准化清单。
3. 球场、城市、时区。
4. FIFA 排名快照。
5. Elo 排名快照。
6. 国家队近 20 场比赛结果。
7. 本届世界杯小组赛表现。
8. 淘汰赛对阵和晋级关系。
9. 赔率、伤停、预计首发的数据缺口模板。

不要先做复杂模型。先把数据打干净。

## 2. 建议数据源

### 2.1 官方与高可信来源

- FIFA 官方比赛中心：赛程、赛果、球场、阶段。
- FIFA Rankings：FIFA 排名。
- World Football Elo Ratings：Elo 分数。
- football-data / footballcsv / worldfootballR：历史国家队比赛结果。
- Open-Meteo 或 OpenWeather：比赛城市天气。

### 2.2 可选 API

- API-Football：赛程、赛果、阵容、部分技术统计。
- SportMonks：球队、阵容、伤停、统计。
- The Odds API：多平台赔率快照。
- OddsPortal 或公开赔率页：只作为手动核验来源，不建议重度网页抓取。

### 2.3 用户补充来源

用于 MVP 中实时数据不稳定的字段：

- 最新胜平负赔率
- 晋级赔率
- 伤病/停赛
- 预计首发
- 黄牌累计
- 赛前天气备注

用户补充数据必须带来源描述，例如：

```text
source_type: user_supplied
source_name: "用户手动录入 / Bet365 截图"
source_url: null
confidence: medium
submitted_at: 2026-07-01T18:30:00Z
```

## 3. 目录结构

请创建或使用以下目录：

```text
data/worldcup/
  source-registry.json
  raw/
    fifa/
    rankings/
    elo/
    historical-results/
    odds/
    weather/
    user-submissions/
  processed/
    teams.normalized.csv
    venues.normalized.csv
    matches.normalized.csv
    rankings.normalized.csv
    recent_form.normalized.csv
    group_stage_team_stats.normalized.csv
    data_gaps.normalized.csv
  import/
    001_sources.csv
    002_teams.csv
    003_venues.csv
    004_matches.csv
    005_team_rankings.csv
    006_team_form.csv
    007_group_stage_stats.csv
    008_data_gaps.csv
```

## 4. 标准字段

### 4.1 `teams.normalized.csv`

必填字段：

```text
team_id
fifa_code
iso2
iso3
name_en
name_zh
confederation
is_host
source_name
source_url
fetched_at
raw_data
```

命名规则：

- `team_id` 使用小写短横线，例如 `england`、`dr-congo`、`united-states`。
- `name_en` 使用 FIFA 或主来源标准英文名。
- `name_zh` 只用于展示，不参与匹配。

### 4.2 `venues.normalized.csv`

必填字段：

```text
venue_id
name
city
country
timezone
capacity
latitude
longitude
source_name
source_url
fetched_at
raw_data
```

### 4.3 `matches.normalized.csv`

必填字段：

```text
match_id
tournament
season
stage
round
kickoff_utc
kickoff_local
timezone
venue_id
city
home_team_id
away_team_id
home_score_90
away_score_90
home_score_extra
away_score_extra
home_penalties
away_penalties
winner_team_id
status
source_name
source_url
fetched_at
raw_data
```

规则：

- `status` 只能是 `scheduled`、`live`、`finished`、`postponed`、`cancelled`。
- 未开赛比分字段留空，不要填 0。
- 淘汰赛点球胜负必须写入 `home_penalties` / `away_penalties`。
- `winner_team_id` 只在 `finished` 且能确定胜者时填写。

### 4.4 `rankings.normalized.csv`

必填字段：

```text
ranking_id
team_id
ranking_type
ranking_date
rank
rating
previous_rank
source_name
source_url
fetched_at
raw_data
```

规则：

- `ranking_type` 只能是 `fifa` 或 `elo`。
- FIFA 排名可以没有 `rating`，Elo 必须有 `rating`。

### 4.5 `recent_form.normalized.csv`

一行代表一支球队在一场历史比赛中的结果。

必填字段：

```text
form_match_id
team_id
opponent_team_id
match_date
competition
is_neutral
is_home
goals_for
goals_against
result
opponent_elo
source_name
source_url
fetched_at
raw_data
```

规则：

- `result` 只能是 `W`、`D`、`L`。
- 每队至少收集近 20 场；如果不足，写入实际场数并在 `data_gaps` 标记。

### 4.6 `data_gaps.normalized.csv`

一行代表一个待补充数据缺口。

必填字段：

```text
gap_id
match_id
team_id
field_name
priority
reason
suggested_source
status
created_at
resolved_at
resolved_by
```

规则：

- `priority` 只能是 `critical`、`high`、`medium`、`low`。
- `status` 只能是 `open`、`filled`、`ignored`。
- 赛前 24 小时内缺赔率、伤停、预计首发，至少标记为 `high`。

## 5. 清洗规则

### 5.1 球队名称

建立别名表，不要在业务脚本里到处写 if。

示例：

```json
{
  "United States": "united-states",
  "USA": "united-states",
  "U.S.": "united-states",
  "DR Congo": "dr-congo",
  "Congo DR": "dr-congo",
  "Korea Republic": "south-korea"
}
```

### 5.2 比赛时间

- 所有预测和导入使用 UTC。
- 展示层再转本地时区。
- 原始页面时间保留在 `raw_data`。

### 5.3 比分

- 常规时间比分写入 `home_score_90` / `away_score_90`。
- 加时后总比分写入 `home_score_extra` / `away_score_extra`。
- 点球写入 `home_penalties` / `away_penalties`。
- 不要把点球计入进球数。

### 5.4 赔率

赔率先用手动 CSV 支持，后续再接 API。

标准字段：

```text
odds_id
match_id
bookmaker
market
selection
decimal_odds
snapshot_time
source_name
source_url
fetched_at
raw_data
```

规则：

- `market` 第一版只支持 `1x2` 和 `advance`。
- `decimal_odds` 必须大于 1。
- 同一 `match_id + bookmaker + market + selection + snapshot_time` 不得重复。

### 5.5 伤停与预计首发

标准字段：

```text
report_id
match_id
team_id
player_name
report_type
status
impact_level
source_name
source_url
reported_at
fetched_at
raw_data
```

规则：

- `report_type` 可为 `injury`、`suspension`、`lineup_expected`、`lineup_confirmed`。
- `impact_level` 可为 `starter`、`rotation`、`depth`、`unknown`。
- 新闻来源只写摘要，不要整段复制原文。

## 6. 导入方案

第一步只需要把清洗后的 CSV 准备好。导入脚本可参考高考模块的 `scripts/gaokao/import-csv.mjs` 模式。

建议新增：

```text
scripts/worldcup/import-csv.mjs
scripts/worldcup/run-schema.mjs
scripts/worldcup/audit-coverage.mjs
```

导入命令设计：

```bash
node scripts/worldcup/import-csv.mjs --table=sources --file=data/worldcup/import/001_sources.csv
node scripts/worldcup/import-csv.mjs --table=teams --file=data/worldcup/import/002_teams.csv
node scripts/worldcup/import-csv.mjs --table=venues --file=data/worldcup/import/003_venues.csv
node scripts/worldcup/import-csv.mjs --table=matches --file=data/worldcup/import/004_matches.csv
node scripts/worldcup/import-csv.mjs --table=rankings --file=data/worldcup/import/005_team_rankings.csv
node scripts/worldcup/import-csv.mjs --table=recent_form --file=data/worldcup/import/006_team_form.csv
node scripts/worldcup/import-csv.mjs --table=data_gaps --file=data/worldcup/import/008_data_gaps.csv
```

入库前检查：

```bash
node scripts/worldcup/audit-coverage.mjs --input=data/worldcup/import
```

## 7. 数据库建议

先建最小表：

```sql
create table if not exists worldcup_sources (
  id uuid primary key default gen_random_uuid(),
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
  source_id uuid references worldcup_sources(id),
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
  venue_id text,
  city text,
  home_team_id text references worldcup_teams(id),
  away_team_id text references worldcup_teams(id),
  home_score_90 integer,
  away_score_90 integer,
  home_score_extra integer,
  away_score_extra integer,
  home_penalties integer,
  away_penalties integer,
  winner_team_id text references worldcup_teams(id),
  status text not null,
  source_id uuid references worldcup_sources(id),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

后续再补：

```text
worldcup_venues
worldcup_team_rankings
worldcup_team_form
worldcup_group_stage_stats
worldcup_odds_snapshots
worldcup_availability_reports
worldcup_user_submissions
worldcup_data_gaps
worldcup_predictions
worldcup_prediction_runs
```

## 8. Antigravity 第一轮任务清单

请按顺序执行：

1. 创建 `data/worldcup/` 目录结构。
2. 创建 `data/worldcup/source-registry.json`，登记所有计划使用的数据源。
3. 抓取或手动整理 2026 世界杯赛程赛果，输出 `matches.normalized.csv`。
4. 整理参赛球队，输出 `teams.normalized.csv` 和球队别名 JSON。
5. 整理球场城市，输出 `venues.normalized.csv`。
6. 抓取 FIFA 排名与 Elo 排名，输出 `rankings.normalized.csv`。
7. 收集每队近 20 场国家队比赛，输出 `recent_form.normalized.csv`。
8. 根据未来比赛生成 `data_gaps.normalized.csv`。
9. 跑本地 QA：唯一键、外键、空值、比分格式、时间格式。
10. 交付一份数据覆盖率报告。

## 9. 第一轮验收标准

必须满足：

- 2026 世界杯淘汰赛比赛覆盖率 100%。
- 已完赛比赛比分覆盖率 100%。
- 参赛球队 `team_id` 覆盖率 100%。
- 未来 48 小时比赛均生成赔率、伤停、预计首发缺口任务。
- 每支球队至少有 10 场近期比赛；目标是 20 场。
- FIFA 或 Elo 至少一种排名覆盖率 100%；两种都齐全为优秀。
- 所有 CSV 可重复导入，不产生重复主键。

## 10. 交付格式

请交付：

```text
data/worldcup/source-registry.json
data/worldcup/processed/*.csv
data/worldcup/import/*.csv
docs/WORLDCUP_DATA_COVERAGE_REPORT.md
```

覆盖率报告需要包含：

- 数据源列表
- 每张表行数
- 字段缺失率
- 未匹配球队名称
- 未解析比赛
- 未来 48 小时高优先级数据缺口
- 下一轮建议

