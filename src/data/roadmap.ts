export interface RoadmapResource {
  title: string;
  href: string;
  note: string;
  noteEn: string;
}

export interface RoadmapModule {
  slug: string;
  href: string;
  mark: string;
  title: string;
  titleEn: string;
  layer: string;
  layerEn: string;
  summary: string;
  summaryEn: string;
  outcomes: string[];
  outcomesEn: string[];
  resources: RoadmapResource[];
}

export const roadmapLayers = [
  {
    mark: "01",
    title: "Foundation Layer",
    titleZh: "基础层",
    body: "补齐前端、Git、API、SQL、数据文件和部署基础，让学员能读懂项目、修正 AI 生成代码，并把数据变成可验证输入。",
    bodyEn: "Build front-end, Git, API, SQL, data-file, and deployment fundamentals so learners can read projects, repair AI-generated code, and turn data into verifiable inputs.",
  },
  {
    mark: "02",
    title: "Delivery Layer",
    titleZh: "交付层",
    body: "把需求澄清、Prompt to Product、Agent 工作流、Demo、README、测试清单和演示脚本连成一条可交付链路。",
    bodyEn: "Connect discovery, Prompt to Product, agent workflow, demos, README files, test checklists, and demo scripts into one delivery chain.",
  },
  {
    mark: "03",
    title: "Enterprise Layer",
    titleZh: "企业层",
    body: "加入数据工程、云架构、权限、安全、日志、监控、评估和回滚，让 FDE 能面对真实企业现场。",
    bodyEn: "Add data engineering, cloud architecture, permissions, security, logs, monitoring, evaluation, and rollback for real enterprise field work.",
  },
  {
    mark: "04",
    title: "Industry Layer",
    titleZh: "行业层",
    body: "把跨境电商、文旅、教育和企业 AI 转型诊断做成可复用行业实验室，每个行业都有案例、数据、Prompt、Demo 和评分标准。",
    bodyEn: "Turn commerce, culture-tourism, education, and enterprise AI diagnosis into reusable labs with cases, data, prompts, demos, and assessment standards.",
  },
];

