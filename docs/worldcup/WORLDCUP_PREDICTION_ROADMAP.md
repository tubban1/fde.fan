# 世界杯预测项目 Roadmap

本文档把世界杯预测智能体拆成数据、模型、产品和运维四条线。优先级遵循一个原则：先让系统基于可核验数据跑通闭环，再逐步增强实时性和预测精度。

## Phase 0: 项目初始化

目标：建立目录、数据源清单、数据库草案和导入规范。

交付物：

- `docs/WORLDCUP_PREDICTION_PRODUCT_SPEC.md`
- `docs/WORLDCUP_PREDICTION_ROADMAP.md`
- `docs/ANTIGRAVITY_WORLDCUP_DATA_TASK.md`
- `data/worldcup/source-registry.json`
- `data/worldcup/raw/`
- `data/worldcup/processed/`
- `data/worldcup/import/`

验收标准：

- 明确哪些数据自动抓，哪些数据用户补。
- 明确 CSV/JSON 标准字段。
- 明确导入顺序和 QA 规则。

## Phase 1: 数据底座

目标：先抓取和整理不依赖实时 API 的稳定数据。

优先收集：

1. 2026 世界杯赛程、赛果、阶段、球场、城市。
2. 2026 世界杯球队清单、分组、晋级路径。
3. FIFA 排名快照。
4. World Football Elo 或等价 Elo 排名快照。
5. 国家队近 20 场比赛结果。
6. 历史世界杯淘汰赛结果。

建议目录：

```text
data/worldcup/raw/
  fifa/
  elo/
  historical-results/
  weather/
  odds/
data/worldcup/processed/
  teams.normalized.csv
  matches.normalized.csv
  rankings.normalized.csv
  recent_form.normalized.csv
data/worldcup/import/
  001_sources.csv
  002_teams.csv
  003_matches.csv
  004_rankings.csv
  005_recent_form.csv
```

验收标准：

- 每场比赛都有稳定 `match_id`。
- 每支球队都有稳定 `team_id`、FIFA 名称、常用中文名、ISO 国家代码。
- 所有导入文件都有 `source_url`、`source_name`、`fetched_at`。
- 重复导入不会产生重复比赛或重复球队。

## Phase 2: 数据清洗与标准化

目标：把多来源数据归一到同一套球队、比赛和时间标准。

清洗规则：

- 球队名称统一到英文 canonical name，再映射中文显示名。
- 时间统一存为 UTC，另保留 local kickoff time 和 venue timezone。
- 淘汰赛比分拆成 90 分钟、加时、点球三段。
- 赔率使用 decimal odds，记录 bookmaker、market、snapshot_time。
- 伤病/停赛按 player/team/match 维度记录，保留原文摘要。
- 用户补充数据必须记录 submitter/session、来源描述和置信度。

质量检查：

- `match_id` 唯一。
- `home_team_id` 和 `away_team_id` 必须存在于 `worldcup_teams`。
- 已完赛比赛必须有比分或明确 `status=postponed/cancelled`。
- 淘汰赛已完赛比赛必须有 winner_team_id。
- 赔率隐含概率需可计算，且不允许负数或 0。
- Elo/FIFA 排名必须带 `ranking_date`。

## Phase 3: 数据导入

目标：把清洗后的 CSV/JSON 导入 Supabase/Postgres。

建议先实现这些脚本：

```text
scripts/worldcup/run-schema.mjs
scripts/worldcup/import-csv.mjs
scripts/worldcup/audit-coverage.mjs
scripts/worldcup/seed-sources.mjs
scripts/worldcup/fetch-known-sources.mjs
scripts/worldcup/parse-schedule.mjs
scripts/worldcup/parse-rankings.mjs
scripts/worldcup/parse-recent-form.mjs
```

导入顺序：

1. `worldcup_sources`
2. `worldcup_teams`
3. `worldcup_venues`
4. `worldcup_matches`
5. `worldcup_team_rankings`
6. `worldcup_team_form`
7. `worldcup_match_stats`
8. `worldcup_odds_snapshots`
9. `worldcup_availability_reports`
10. `worldcup_data_gaps`

导入策略：

- 使用 `upsert`，不要简单 append。
- 对来源和原始数据保留 `raw_data jsonb`。
- 每次导入生成一条 `import_run` 记录，包含行数、错误数、覆盖率。
- 导入后自动跑覆盖率审计。

## Phase 4: MVP 预测模型

目标：用简单、可解释的模型先跑出概率。

第一版特征：

- Elo 差值
- FIFA 排名差值
- 近 10 场胜平负
- 近 10 场进球/失球
- 本届世界杯表现
- 休息天数
- 是否主办国/半主场
- 赔率隐含概率，若存在

输出：

- 90 分钟胜平负概率
- 淘汰赛晋级概率
- 推荐比分区间
- 爆冷风险
- 解释因子

约束：

- 没有赔率时，输出 `market_calibrated=false`。
- 没有伤停/首发时，降低置信度。
- 不输出确定性结论。

## Phase 5: 用户补充闭环

目标：让缺失数据变成产品里的可操作任务。

功能：

- 单场比赛“补充数据”面板。
- 可补充赔率、伤病、停赛、预计首发、天气备注。
- 提交后进入 `worldcup_user_submissions`。
- 审核或自动置信度规则通过后写入对应事实表。
- 重新触发该场比赛预测。

验收标准：

- 用户可以在不懂数据库的情况下补充一场比赛的核心实时数据。
- 系统可以展示“补充前/补充后”的概率变化。

## Phase 6: 前端体验

目标：做一个能用于每日查看和复盘的世界杯预测页面。

页面：

- 今日比赛列表
- 淘汰赛 bracket
- 单场分析页
- 数据补充页
- 赛后复盘页
- 数据覆盖率页

优先顺序：

1. 今日比赛列表
2. 单场分析页
3. 数据补充页
4. 覆盖率页
5. bracket 视图

## Phase 7: 运维与迭代

每日任务：

- 每 30-60 分钟更新赛程赛果。
- 每 2-4 小时更新赔率快照。
- 每场赛前 2 小时更新伤停和预计首发。
- 每场赛后 30 分钟更新赛果和技术统计。

监控：

- 未来 24 小时比赛是否缺赔率。
- 未来 24 小时比赛是否缺伤停/首发。
- 已完赛比赛是否缺比分。
- 预测是否成功生成。
- 数据源抓取是否失败。

## 风险

- 实时赔率和首发数据通常需要 API 或授权来源，网页抓取不稳定。
- 新闻伤停信息结构不一致，需要人工或 LLM 辅助抽取。
- 不同来源的球队名称、比赛时间、点球比分格式可能冲突。
- 赔率数据有合规和使用条款风险，MVP 可先支持用户手动补充。

