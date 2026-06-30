# 全国高考志愿填报数据采集与解析实施方案 (Roadmap)

> [!IMPORTANT]
> **本方案由 AI 智能体根据对本地 crawler/parser 架构的审计与实地探针命令（以北京市为例，成功在后台抓取并分类 5 个核心源网页）的运行结果所制定。它指明了将当前“以浙江省为主”的数据体系扩展至“全国 31 省市自治区”的具体工程路线。**

---

## 🚀 阶段一：全国数据源分布式采集 (Web Crawling)

当前项目中的爬虫脚本 `crawl-official-sources.mjs` 具备强大的多级链接探测与分类能力，且在 `source-registry.json` 中已经完整配置了全国 **31 个省市自治区招考院** 以及 **教育部阳光高考平台** 的官方种子 URL。

### 1.1 一键拉取各省一手数据源
您可以通过指定 `--provinces` 参数，将目标省份的数据源拉取并注册到 Supabase 数据库中：
```bash
# 抓取北京、上海、广东最新的高考计划及一分一段数据源，并将记录写入 gaokao_source_documents
node scripts/gaokao/crawl-official-sources.mjs --provinces=北京,上海,广东 --write-db --max-items=30
```

### 1.2 全国基础大学与专业库（跨省通用数据）
*   **教育部普通高校名单**：读取 `source-registry.json` 中第 23 行的 `hudong.moe.gov.cn/qggxmd/`，用于初始化 `gaokao_institutions` 里的全国 3000+ 所高校底册。
*   **教育部标准专业目录**：读取 `source-registry.json` 中第 12 行的 `moe.gov.cn` 备案审批结果，用于初始化 `gaokao_majors` 标准专业库。

---

## 🛠️ 阶段二：建立多省份解析插件体系 (Generalizing Parsers)

这是目前最核心的工程痛点：每个省的招考院挂出来的录取 PDF 格式、列的顺序、表头名称千差万别（如浙江是单科选考合并表格，广东是院校专业组独立 PDF 等）。直接用现有的浙江正则会全部失效。

### 2.1 引入省份解析器注册机制
我们在 `scripts/gaokao/lib/parsers/` 下，为每个省份设立独立的解析插件：
```
scripts/gaokao/lib/parsers/
├── base_parser.mjs        # 抽象通用解析基类
├── zhejiang_parser.mjs    # 移植现有的浙江 PDF 解析逻辑
├── guangdong_parser.mjs   # 针对广东院校专业组和排版格式的解析器
└── beijing_parser.mjs     # 针对北京多段及选科约束的解析器
```

### 2.2 格式归一化映射 (Normalization Map)
各省招考院提供的常见文件格式与抽取策略如下：

| 数据格式 | 来源省份 | 提取策略 | 推荐工具 |
| :--- | :--- | :--- | :--- |
| **标准表格 PDF** | 浙江、广东、山东 | 通过 Python 的 `pypdf` 抽取文本，根据各省特定的列宽与分隔符分割成多列，自动推断学校名和专业名。 | `pypdf` / `pdfplumber` |
| **Excel 电子表** | 江苏、四川、陕西 | 使用 Node / Python 读取 `.xls/.xlsx`，根据表头正则匹配自动对齐到 `gaokao_admission_records` 的标准字段。 | `xlsx` / `openpyxl` |
| **网页 HTML 表格** | 上海、北京 | 爬虫直接保存 HTML 页面，通过 BeautifulSoup / JSDOM 提取 `<table>` 元素并做 JSON 转换。 | `jsdom` |

---

## 🧠 阶段三：基于大语言模型的非结构化提取 (LLM-Assisted Processing)

对于某些不规则的省份政策通知、或是部分极难正则匹配的 PDF 计划书，我们将调用项目已有的 `generateText` LLM 接口进行非结构化结构化：
1.  **切块送审**：使用 `extract-documents.mjs` 将文档切成 1800 字的 chunk。
2.  **LLM 提炼**：通过提示词让 LLM 从文本中提取结构化的 `[学校代码, 学校名称, 专业组, 专业名称, 最低分, 最低位次]`。
3.  **结果存盘**：写入 `gaokao_admission_records` 中，大大提高全国数据的收集效率，避开繁琐的手写规则。

---

## 🔍 阶段四：全国数据对齐与校验 (Data Alignment & QA)

当多省数据录入后，需要保证数据清洗的准确度：
1.  **院校国标码对齐**：使用教育部公布的 5 位数字“教育部代码 (ministry_code)”作为唯一 ID，将各省历史数据中的“同名不同写（如：清华大学 vs 清华）”归并，映射到 `gaokao_institutions` 里的同一条记录。
2.  **覆盖率巡检看板**：调用 `getGaokaoDataCoverage`，按省份和年份检测当前库里哪部分数据已经达到 100%（例如：浙江 2024/2025 达到 100%），哪部分数据还需要继续人工补充或爬取。
