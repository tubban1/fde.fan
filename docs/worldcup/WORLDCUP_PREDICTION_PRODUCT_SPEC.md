# 世界杯预测智能体产品文档

本文档定义一个面向 2026 世界杯淘汰赛与后续国际足球赛事的预测智能体。系统目标不是给出“绝对正确”的结果，而是在数据来源可追溯的前提下，输出可解释、可校准、可复盘的比赛预测。

当前日期基准：2026-07-01。2026 世界杯已进入淘汰赛 32 强阶段，赛事预计于 2026-07-19 结束。

## 1. 产品定位

世界杯预测智能体面向两类用户：

- 普通球迷：想快速了解一场比赛的胜率、晋级概率、推荐比分和爆冷风险。
- 数据分析用户：想查看 Elo、近期状态、赔率、伤停、首发、赛程压力等因素如何影响预测。

系统提供三层能力：

- 基础预测：赛程赛果、球队强度、近期状态、世界杯小组赛表现。
- 增强预测：加入赔率、伤停、停赛、预计首发、天气、休息天数。
- 复盘分析：赛后对比预测概率、实际赛果、模型偏差和关键因素。

## 2. 核心用户场景

### 2.1 今日比赛预测

用户进入页面后看到今日或未来 48 小时比赛列表。每场比赛展示：

- 胜平负概率
- 淘汰赛晋级概率
- 推荐比分区间
- 数据完整度
- 主要风险因素
- 赔率是否已更新

### 2.2 单场深度分析

用户点击比赛后进入分析页，看到：

- 双方基本实力对比
- Elo / FIFA 排名趋势
- 近 5 / 10 / 20 场状态
- 本届世界杯表现
- 伤病、停赛、预计首发
- 赔率变化
- 天气、城市、旅途、休息天数
- 模型给出的关键解释

### 2.3 缺失数据补充

当系统缺少实时数据时，不阻塞分析，而是生成“待补充数据清单”：

- 最新赔率
- 预计首发
- 伤病/停赛
- 黄牌累计
- 天气或球场信息

用户可以手动输入数据，并选择来源类型：官方、新闻、赔率平台、API、人工观察。系统将用户补充数据标记为 `user_supplied`，并参与后续预测。

### 2.4 赛后复盘

比赛结束后，系统自动更新赛果并生成复盘：

- 预测概率与实际结果对比
- 是否爆冷
- 模型高估/低估的球队
- 赔率方向是否与模型一致
- 下轮预测需要修正的因素

## 3. 数据完整度分级

预测可以在数据不完整时运行，但必须展示置信度。

| 等级 | 数据条件 | 可输出内容 |
| :--- | :--- | :--- |
| A | 赛程赛果、Elo、近期状态、赔率、伤停、首发齐全 | 胜平负、晋级概率、比分区间、爆冷风险、解释 |
| B | 缺首发或伤停，但赔率与基础数据齐全 | 胜平负、晋级概率、主要风险 |
| C | 只有基础数据，无实时赔率/伤停 | 基础胜率、粗略比分区间 |
| D | 缺少关键球队或比赛映射 | 不做概率，只提示补充数据 |

每场比赛展示：

```text
data_completeness_score: 0-100
prediction_confidence: high | medium | low
missing_critical_fields: []
```

## 4. MVP 功能范围

第一版只做 2026 世界杯淘汰赛预测。

### 必做

- 比赛列表：32 强至决赛
- 单场预测：胜平负、晋级概率、比分区间
- 数据来源登记
- 数据缺口提示
- 用户手动补充赔率、伤停、预计首发
- 赛后比分更新与复盘

### 暂不做

- 赛中实时事件预测
- 球员级 xG 模型
- 自动投注建议
- 多语言国际化
- 复杂深度学习模型

## 5. 预测输出格式

单场预测建议输出：

```json
{
  "match_id": "2026-r32-eng-cod",
  "home_team": "England",
  "away_team": "DR Congo",
  "win_draw_loss": {
    "home": 0.62,
    "draw_90m": 0.23,
    "away": 0.15
  },
  "advance_probability": {
    "home": 0.73,
    "away": 0.27
  },
  "scoreline_band": ["1-0", "2-0", "2-1"],
  "upset_risk": "medium",
  "confidence": "medium",
  "missing_fields": ["expected_lineups", "injuries_suspensions"],
  "explanation": [
    "England has higher Elo and stronger recent form.",
    "Market odds are not available, so probability is not market-calibrated.",
    "Missing lineup data increases uncertainty."
  ]
}
```

## 6. 数据原则

- 不编造缺失数据。
- 每条结构化数据必须保留来源、抓取时间和更新时间。
- 官方来源优先于新闻，API 快照优先于截图，用户补充数据必须标注来源。
- 预测结果必须明确数据完整度和置信度。
- 赔率、伤停、首发等实时字段需要保留历史快照，不覆盖旧值。

## 7. 推荐数据库模块

最小可用数据表：

```text
worldcup_sources
worldcup_teams
worldcup_matches
worldcup_team_rankings
worldcup_team_form
worldcup_match_stats
worldcup_odds_snapshots
worldcup_availability_reports
worldcup_user_submissions
worldcup_data_gaps
worldcup_predictions
worldcup_prediction_runs
```

其中 `worldcup_data_gaps` 是产品关键表，用于把“不完整数据”变成可操作的用户补充任务。

