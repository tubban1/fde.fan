export const careerModules = [
  {
    href: "/learn/fde-career/interview-prep",
    mark: "MAP",
    zh: "FDE 职业能力地图",
    en: "FDE Career Capability Map",
    summary: "把面试准备改写成职业能力准备：角色动机、项目表达、技术判断、协作沟通和复盘能力。",
    summaryEn: "Reframe interview prep as career readiness: role motivation, project storytelling, technical judgment, collaboration, and retrospectives.",
  },
  {
    href: "/learn/fde-career/vibe-coding",
    mark: "VIBE",
    zh: "AI 工具协作开发",
    en: "AI-Assisted Vibe Coding",
    summary: "从逐行写代码转向描述意图、拆任务、审输出、跑验证，用 Codex、Claude Code、Cursor 和 Antigravity 交付 Demo。",
    summaryEn: "Move from writing every line to framing intent, decomposing tasks, reviewing output, and validating demos with AI coding tools.",
  },
  {
    href: "/learn/fde-career/agentic-system-design",
    mark: "AGENT",
    zh: "生产级 Agent 系统设计",
    en: "Production Agentic System Design",
    summary: "学习编排、结构化输出、上下文压缩、RAG、工具调用、护栏、成本控制和系统化评估。",
    summaryEn: "Study orchestration, structured output, context compression, RAG, tool calls, guardrails, cost control, and systematic evaluation.",
  },
  {
    href: "/learn/fde-career/dsa-lite",
    mark: "DSA",
    zh: "DSA Lite 技术表达",
    en: "DSA Lite for Technical Communication",
    summary: "保留算法模式训练，但不把 FDE FAN 做成刷题站：目标是能讲清复杂度、边界条件和方案权衡。",
    summaryEn: "Keep algorithm patterns as communication training, not a problem-grinding track: explain complexity, edge cases, and tradeoffs.",
  },
  {
    href: "/learn/fde-career/mock-interview",
    mark: "MOCK",
    zh: "Mock Interview 与项目复盘",
    en: "Mock Interview and Project Review",
    summary: "用真实项目做 30 分钟演示、Prompt + 输出审查、失败诊断和 STAR 复盘。",
    summaryEn: "Use real projects for 30-minute demos, prompt-output review, failure diagnosis, and STAR retrospectives.",
  },
];

export const vibeCompetencies = [
  ["意图拆解", "把一句需求拆成边界、数据、接口、状态、验收标准和风险约束。"],
  ["Policy as Code", "把安全、隐私、日志、API、错误处理、成本等规则写入任务上下文。"],
  ["验证优先", "让 AI 先生成测试、评估样本和检查清单，再生成实现。"],
  ["失败诊断", "区分 Prompt 问题、上下文问题、工具问题、架构问题和数据问题。"],
];

export const agentSystemPillars = [
  ["模块化编排", "Router / Orchestrator 把意图分发给专用 Agent，每个 Agent 只承担单一责任。"],
  ["确定性可靠性", "用结构化输出、Schema 校验、重试、降级和错误边界稳定系统。"],
  ["上下文优化", "把长对话、文档和知识库压缩为可检索、可解释、可更新的上下文。"],
  ["运营护栏", "限制循环次数、工具权限、成本预算、人工确认点和高风险动作。"],
  ["系统化评估", "用黄金测试集、LLM-as-judge、人审样本和回归评估决定能否上线。"],
];

export const dsaLitePlan = [
  ["数组与哈希", "Two Sum、去重、计数、Top K，用来训练 O(1) 查找和复杂度表达。"],
  ["双指针与滑窗", "窗口扩缩、边界条件、字符串处理，训练状态维护能力。"],
  ["栈、队列、二分", "匹配、单调结构、边界搜索，训练模板化思考。"],
  ["树与图", "DFS、BFS、拓扑排序，训练流程建模和依赖分析。"],
  ["动态规划 Lite", "只保留常见状态定义和转移表达，不追求竞赛难度。"],
];

export const mockScenarios = [
  ["30 分钟 App Build", "现场用 AI 工具完成一个小工具：先讲结构，再分模块生成，最后跑验证。"],
  ["Prompt + Output Review", "审查 AI 生成的代码、Prompt 和测试，指出安全、可靠性、可维护性问题。"],
  ["Agent 失败诊断", "给定一个回答错、工具调用错或成本失控的 Agent，定位问题层级。"],
  ["项目 STAR 复盘", "用 Situation / Task / Action / Result 讲清自己的真实项目贡献。"],
];

export const googleSourceNotes = [
  "Google Forward Deployed Engineering Interview Prep / Readme.md",
  "VIBE CODING INTERVIEW: COMPLETE MASTERY GUIDE",
  "ML DOMAIN INTERVIEW: PRODUCTION-GRADE AGENTIC SYSTEMS",
  "GOOGLE INTERVIEW PROBLEM SET",
  "python_dsa_patterns.ipynb",
];
