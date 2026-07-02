# 高考志愿智能体数据库设计

这套库建议优先用 Supabase Postgres 承载，不需要一开始单独采购外部向量数据库。Supabase 自带 `pgvector`，足够放官方规则、招生章程、专业介绍、就业解读等文本检索；真正用于计算“冲稳保”的核心数据必须放结构化关系表。

## 设计原则

- 位次优先：录取判断以 `rank`、招生计划变化、选科限制为主，分数只是辅助。
- 年份省份隔离：同一院校/专业在不同省份、年份、批次、专业组下是不同投档单元。
- 官方来源可追溯：招生规则、计划、录取数据都要保留 `source_id` 和原始字段 `raw_data`。
- 结构化优先，JSONB 补充：影响筛选和排序的字段必须独立成列；访谈偏好、解释理由、原始公告可用 JSONB。
- 推荐结果可复盘：每次推荐运行要保存输入快照、算法版本、推荐项、概率区间和风险解释。

## 数据分层

### 1. 规则库

用于回答“这个省怎么填、能填几个、投档/退档规则是什么”。

- `gaokao_province_rules`：省份、年份、批次、志愿模式、志愿数量、专业数量、是否调剂、投档/退档规则。
- `gaokao_subject_requirement_rules`：选科要求规则和兼容性说明，适合放规则文本、特殊解释。
- `gaokao_source_documents`：官方 PDF、网页、招生章程等来源文档。
- `gaokao_document_chunks`：文本切片，可选 `embedding`，用于 RAG 检索。

### 2. 院校与专业主数据

用于基础筛选、标签解释、学校/专业权衡。

- `gaokao_institutions`：院校主表，含院校代码、所在地、办学性质、层次标签。
- `gaokao_majors`：教育部专业目录，含专业代码、名称、学科门类、专业类。
- `gaokao_institution_major_profiles`：某院校开设某专业的画像，含校区、学费、学制、优势标记、特殊类型。

### 3. 招生计划与历年录取

这是推荐准确性的核心。

- `gaokao_enrollment_plans`：当年某省某批次的招生计划，细到专业/专业组。
- `gaokao_admission_records`：历年录取数据，细到院校、专业组、专业。
- `gaokao_score_rank_segments`：一分一段表，用于分数和位次转换。

### 4. 考生画像与访谈

用于把用户输入结构化，并在会话中逐步补齐。

- `gaokao_candidate_profiles`：省份、年份、科类/选科、分数、位次、批次类型等基础信息。
- `gaokao_candidate_preferences`：城市、专业、预算、民办/中外合作/调剂接受度、长期目标。
- `gaokao_candidate_interviews`：智能体访谈记录、缺失字段、结构化抽取。

### 5. 推荐输出

用于保存最终志愿表、解释、风险和版本。

- `gaokao_recommendation_runs`：一次推荐运行，含输入快照、算法版本、整体策略。
- `gaokao_recommendation_items`：每个推荐志愿，含冲稳保类型、概率区间、排序、风险说明、替代方案。

## MVP 必建表

如果先做最小可用版，建议只启用这 8 张：

1. `gaokao_province_rules`
2. `gaokao_institutions`
3. `gaokao_majors`
4. `gaokao_enrollment_plans`
5. `gaokao_admission_records`
6. `gaokao_candidate_profiles`
7. `gaokao_candidate_preferences`
8. `gaokao_recommendation_runs` / `gaokao_recommendation_items`

## 是否需要向量数据库

短期不需要外部向量库。建议：

- 结构化计算：Supabase Postgres。
- 官方规则/章程 RAG：Supabase `pgvector`。
- 文件存储：Supabase Storage 或对象存储，数据库只保存 URL、hash、来源、解析状态。

只有在后续文档量非常大、需要复杂混合检索、多租户隔离和召回评测体系时，再考虑独立向量数据库。

## 数据采集优先级

1. 当年招生计划：必须最新，优先官方招生考试院/招生计划书。
2. 近 3-5 年专业录取位次：能拿到专业维度就不要只停在院校维度。
3. 省份志愿填报规则：官方考试院政策文件。
4. 院校专业基础库：教育部专业目录、院校官网、阳光高考等公开资料。
5. 招生章程：用于体检、语种、单科成绩、校区、收费、调剂等风险提示。

## 推荐计算建议

推荐时不要直接让大模型“猜概率”。建议先用结构化算法产出候选集：

- 按省份、年份、批次、选科、计划、预算、地区、专业过滤。
- 用近年最低位次、平均位次、计划人数变化估算 `rank_gap`。
- 按风险偏好切分冲、稳、保。
- 大模型只负责解释权衡、发现规则风险、生成家长版/考生版表达。

推荐项里应保存：

- `admit_probability_min` / `admit_probability_max`
- `risk_band`：冲 / 稳 / 保 / 垫
- `rank_gap`
- `plan_change_ratio`
- `adjustment_risk`
- `withdrawal_risk`
- `major_group_risk`
- `reasoning`

