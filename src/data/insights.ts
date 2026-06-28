export type InsightFigure = "flywheel" | "platform-shift" | "tool-stack" | "role-map" | "workshop-loop";

export interface InsightArticle {
  slug: string;
  sourceTitle: string;
  sourcePublisher: string;
  sourceUrl: string;
  title: string;
  titleEn: string;
  kicker: string;
  kickerEn: string;
  dateLabel: string;
  figure: InsightFigure;
  abstract: string;
  abstractEn: string;
  takeaways: string[];
  takeawaysEn: string[];
  tableTitle: string;
  tableTitleEn: string;
  rows: Array<[string, string, string]>;
  rowsEn: Array<[string, string, string]>;
  fdeLesson: string;
  fdeLessonEn: string;
}

export const insightArticles: InsightArticle[] = [
  {
    slug: "hfs-ai-fde-flywheel",
    sourceTitle: "The FDE-optional AI flywheel starts to spin",
    sourcePublisher: "HFS Research",
    sourceUrl: "https://www.hfsresearch.com/research/fde-optional-ai-flywheel-spin/",
    title: "AI 飞轮里的 FDE：从部署者到生产系统编排者",
    titleEn: "FDE in the AI Flywheel: From Deployer to Production Orchestrator",
    kicker: "研究解读 / AI-FDE Operating Model",
    kickerEn: "Research Brief / AI-FDE Operating Model",
    dateLabel: "Accessed 2026-06-28",
    figure: "flywheel",
    abstract:
      "这篇文章把 FDE 放在 AI 生产飞轮里理解：客户现场、业务上下文、模型能力、工具链和交付反馈不断循环。对 FDE FAN 的启发是，FDE 不是单纯写前端，也不是临时帮客户调模型，而是把需求、上下文、Agent、部署、评估和复盘连成可重复运转的系统。",
    abstractEn:
      "The article frames FDE inside an AI production flywheel: customer context, model capability, toolchain, deployment, and feedback reinforce one another. For FDE FAN, the lesson is that an FDE is not merely a front-end builder or prompt fixer, but the person who connects requirements, context, agents, deployment, evaluation, and retrospectives into a repeatable operating loop.",
    takeaways: [
      "FDE 的价值来自反馈速度：越靠近真实业务，越能发现模型和产品之间的缺口。",
      "AI 让部分部署工作自动化，但不会消除现场语境、边界判断和上线责任。",
      "课程应训练“飞轮意识”：每次交付都要沉淀 Prompt、测试集、日志、模板和复盘。",
    ],
    takeawaysEn: [
      "FDE value comes from feedback velocity: the closer to real work, the faster product-model gaps appear.",
      "AI automates parts of deployment, but it does not remove context judgment, boundary setting, and launch accountability.",
      "The course should train flywheel thinking: every delivery must leave prompts, evals, logs, templates, and retrospectives behind.",
    ],
    tableTitle: "FDE 飞轮拆解",
    tableTitleEn: "FDE Flywheel Breakdown",
    rows: [
      ["输入", "客户现场、数据、约束、成功标准", "访谈表、资料清单、验收口径"],
      ["编排", "Prompt、工具、Agent 状态、人工确认点", "工作流图、测试路径、失败回退"],
      ["反馈", "日志、用户反应、错误样本、上线复盘", "改版任务、评估集、交付文档"],
    ],
    rowsEn: [
      ["Input", "Customer context, data, constraints, success criteria", "Interview brief, input inventory, acceptance definition"],
      ["Orchestration", "Prompts, tools, agent state, human checkpoints", "Workflow map, test paths, fallback plan"],
      ["Feedback", "Logs, user response, failure samples, retrospectives", "Revision tasks, eval set, delivery docs"],
    ],
    fdeLesson:
      "FDE FAN 应把每个项目都训练成一个小飞轮：需求澄清、Demo、部署、观测、复盘、再交付，而不是一次性页面作业。",
    fdeLessonEn:
      "FDE FAN should turn every project into a small flywheel: clarify, demo, deploy, observe, review, and ship again rather than submit a one-off page.",
  },
  {
    slug: "unframe-context-platform",
    sourceTitle: "Why companies are rethinking the role of Forward Deployed Engineers",
    sourcePublisher: "Unframe",
    sourceUrl: "https://www.unframe.ai/blog/why-companies-are-rethinking-the-role-of-forward-deployed-engineers",
    title: "当上下文被平台化：FDE 的角色如何升级",
    titleEn: "When Context Becomes a Platform: How the FDE Role Changes",
    kicker: "研究解读 / Context Engineering",
    kickerEn: "Research Brief / Context Engineering",
    dateLabel: "Accessed 2026-06-28",
    figure: "platform-shift",
    abstract:
      "Unframe 的文章指出，企业重新思考 FDE，是因为过去大量依赖个人现场知识和手工集成的工作，正在被上下文平台、AI 原生工具和可复用组件重构。对课程来说，重点不是减少 FDE，而是训练 FDE 把一次性交付变成组织能力。",
    abstractEn:
      "Unframe argues that companies are rethinking FDEs because work once dependent on individual field knowledge and manual integration is being reorganized through context platforms, AI-native tools, and reusable components. For the academy, the point is not to reduce FDEs, but to train them to turn one-off delivery into organizational capability.",
    takeaways: [
      "FDE 不能只做项目英雄，要把现场知识结构化成团队可复用资产。",
      "上下文工程会成为核心技能：知道给模型什么、不该给什么、如何保持更新。",
      "交付标准应从“能跑”升级到“可维护、可审计、可移交”。",
    ],
    takeawaysEn: [
      "FDEs cannot remain project heroes; they must structure field knowledge into reusable team assets.",
      "Context engineering becomes a core skill: what to give the model, what to withhold, and how to keep it current.",
      "Delivery standards must move from 'it works' to maintainable, auditable, and transferable.",
    ],
    tableTitle: "从人肉部署到上下文平台",
    tableTitleEn: "From Manual Deployment to Context Platform",
    rows: [
      ["过去", "个人经验、现场救火、重复定制", "交付不可复制"],
      ["过渡", "模板、Prompt、脚手架、组件库", "效率提高但仍依赖个人"],
      ["目标", "上下文平台、权限、评估、可观测", "组织级 FDE 能力"],
    ],
    rowsEn: [
      ["Before", "Individual memory, field firefighting, repeated custom work", "Delivery cannot scale"],
      ["Transition", "Templates, prompts, scaffolds, component libraries", "Faster but still person-dependent"],
      ["Target", "Context platform, access control, evals, observability", "Organization-level FDE capability"],
    ],
    fdeLesson:
      "课程需要增加“上下文资产化”训练：每个案例必须交付资料结构、Prompt 版本、权限边界和维护说明。",
    fdeLessonEn:
      "The curriculum needs context-asset training: every case must ship source structure, prompt versions, access boundaries, and maintenance notes.",
  },
  {
    slug: "perspective-2026-tool-stack",
    sourceTitle: "Best Tools for Forward-Deployed Engineers 2026 Stack Comparison",
    sourcePublisher: "Perspective AI",
    sourceUrl: "https://getperspective.ai/blog/best-tools-for-forward-deployed-engineers-2026-stack-comparison",
    title: "2026 FDE 工具栈：从 IDE 到遥测的交付链路",
    titleEn: "The 2026 FDE Tool Stack: Delivery from IDE to Telemetry",
    kicker: "工具研究 / Stack Design",
    kickerEn: "Tool Brief / Stack Design",
    dateLabel: "Accessed 2026-06-28",
    figure: "tool-stack",
    abstract:
      "Perspective AI 把 FDE 工具栈拆成多条能力线：AI 编码、内部工具/低代码、工作流自动化、数据集成和可观测协作。对 FDE FAN 来说，工具不是炫技清单，而是把从需求到上线的每一段风险可视化。",
    abstractEn:
      "Perspective AI breaks the FDE stack into capability lanes: AI coding, internal tools and low-code, workflow automation, data integration, and observability/collaboration. For FDE FAN, tools are not a trophy list; they make risk visible across the path from requirement to launch.",
    takeaways: [
      "工具选择要按交付阶段，而不是按流行度。",
      "AI 编码工具解决速度，观测和协作工具解决上线责任。",
      "FDE 项目必须让学员体验环境变量、日志、错误恢复和版本回滚。",
    ],
    takeawaysEn: [
      "Choose tools by delivery stage, not popularity.",
      "AI coding tools improve speed; observability and collaboration tools carry launch accountability.",
      "FDE projects must expose learners to env vars, logs, error recovery, and rollback.",
    ],
    tableTitle: "FDE 工具链泳道",
    tableTitleEn: "FDE Toolchain Lanes",
    rows: [
      ["构建", "AI IDE、组件库、静态站框架", "更快形成 Demo"],
      ["连接", "API、数据库、自动化平台、Agent 工具", "让 Demo 接近业务流"],
      ["运行", "部署、日志、监控、Issue/PR", "让交付可维护"],
    ],
    rowsEn: [
      ["Build", "AI IDEs, component libraries, static frameworks", "Turn ideas into demos faster"],
      ["Connect", "APIs, databases, automation platforms, agent tools", "Move demos closer to business workflows"],
      ["Operate", "Deployment, logs, monitoring, issues and PRs", "Make delivery maintainable"],
    ],
    fdeLesson:
      "FDE FAN 的工具课要围绕一次完整交付展开：需求、Demo、Agent、部署、日志、报告，而不是孤立介绍工具。",
    fdeLessonEn:
      "FDE FAN tool lessons should follow a full delivery: requirement, demo, agent, deployment, logs, and report rather than isolated tool introductions.",
  },
  {
    slug: "invisible-forward-deployed-engineering",
    sourceTitle: "What Is Forward Deployed Engineering?",
    sourcePublisher: "Invisible Technologies",
    sourceUrl: "https://invisibletech.ai/blog/what-is-forward-deployed-engineering",
    title: "什么是 Forward Deployed Engineering：角色边界与交付责任",
    titleEn: "What Is Forward Deployed Engineering: Role Boundaries and Delivery Accountability",
    kicker: "角色研究 / FDE Role",
    kickerEn: "Role Brief / FDE Role",
    dateLabel: "Accessed 2026-06-28",
    figure: "role-map",
    abstract:
      "Invisible Technologies 的文章适合作为 FDE 岗位入门读物：FDE 位于客户、产品和工程之间，既要理解业务，又要把解决方案带到现场。FDE FAN 需要把这个角色翻译成训练标准：沟通、建模、实现、部署、文档和边界。",
    abstractEn:
      "Invisible Technologies offers a useful entry point to the FDE role: FDEs sit between customers, product, and engineering, understanding the business while taking solutions into the field. FDE FAN translates this into training standards: communication, modeling, implementation, deployment, documentation, and boundaries.",
    takeaways: [
      "FDE 是跨界角色，不是传统售前、实施、前端或客服的简单替代。",
      "真正的能力在于把模糊业务问题变成可运行、可验证、可移交的系统。",
      "角色边界要清楚：能做试点和交付包，但不能无授权承担企业核心系统责任。",
    ],
    takeawaysEn: [
      "FDE is a hybrid role, not a simple replacement for presales, implementation, front-end, or support.",
      "The real skill is turning ambiguous business problems into running, testable, transferable systems.",
      "Boundaries matter: FDEs can build pilots and delivery packages, but should not own core enterprise systems without mandate.",
    ],
    tableTitle: "FDE 与相邻岗位",
    tableTitleEn: "FDE and Adjacent Roles",
    rows: [
      ["售前", "证明价值、赢得信任", "FDE 还要把方案做出来并上线验证"],
      ["传统前端", "实现页面和交互", "FDE 还要理解业务流、Agent 和交付文档"],
      ["实施顾问", "配置系统和培训客户", "FDE 还要能补齐轻量工程和自动化"],
    ],
    rowsEn: [
      ["Presales", "Prove value and build trust", "FDEs also build and validate the solution"],
      ["Front-end engineer", "Implement UI and interactions", "FDEs also understand workflow, agents, and delivery docs"],
      ["Implementation consultant", "Configure systems and train customers", "FDEs also fill lightweight engineering and automation gaps"],
    ],
    fdeLesson:
      "课程首页和评分标准要继续强调边界：FDE 是轻量工程交付岗位，不承诺就业、接单或独立承担核心系统。",
    fdeLessonEn:
      "The homepage and assessment standard should keep emphasizing boundaries: FDE is a lightweight engineering delivery role, not a promise of employment, contracting, or independent core-system ownership.",
  },
  {
    slug: "kamechi-ai-ux-workshop",
    sourceTitle: "AI / UX practice note on SIer workshops and FDE-style delivery",
    sourcePublisher: "note.com / kamechi_ai_ux",
    sourceUrl: "https://note.com/kamechi_ai_ux/n/n03e655f6d383?hl=en",
    title: "从 SIer 工作坊到 FDE：价值发现、NSM 与产物驱动提示",
    titleEn: "From SIer Workshops to FDE: Value Discovery, NSM, and Artifact-Driven Prompting",
    kicker: "实践札记 / AI UX",
    kickerEn: "Practice Note / AI UX",
    dateLabel: "Accessed 2026-06-28",
    figure: "workshop-loop",
    abstract:
      "这篇实践札记把 FDE 式工作放进 SIer/UX 的日常：从客户访谈、工作坊、价值定义、NSM 设定，到用产物截图、流程图和已有资料提示 AI。对 FDE FAN 的启发是，前端 Demo 不是终点，而是让客户、模型和交付团队围绕同一个可见产物对齐。",
    abstractEn:
      "This practice note places FDE-style work inside SIer and UX routines: customer interviews, workshops, value definition, NSM selection, and prompting AI with screenshots, flow maps, and existing artifacts. For FDE FAN, the lesson is that a front-end demo is not the endpoint; it is the shared artifact that aligns customer, model, and delivery team.",
    takeaways: [
      "工作坊要产出可给 AI 使用的材料：截图、流程、字段、角色、边界和验收口径。",
      "NSM 能帮助 FDE 把“想要 AI”翻译成一个可观察的业务变化。",
      "截图和已有产物是高价值上下文，比抽象描述更容易让模型生成可验收方案。",
    ],
    takeawaysEn: [
      "Workshops should produce AI-usable artifacts: screenshots, flows, fields, roles, boundaries, and acceptance criteria.",
      "NSM helps FDEs translate 'we want AI' into an observable business change.",
      "Screenshots and existing artifacts are high-value context; they often produce more testable outputs than abstract descriptions.",
    ],
    tableTitle: "工作坊到交付物",
    tableTitleEn: "From Workshop to Deliverables",
    rows: [
      ["发现", "用户、场景、阻塞、价值假设", "访谈表 / 旅程图"],
      ["定义", "NSM、边界、字段、验收标准", "需求卡 / Prompt 模板"],
      ["交付", "Demo、Agent 流程、测试和复盘", "部署链接 / README / 演示脚本"],
    ],
    rowsEn: [
      ["Discover", "Users, scenarios, blockers, value hypotheses", "Interview brief / journey map"],
      ["Define", "NSM, boundaries, fields, acceptance checks", "Requirement card / prompt template"],
      ["Deliver", "Demo, agent flow, tests, retrospective", "Deployment link / README / demo script"],
    ],
    fdeLesson:
      "FDE FAN 需要把“客户材料整理”作为核心训练项：会问、会看、会截图、会把现场信息变成模型可用上下文。",
    fdeLessonEn:
      "FDE FAN should treat customer-material preparation as a core skill: ask, observe, capture, and transform field information into model-usable context.",
  },
];

export const insightIndexMetrics = [
  ["5", "专业来源", "professional sources"],
  ["4", "FDE 能力层", "FDE capability layers"],
  ["3", "交付表格", "delivery tables"],
  ["1", "统一课程化框架", "course-ready framework"],
];