export const roadmapModules: RoadmapModule[] = [
  {
    slug: "foundations",
    href: "/learn/foundations",
    mark: "WEB",
    title: "前端与工程基础",
    titleEn: "Front-End and Engineering Foundations",
    layer: "Foundation Layer",
    layerEn: "Foundation Layer",
    summary: "HTML、CSS、JavaScript、React、Vite、Git、API 和最小部署，让学员能看懂并修复 AI 生成项目。",
    summaryEn: "HTML, CSS, JavaScript, React, Vite, Git, APIs, and minimum deployment so learners can inspect and repair AI-generated projects.",
    outcomes: ["读懂 React/Vite 项目结构", "调用 API 并处理错误状态", "完成 Git 分支、PR 和回滚", "部署一个可访问 Demo"],
    outcomesEn: ["Read React/Vite project structure", "Call APIs and handle error states", "Use branches, PRs, and rollback", "Deploy an accessible demo"],
    resources: [
      { title: "MDN Web Docs", href: "https://developer.mozilla.org/", note: "Web 基础和浏览器 API 的长期参考。", noteEn: "Long-term reference for web fundamentals and browser APIs." },
      { title: "React Docs", href: "https://react.dev/learn", note: "理解组件、状态和渲染。", noteEn: "Understand components, state, and rendering." },
      { title: "Vite Guide", href: "https://vite.dev/guide/", note: "掌握现代前端项目结构。", noteEn: "Learn modern front-end project structure." },
    ],
  },
  {
    slug: "data-engineering",
    href: "/learn/data-engineering",
    mark: "DATA",
    title: "数据工程与本地数据审计",
    titleEn: "Data Engineering and Local Data Audit",
    layer: "Enterprise Layer",
    layerEn: "Enterprise Layer",
    summary: "从客户的 Excel、CSV、ERP 导出和历史数据库开始，训练 SQL、数据质量、建模、指标口径和本地 DuckDB 审计。",
    summaryEn: "Start from client Excel, CSV, ERP exports, and legacy databases; train SQL, data quality, modeling, metric definitions, and local DuckDB audits.",
    outcomes: ["完成数据盘点和字段字典", "用 SQL 发现异常、缺失和重复", "区分原始层、清洗层、业务指标层", "输出数据质量报告"],
    outcomesEn: ["Create data inventory and field dictionary", "Use SQL to find anomalies, missing values, and duplicates", "Separate raw, cleaned, and business metric layers", "Ship a data quality report"],
    resources: [
      { title: "Select Star SQL", href: "https://selectstarsql.com/", note: "交互式 SQL 入门，适合业务数据练习。", noteEn: "Interactive SQL learning for business data practice." },
      { title: "DuckDB Docs", href: "https://duckdb.org/docs/", note: "用本地文件快速分析 CSV/Parquet，不必先搭大集群。", noteEn: "Analyze CSV/Parquet locally without a large cluster." },
      { title: "dbt Fundamentals", href: "https://courses.getdbt.com/courses/fundamentals", note: "学习把数据清洗变成可维护工程。", noteEn: "Learn maintainable data transformation workflows." },
    ],
  },
  {
    slug: "cloud-deployment",
    href: "/learn/cloud-deployment",
    mark: "CLOUD",
    title: "云部署、权限与运行体系",
    titleEn: "Cloud Deployment, Access, and Operations",
    layer: "Enterprise Layer",
    layerEn: "Enterprise Layer",
    summary: "从静态站升级到企业运行：API、数据库、环境变量、阿里云 ECS/函数计算/ACK、本地内网数据、日志、监控和回滚。",
    summaryEn: "Move from static sites to enterprise operation: APIs, databases, env vars, cloud runtimes, local/private data, logs, monitoring, and rollback.",
    outcomes: ["解释部署不是发截图，而是可访问、可复现、可回滚", "配置环境变量和密钥边界", "设计最小可行架构 MVA", "准备日志、监控和故障处理手册"],
    outcomesEn: ["Explain deployment as accessible, reproducible, rollbackable operation", "Configure env vars and secret boundaries", "Design a Minimum Viable Architecture", "Prepare logs, monitoring, and incident runbooks"],
    resources: [
      { title: "Alibaba Cloud Architecture Center", href: "https://www.alibabacloud.com/architecture", note: "中文版课程优先用阿里云/本地数据场景理解企业云架构。", noteEn: "Use cloud architecture patterns to understand enterprise deployment." },
      { title: "Google Cloud Architecture Center", href: "https://docs.cloud.google.com/architecture", note: "参考其架构分类、可靠性、安全和可观测性方法，不在中文作业里强绑定 GCP。", noteEn: "Reference architecture, reliability, security, and observability patterns." },
      { title: "Google SRE Workbook", href: "https://sre.google/workbook/table-of-contents/", note: "学习监控、事故响应和运行责任。", noteEn: "Learn monitoring, incident response, and operational ownership." },
    ],
  },
  {
    slug: "prompt-to-product",
    href: "/learn/prompt-to-ui",
    mark: "P2P",
    title: "Prompt to Product",
    titleEn: "Prompt to Product",
    layer: "Delivery Layer",
    layerEn: "Delivery Layer",
    summary: "把一句业务诉求拆成角色、场景、字段、状态、页面、Agent 工具调用和验收标准。",
    summaryEn: "Turn a business request into roles, scenarios, fields, states, pages, agent tool calls, and acceptance checks.",
    outcomes: ["写出结构化需求 Prompt", "生成可运行前端 Demo", "定义测试样例和验收标准", "记录 Prompt 版本和失败样本"],
    outcomesEn: ["Write structured requirement prompts", "Generate runnable front-end demos", "Define tests and acceptance checks", "Track prompt versions and failure samples"],
    resources: [
      { title: "OpenAI Customer Stories", href: "https://openai.com/customer-stories", note: "观察真实组织如何把模型放入复杂工作流。", noteEn: "See how organizations deploy models into complex workflows." },
      { title: "OpenAI Developer Docs", href: "https://developers.openai.com/", note: "查模型、API 和应用构建参考。", noteEn: "Reference models, APIs, and application-building practices." },
      { title: "Architecture Decision Records", href: "https://github.com/joelparkerhenderson/architecture-decision-record", note: "记录为什么这样设计，而不只是记录做了什么。", noteEn: "Record why a design was chosen, not only what was built." },
    ],
  },
  {
    slug: "agent-workflows",
    href: "/learn/agent-workflows",
    mark: "AGENT",
    title: "Agent 工作流与企业 RAG",
    titleEn: "Agent Workflow and Enterprise RAG",
    layer: "Delivery + Enterprise Layer",
    layerEn: "Delivery + Enterprise Layer",
    summary: "训练工具调用、状态、路由、Human-in-the-loop、RAG、权限边界、追踪和失败回退。",
    summaryEn: "Train tool calls, state, routing, human-in-the-loop, RAG, access boundaries, tracing, and fallback.",
    outcomes: ["画出 Agent 状态机", "设计工具调用和人工确认点", "构建最小 RAG 流程", "写出失败回退和审计说明"],
    outcomesEn: ["Draw an agent state machine", "Design tool calls and human checkpoints", "Build a minimal RAG flow", "Document fallback and audit rules"],
    resources: [
      { title: "Pinecone RAG Learning Center", href: "https://www.pinecone.io/learn/series/rag/", note: "系统理解 RAG 的检索、向量和评估。", noteEn: "Understand retrieval, vectors, and RAG evaluation." },
      { title: "LlamaIndex Docs", href: "https://docs.llamaindex.ai/", note: "学习企业文档接入和索引思路。", noteEn: "Learn enterprise document ingestion and indexing." },
      { title: "LangSmith Tracing", href: "https://www.langchain.com/langsmith", note: "理解 Agent 调用链路追踪。", noteEn: "Understand tracing for agent execution paths." },
    ],
  },
  {
    slug: "evaluation",
    href: "/learn/evaluation",
    mark: "EVAL",
    title: "AI Agent 评估与上线验收",
    titleEn: "AI Agent Evaluation and Launch Acceptance",
    layer: "Enterprise Layer",
    layerEn: "Enterprise Layer",
    summary: "建立 Golden Dataset、人工评分 Rubric、工具轨迹检查、幻觉检测、上线前验收和上线后观测。",
    summaryEn: "Build golden datasets, human scoring rubrics, tool-trajectory checks, hallucination tests, pre-launch acceptance, and post-launch observation.",
    outcomes: ["设计任务级评估集", "区分开发时内循环和生产外循环", "检查工具调用路径和最终答案质量", "输出上线验收报告"],
    outcomesEn: ["Design task-level eval sets", "Separate dev inner loops from production outer loops", "Check tool paths and final answer quality", "Ship a launch acceptance report"],
    resources: [
      { title: "Anthropic: Evaluating AI Agents", href: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents", note: "用生产视角理解 Agent eval，而不是凭感觉试用。", noteEn: "Understand agent evals from a production perspective rather than vibes-testing." },
      { title: "OpenAI Evals", href: "https://github.com/openai/evals", note: "学习如何把任务样本变成可重复评估。", noteEn: "Learn how task examples become repeatable evaluations." },
      { title: "RAGAS", href: "https://docs.ragas.io/", note: "参考 RAG 指标和自动化评估思路。", noteEn: "Reference RAG metrics and automated evaluation workflows." },
    ],
  },
  {
    slug: "consulting",
    href: "/learn/consulting",
    mark: "SOFT",
    title: "Soft Stack 与 Diagnostic Mindset",
    titleEn: "Soft Stack and Diagnostic Mindset",
    layer: "Enterprise Layer",
    layerEn: "Enterprise Layer",
    summary: "训练 FDE 的前线判断：三问诊断、MECE、Pyramid Principle、80/20 范围控制、红旗识别和客户共识建立。",
    summaryEn: "Train field judgment: Three Whys, MECE, Pyramid Principle, 80/20 scoping, red flags, and stakeholder alignment.",
    outcomes: ["用三问找到根因", "识别 Champion、Blocker 和真实成功指标", "写出技术 PRD/SOW/ADR", "把 Demo 讲成价值叙事"],
    outcomesEn: ["Use Three Whys to find root pain", "Identify champion, blocker, and success metric", "Write technical PRD/SOW/ADR", "Turn demos into value narratives"],
    resources: [
      { title: "The Pyramid Principle", href: "https://medium.com/lessons-from-mckinsey/the-pyramid-principle-f0885dd3c5c7", note: "向老板和 CTO 先讲结论，再讲证据。", noteEn: "Give executives the answer first, then the evidence." },
      { title: "MECE Principle", href: "https://en.wikipedia.org/wiki/MECE_principle", note: "把混乱需求拆成不重叠、不遗漏的任务。", noteEn: "Break messy needs into non-overlapping, complete workstreams." },
      { title: "The Trusted Advisor", href: "https://trustedadvisor.com/books/the-trusted-advisor", note: "理解为什么客户信任是交付的一部分。", noteEn: "Understand why client trust is part of delivery." },
    ],
  },
];

export const diagnosticQuestions = [
  {
    q: "事实来源在哪里？",
    qEn: "Where is the system of record?",
    a: "如果核心数据只在某个人的 Excel、微信群截图或本地 ERP 导出里，项目风险已经出现。FDE 要先确认数据来源、责任人、更新时间和可信度。",
    aEn: "If core data lives in one person's Excel file, chat screenshots, or local ERP exports, the project is already at risk. The FDE must verify source, owner, freshness, and trustworthiness.",
  },
  {
    q: "不做这件事的代价是什么？",
    qEn: "What is the cost of inaction?",
    a: "如果没有明确代价，项目很容易变成好看的 Demo。FDE 要问清楚它影响收入、成本、时间、错误率、体验还是合规。",
    aEn: "Without a clear cost, the project becomes a nice demo. The FDE asks whether it affects revenue, cost, time, error rate, experience, or compliance.",
  },
  {
    q: "第 2 天谁来维护？",
    qEn: "What does Day 2 look like?",
    a: "上线之后谁看日志、谁改 Prompt、谁补数据、谁处理投诉？没有内部 owner 的 AI 项目，通常会在 FDE 离开后失效。",
    aEn: "After launch, who checks logs, edits prompts, fills data gaps, and handles complaints? Without an internal owner, AI projects often fail after the FDE leaves.",
  },
];

export const discoveryChecklist = [
  {
    group: "组织与政治",
    groupEn: "Organization and Politics",
    items: [
      ["项目 Champion 是谁？谁真的愿意推动试点？", "Who is the champion who will fight for the pilot?"],
      ["潜在 Blocker 是哪个部门？IT、法务、财务还是业务主管？", "Which function may block it: IT, legal, finance, or business owner?"],
      ["成功指标是什么：更快响应、更高转化、更低错误率还是更少人工？", "What is success: faster response, higher conversion, lower error rate, or less manual work?"],
    ],
  },
  {
    group: "数据与安全",
    groupEn: "Data and Security",
    items: [
      ["数据分级是什么？是否包含个人信息、客户资料、合同、财务或敏感业务数据？", "How is the data classified? Does it include personal, customer, contract, finance, or sensitive business data?"],
      ["数据如何进入系统：本地 Excel/CSV、ERP 导出、数据库只读账号、飞书表格还是 API？", "How does data enter the system: local Excel/CSV, ERP export, read-only database account, Feishu table, or API?"],
      ["是否需要脱敏、最小权限、访问日志和人工复核？", "Do we need masking, least privilege, access logs, and human review?"],
    ],
  },
  {
    group: "基础设施",
    groupEn: "Infrastructure",
    items: [
      ["先用本地 DuckDB/SQLite 做数据审计，还是直接接企业数据库？", "Start with local DuckDB/SQLite audit or connect directly to enterprise databases?"],
      ["最小可行架构是静态站 + API，还是阿里云 ECS/函数计算/ACK + 数据库？", "Is the MVA static site + API, or cloud runtime + database?"],
      ["有没有环境变量、密钥管理、日志、备份和回滚方案？", "Do env vars, secret management, logs, backup, and rollback exist?"],
    ],
  },
  {
    group: "AI 与评估",
    groupEn: "AI and Evaluation",
    items: [
      ["有没有 Golden Dataset 或历史样本用于评估？", "Is there a golden dataset or historical sample for evaluation?"],
      ["工具调用路径是否可追踪？失败时能否回放？", "Can tool calls be traced and replayed after failure?"],
      ["上线前谁验收？上线后如何发现模型退化、幻觉或数据漂移？", "Who accepts before launch, and how do we detect degradation, hallucination, or drift after launch?"],
    ],
  },
];

export const caseStudyReferences = [
  {
    title: "Palantir: Dev vs. Delta",
    href: "https://blog.palantir.com/dev-versus-delta-demystifying-engineering-roles-at-palantir-ad44c2a6e87",
    lesson: "理解 FDE 角色的起源故事：FDE 的价值在于连接产品能力和客户现场 Delta。",
    lessonEn: "Understand the FDE origin story: the role bridges product capability and the customer's field delta.",
  },
  {
    title: "OpenAI: Customer Stories",
    href: "https://openai.com/customer-stories",
    lesson: "观察 GPT 如何进入企业知识、法律、金融、研发等复杂工作流。",
    lessonEn: "Observe how GPT enters complex workflows across knowledge, legal, finance, and research settings.",
  },
  {
    title: "Google Cloud: Architecture Center",
    href: "https://docs.cloud.google.com/architecture",
    lesson: "学习企业架构分类：AI/ML、数据分析、数据库、网络、安全、监控和混合云。",
    lessonEn: "Study enterprise architecture categories: AI/ML, analytics, databases, networking, security, monitoring, and hybrid cloud.",
  },
  {
    title: "Anthropic: Evaluating AI Agents",
    href: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents",
    lesson: "把 Agent 从“感觉可用”推进到可测、可解释、可上线验收。",
    lessonEn: "Move agents from vibes-testing to measurable, explainable, launch-ready systems.",
  },
];

export const artifactTemplates = [
  ["Discovery Brief", "需求澄清表", "客户背景、目标、系统现状、数据来源、约束、成功指标和下一步。"],
  ["Data Audit Sheet", "数据审计表", "字段字典、缺失率、重复率、异常样本、更新频率和责任人。"],
  ["Technical PRD", "技术 PRD", "把业务目标转成页面、API、数据、Agent 状态、权限和验收标准。"],
  ["MVA Diagram", "最小可行架构图", "用最小架构证明价值：本地数据、API、前端、模型、日志和部署位置。"],
  ["Evaluation Rubric", "评估 Rubric", "Golden Dataset、人工评分维度、工具轨迹、幻觉检测和上线门槛。"],
  ["SOW / Boundary Note", "范围与边界说明", "明确 FDE 负责什么、不负责什么、客户需要提供什么、风险如何升级。"],
  ["ADR", "架构决策记录", "记录为什么选某个模型、云服务、数据库、RAG 路径或部署方式。"],
  ["Day-2 Runbook", "上线后运行手册", "日志查看、Prompt 更新、数据补录、故障回滚、责任人和复盘节奏。"],
];
