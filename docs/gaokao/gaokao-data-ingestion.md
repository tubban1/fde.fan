# 高考志愿数据入库说明

高考志愿推荐不能编造数据。系统需要把官方或可核验来源的数据落到 Supabase/Postgres，再由推荐模块读取。

## 1. 建表

```bash
npm run gaokao:schema
```

这会执行 `docs/gaokao-admission-schema.sql`，创建：

- `gaokao_source_documents`
- `gaokao_province_rules`
- `gaokao_institutions`
- `gaokao_majors`
- `gaokao_enrollment_plans`
- `gaokao_admission_records`
- `gaokao_score_rank_segments`
- `gaokao_document_chunks`
- 推荐运行相关表

## 2. 登记官方来源

```bash
npm run gaokao:seed-sources
```

来源清单在 `data/gaokao/source-registry.json`。它记录教育部、阳光高考、各省教育考试院等入口，后续每份招生计划、投档线、录取分数文件都应该挂到 `gaokao_source_documents`。

## 3. 导入 CSV

## 3. 抓取公开来源

公开爬虫从 `data/gaokao/source-registry.json` 的官方入口出发，只抓同域公开页面和公开文件，按关键词筛选：

- 招生计划、招生专业、计划查询
- 投档线、投档分、录取分数、最低位次
- 一分一段、成绩分段
- 志愿填报、填报规则、招生章程
- 选科要求、选考科目

先抓浙江 2026/2025/2024/2023：

```bash
npm run gaokao:crawl -- --provinces=浙江 --years=2026,2025,2024,2023 --depth=2 --max-items=120 --write-db
```

抓所有登记省份：

```bash
npm run gaokao:crawl -- --years=2026,2025,2024,2023 --depth=2 --max-items=80 --write-db
```

对已经人工定位过的公开关键页面，可以直接抓取：

```bash
npm run gaokao:fetch-known
```

已知关键源维护在 `data/gaokao/known-public-sources.json`，例如浙江 2023-2025 投档及专业录取情况、2026 一分一段、录取工作通知、填报志愿通知。

爬虫会：

- 下载公开 PDF/Excel/CSV/ZIP/DOC 文件到 `data/gaokao/raw/<省份>/<年份>/`
- 生成一次爬取清单到 `data/gaokao/crawl-results/`
- 使用 `--write-db` 时写入 `gaokao_source_documents`

注意：爬虫负责“找来源、下载原始文件、入来源库”。不同省份 PDF/Excel 格式差异很大，结构化解析到 `gaokao_enrollment_plans` / `gaokao_admission_records` 仍需要针对文件格式做解析器，或先转成 CSV 后用下面的导入命令。

### 抽取 PDF/ZIP 文本切片

爬到 PDF/ZIP 后，可以先抽文本进入 `gaokao_document_chunks`，用于规则库/RAG 和后续结构化解析：

```bash
npm run gaokao:extract-docs -- --province=浙江 --limit=50
```

浙江 2026 成绩分数段表抽取后，可结构化写入一分一段表：

```bash
npm run gaokao:parse-score-rank -- --province=浙江 --year=2026 --candidate-track=综合改革 --subject-combo=不限
```

浙江 2023-2025 投档及专业录取 PDF 可结构化写入历史录取表：

```bash
npm run gaokao:parse-zhejiang-admissions
```

先抽样检查前 40 页：

```bash
npm run gaokao:parse-zhejiang-admissions -- --file=data/gaokao/raw/浙江/2025/d4130977fb9f33d8.pdf --max-pages=40 --dry-run
```

## 4. 导入 CSV

### 院校基础数据

```bash
npm run gaokao:import-csv -- --table=institutions --file=data/gaokao/institutions.csv --source-title="全国普通高等学校名单"
```

支持常见列名：

- `name` / `学校名称` / `院校名称`
- `province` / `所在地省份`
- `city` / `城市`
- `local_code` / `院校代码`
- `is_985` / `985`
- `is_211` / `211`
- `is_double_first_class` / `双一流`
- `is_public` / `公办`
- `is_private` / `民办`

### 当年招生计划

```bash
npm run gaokao:import-csv -- --table=plans --file=data/gaokao/zhejiang-2026-plans.csv --province=浙江 --year=2026 --source-title="浙江省2026普通高校招生计划"
```

核心列：

- `province` / `省份` / `招生省份`
- `year` / `年份`
- `batch` / `批次`
- `candidate_track` / `科类` / `考生类别`
- `institution_name` / `院校名称`
- `institution_code` / `院校代码`
- `major_group_code` / `专业组代码`
- `major_code` / `专业代码`
- `major_name` / `专业名称`
- `planned_count` / `计划数` / `招生人数`
- `subject_requirements` / `选科要求`
- `tuition_cny` / `学费`
- `campus` / `校区` / `办学地点`
- `special_flags` / `特殊标记`

### 历年录取数据

```bash
npm run gaokao:import-csv -- --table=admissions --file=data/gaokao/zhejiang-2025-admissions.csv --province=浙江 --year=2025 --source-title="浙江省2025普通类专业录取数据"
```

核心列：

- `province` / `省份`
- `year` / `年份`
- `batch` / `批次`
- `candidate_track` / `科类` / `考生类别`
- `institution_name` / `院校名称`
- `major_group_code` / `专业组代码`
- `major_code` / `专业代码`
- `major_name` / `专业名称`
- `min_score` / `最低分`
- `min_rank` / `最低位次` / `位次`
- `avg_score` / `平均分`
- `avg_rank` / `平均位次`
- `max_score` / `最高分`
- `max_rank` / `最高位次`
- `planned_count` / `计划数`
- `admitted_count` / `录取人数`

## 5. 当前推荐模块读取的数据

`src/server/gaokao/gaokao_recommend.js` 当前会读取：

- `gaokao_enrollment_plans`：考生省份 + 年份的当年计划
- `gaokao_admission_records`：考生省份 + 前 3 年录取最低位次
- `gaokao_institutions`：院校城市、985/211/双一流、公办民办标签

如果这两类核心表没有数据，系统会提示数据不足，不会编造院校和概率。

## 6. 数据采集优先级

1. 浙江 2026 招生计划
2. 浙江 2025/2024/2023 专业录取最低分与最低位次
3. 浙江志愿规则和一分一段
4. 全国院校基础信息
5. 专业目录、选科要求、特殊专业限制
6. 其他省份按同样格式逐省导入
