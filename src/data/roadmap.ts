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
    body: "理解前端、Git、API、数据文件和部署的基本概念，重点是会用 Codex、Claude Code、Antigravity、Cursor 读项目、改页面、跑命令、查错误。",
    bodyEn: "Understand basic concepts of front-end, Git, APIs, data files, and deployment, with the focus on using Codex, Claude Code, Antigravity, and Cursor to inspect projects, edit pages, run commands, and debug errors.",
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
    body: "学习企业现场常见概念：数据来源、权限、安全、日志、评估和回滚。目标不是成为云架构师，而是能指挥 AI 工具完成可验收交付。",
    bodyEn: "Learn common field concepts: data sources, access, security, logs, evaluation, and rollback. The goal is not to become a cloud architect, but to direct AI tools toward acceptable delivery.",
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
    title: "AI 工具工作流基础",
    titleEn: "AI Tool Workflow Foundations",
    layer: "Foundation Layer",
    layerEn: "Foundation Layer",
    summary: "用 Codex、Claude Code、Antigravity、Cursor 辅助理解项目结构、修改页面、运行构建、定位错误和完成最小部署。",
    summaryEn: "Use Codex, Claude Code, Antigravity, and Cursor to understand project structure, edit pages, run builds, locate errors, and ship minimum deployments.",
    outcomes: ["会给 AI 工具描述修改目标和验收标准", "能读懂项目目录、组件和配置文件的大概作用", "能让 AI 工具运行构建并解释报错", "能完成一个可访问 Demo"],
    outcomesEn: ["Describe change goals and acceptance checks to AI tools", "Understand the rough purpose of folders, components, and config files", "Ask AI tools to run builds and explain errors", "Deploy an accessible demo"],
    resources: [
      { title: "OpenAI Codex", href: "https://chatgpt.com/codex/", note: "用 Codex 读仓库、改文件、运行命令、提交 PR。", noteEn: "Use Codex to inspect repositories, edit files, run commands, and prepare PRs." },
      { title: "Claude Code Docs", href: "https://docs.anthropic.com/claude-code", note: "学习命令行 Agent 如何协助修改、测试和解释项目。", noteEn: "Learn how a CLI agent assists with edits, tests, and project explanation." },
      { title: "Cursor Docs", href: "https://docs.cursor.com/", note: "在 IDE 里用 Agent、上下文和代码库搜索完成修改。", noteEn: "Use agentic editing, context, and codebase search in an IDE." },
    ],
  },
  {
    slug: "data-engineering",
    href: "/learn/data-engineering",
    mark: "DATA",
    title: "AI 工具驱动的数据处理",
    titleEn: "AI-Tool-Assisted Data Handling",
    layer: "Enterprise Layer",
    layerEn: "Enterprise Layer",
    summary: "从 Excel、CSV、飞书表格、ERP 导出开始，学会让 AI 工具帮你识别字段、清洗样本、生成脚本、解释异常和产出数据说明。",
    summaryEn: "Start from Excel, CSV, Feishu tables, and ERP exports; learn to ask AI tools to identify fields, clean samples, generate scripts, explain anomalies, and write data notes.",
    outcomes: ["用 AI 工具生成字段字典和数据盘点表", "让 AI 辅助发现缺失、重复、异常和口径冲突", "理解 SQL/脚本的基本用途但不做语法专精", "输出业务可读的数据说明和风险提示"],
    outcomesEn: ["Use AI tools to generate field dictionaries and data inventories", "Ask AI to find missing values, duplicates, anomalies, and metric conflicts", "Understand the purpose of SQL/scripts without deep syntax study", "Ship business-readable data notes and risk warnings"],
    resources: [
      { title: "Cursor Docs", href: "https://docs.cursor.com/", note: "用 IDE Agent 生成数据清洗脚本并解释结果。", noteEn: "Use an IDE agent to generate data-cleaning scripts and explain results." },
      { title: "DuckDB Docs", href: "https://duckdb.org/docs/", note: "只作为本地 CSV/Excel 分析工具概念参考，不要求掌握数据库工程。", noteEn: "Use as a local CSV/Excel analysis reference, not as database engineering training." },
      { title: "Select Star SQL", href: "https://selectstarsql.com/", note: "需要看懂 AI 生成 SQL 时再补基础。", noteEn: "Use it when you need to understand AI-generated SQL basics." },
    ],
  },
  {
    slug: "cloud-deployment",
    href: "/learn/cloud-deployment",
    mark: "CLOUD",
    title: "AI 工具辅助部署与运行",
    titleEn: "AI-Tool-Assisted Deployment and Operations",
    layer: "Enterprise Layer",
    layerEn: "Enterprise Layer",
    summary: "学会让 AI 工具协助配置环境变量、部署静态站/API、检查日志、解释报错、准备回滚和上线说明。",
    summaryEn: "Learn to use AI tools to configure env vars, deploy static sites/APIs, inspect logs, explain errors, prepare rollback, and write launch notes.",
    outcomes: ["理解部署是可访问、可复现、可回滚，而不是发截图", "会让 AI 工具检查环境变量、构建日志和接口错误", "能画出最小可行架构 MVA，但不做云厂商底层专精", "能写出上线说明、故障处理和回滚步骤"],
    outcomesEn: ["Understand deployment as accessible, reproducible, and rollbackable, not screenshots", "Ask AI tools to inspect env vars, build logs, and API errors", "Draw an MVA without deep cloud-provider internals", "Write launch notes, incident steps, and rollback instructions"],
    resources: [
      { title: "Antigravity", href: "https://antigravity.google/", note: "用 Agent IDE 理解任务拆解、代码修改、浏览器验证和部署检查。", noteEn: "Use an agentic IDE for task breakdown, code edits, browser checks, and deployment review." },
      { title: "Vercel Docs", href: "https://vercel.com/docs", note: "静态站/API 部署的实操参考。", noteEn: "Practical reference for static site and API deployment." },
      { title: "Alibaba Cloud Architecture Center", href: "https://www.alibabacloud.com/architecture", note: "只学习部署拓扑、权限、日志、网络边界等概念，不做云架构专精。", noteEn: "Study deployment topology, access, logs, and network boundaries without deep cloud specialization." },
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
    summary: "把一句业务诉求拆成角色、场景、字段、页面、Agent 工具调用和验收标准，再交给 AI 工具迭代成 Demo。",
    summaryEn: "Turn a business request into roles, scenarios, fields, pages, agent tool calls, and acceptance checks, then use AI tools to iterate it into a demo.",
    outcomes: ["写出结构化需求 Prompt", "生成可运行前端 Demo", "定义测试样例和验收标准", "记录 Prompt 版本和失败样本"],
    outcomesEn: ["Write structured requirement prompts", "Generate runnable front-end demos", "Define tests and acceptance checks", "Track prompt versions and failure samples"],
    resources: [
      { title: "OpenAI Customer Stories", href: "https://openai.com/customer-stories", note: "观察真实组织如何把模型放入复杂工作流。", noteEn: "See how organizations deploy models into complex workflows." },
      { title: "Claude Code Docs", href: "https://docs.anthropic.com/claude-code", note: "学习如何把需求交给 Agent 拆解、修改和验证。", noteEn: "Learn how to hand requirements to an agent for breakdown, edits, and verification." },
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
    summary: "理解工具调用、状态、Human-in-the-loop、RAG、权限边界、追踪和失败回退，并用 AI 工具画流程、写 Demo、做测试。",
    summaryEn: "Understand tool calls, state, human-in-the-loop, RAG, access boundaries, tracing, and fallback; use AI tools to map flows, build demos, and add tests.",
    outcomes: ["用 AI 工具画出 Agent 状态机", "设计工具调用和人工确认点", "让 AI 生成最小 RAG Demo", "写出失败回退和审计说明"],
    outcomesEn: ["Use AI tools to draw an agent state machine", "Design tool calls and human checkpoints", "Ask AI to generate a minimal RAG demo", "Document fallback and audit rules"],
    resources: [
      { title: "Pinecone RAG Learning Center", href: "https://www.pinecone.io/learn/series/rag/", note: "理解 RAG 概念，用来判断 AI 工具生成方案是否合理。", noteEn: "Understand RAG concepts to judge AI-generated solutions." },
      { title: "LlamaIndex Docs", href: "https://docs.llamaindex.ai/", note: "作为文档接入和索引概念参考。", noteEn: "Reference document ingestion and indexing concepts." },
      { title: "LangSmith Tracing", href: "https://www.langchain.com/langsmith", note: "理解 Agent 调用链路追踪，不要求成为框架专家。", noteEn: "Understand agent tracing without becoming a framework specialist." },
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
    summary: "用 AI 工具辅助整理样本、生成测试、比较回答、检查工具轨迹和形成上线验收报告。",
    summaryEn: "Use AI tools to prepare samples, generate tests, compare answers, inspect tool traces, and produce launch acceptance reports.",
    outcomes: ["用 AI 工具生成任务级测试样本", "区分开发时试错和上线前验收", "检查工具调用路径和最终答案质量", "输出上线验收报告"],
    outcomesEn: ["Use AI tools to generate task-level test samples", "Separate dev experimentation from pre-launch acceptance", "Check tool paths and final answer quality", "Ship a launch acceptance report"],
    resources: [
      { title: "Anthropic: Evaluating AI Agents", href: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents", note: "学习 eval 思维：如何证明 Agent 可靠，而不是凭感觉试用。", noteEn: "Learn eval thinking: prove agent reliability instead of vibes-testing." },
      { title: "OpenAI Evals", href: "https://github.com/openai/evals", note: "作为评估样本和自动化测试概念参考。", noteEn: "Reference eval examples and automated testing concepts." },
      { title: "RAGAS", href: "https://docs.ragas.io/", note: "参考 RAG 指标，不要求掌握全部框架。", noteEn: "Reference RAG metrics without mastering the full framework." },
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
    summary: "训练 FDE 使用 AI 工具前的判断力：三问诊断、MECE、Pyramid Principle、80/20 范围控制、红旗识别和客户共识。",
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
      ["先让 AI 工具基于样本文件做数据审计，还是已经有安全的企业数据接口？", "Should AI tools audit sample files first, or is there already a safe enterprise data interface?"],
      ["最小可行架构是静态站 + API，还是阿里云/本地服务 + 数据库？", "Is the MVA static site + API, or cloud/local service + database?"],
      ["能否让 Codex、Claude Code、Antigravity 或 Cursor 帮你检查构建、环境变量、日志和回滚步骤？", "Can Codex, Claude Code, Antigravity, or Cursor help inspect builds, env vars, logs, and rollback steps?"],
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
  ["AI Tool Task Brief", "AI 工具任务卡", "写清楚交给 Codex、Claude Code、Antigravity、Cursor 的任务、上下文、边界和验收标准。"],
  ["Data Audit Sheet", "数据审计表", "字段字典、缺失率、重复率、异常样本、更新频率和责任人，由 AI 工具辅助生成和复核。"],
  ["Technical PRD", "技术 PRD", "把业务目标转成页面、API、数据、Agent 状态、权限和验收标准，供 AI 工具执行。"],
  ["MVA Diagram", "最小可行架构图", "用最小架构证明价值：样本数据、API、前端、模型、日志和部署位置。"],
  ["Evaluation Rubric", "评估 Rubric", "测试样本、人工评分维度、工具轨迹、幻觉检测和上线门槛。"],
  ["SOW / Boundary Note", "范围与边界说明", "明确 FDE 负责什么、不负责什么、客户需要提供什么、风险如何升级。"],
  ["ADR", "架构决策记录", "记录为什么选某个模型、云服务、数据库、RAG 路径或部署方式。"],
  ["Day-2 Runbook", "上线后运行手册", "日志查看、Prompt 更新、数据补录、故障回滚、责任人和复盘节奏。"],
];
