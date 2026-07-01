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
    kicker: "课程讲义 / AI-FDE Operating Model",
    kickerEn: "Teaching Note / AI-FDE Operating Model",
    dateLabel: "Accessed 2026-06-28",
    figure: "flywheel",
    abstract:
      "我们从 AI 生产飞轮理解 FDE：客户现场、业务上下文、模型能力、工具链和交付反馈不断循环。FDE 不是单纯写前端，也不是临时帮客户调模型，而是把需求、上下文、Agent、部署、评估和复盘连成可重复运转的系统。",
    abstractEn:
      "We understand FDE through the AI production flywheel: customer context, model capability, toolchain, deployment, and feedback reinforce one another. An FDE is not merely a front-end builder or prompt fixer, but the person who connects requirements, context, agents, deployment, evaluation, and retrospectives into a repeatable operating loop.",
    takeaways: [
      "FDE 的价值来自反馈速度：越靠近真实业务，越能发现模型和产品之间的缺口。",
      "AI 让部分部署工作自动化，但不会消除现场语境、边界判断和上线责任。",
      "我们训练“飞轮意识”：每次交付都要沉淀 Prompt、测试集、日志、模板和复盘。",
    ],
    takeawaysEn: [
      "FDE value comes from feedback velocity: the closer to real work, the faster product-model gaps appear.",
      "AI automates parts of deployment, but it does not remove context judgment, boundary setting, and launch accountability.",
      "We train flywheel thinking: every delivery must leave prompts, evals, logs, templates, and retrospectives behind.",
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
      "我们要把每个项目都训练成一个小飞轮：需求澄清、Demo、部署、观测、复盘、再交付，而不是一次性页面作业。",
    fdeLessonEn:
      "We turn every project into a small flywheel: clarify, demo, deploy, observe, review, and ship again rather than submit a one-off page.",
  },
  {
    slug: "unframe-context-platform",
    sourceTitle: "Why companies are rethinking the role of Forward Deployed Engineers",
    sourcePublisher: "Unframe",
    sourceUrl: "https://www.unframe.ai/blog/why-companies-are-rethinking-the-role-of-forward-deployed-engineers",
    title: "当上下文被平台化：FDE 的角色如何升级",
    titleEn: "When Context Becomes a Platform: How the FDE Role Changes",
    kicker: "课程讲义 / Context Engineering",
    kickerEn: "Teaching Note / Context Engineering",
    dateLabel: "Accessed 2026-06-28",
    figure: "platform-shift",
    abstract:
      "我们要理解企业为什么重新思考 FDE：过去大量依赖个人现场知识和手工集成的工作，正在被上下文平台、AI 原生工具和可复用组件重构。对课程来说，重点不是减少 FDE，而是训练 FDE 把一次性交付变成组织能力。",
    abstractEn:
      "We study why companies are rethinking FDEs: work once dependent on individual field knowledge and manual integration is being reorganized through context platforms, AI-native tools, and reusable components. The point is not to reduce FDEs, but to turn one-off delivery into organizational capability.",
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
      "我们需要增加“上下文资产化”训练：每个案例必须交付资料结构、Prompt 版本、权限边界和维护说明。",
    fdeLessonEn:
      "We need context-asset training: every case must ship source structure, prompt versions, access boundaries, and maintenance notes.",
  },
  {
    slug: "perspective-2026-tool-stack",
    sourceTitle: "Best Tools for Forward-Deployed Engineers 2026 Stack Comparison",
    sourcePublisher: "Perspective AI",
    sourceUrl: "https://getperspective.ai/blog/best-tools-for-forward-deployed-engineers-2026-stack-comparison",
    title: "2026 FDE 工具栈：从 IDE 到遥测的交付链路",
    titleEn: "The 2026 FDE Tool Stack: Delivery from IDE to Telemetry",
    kicker: "工具讲义 / Stack Design",
    kickerEn: "Tool Lesson / Stack Design",
    dateLabel: "Accessed 2026-06-28",
    figure: "tool-stack",
    abstract:
      "我们把 FDE 工具栈拆成多条能力线：AI 编码、内部工具/低代码、工作流自动化、数据集成和可观测协作。工具不是炫技清单，而是把从需求到上线的每一段风险可视化。",
    abstractEn:
      "We break the FDE stack into capability lanes: AI coding, internal tools and low-code, workflow automation, data integration, and observability/collaboration. Tools are not a trophy list; they make risk visible across the path from requirement to launch.",
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
      "我们的工具课要围绕一次完整交付展开：需求、Demo、Agent、部署、日志、报告，而不是孤立介绍工具。",
    fdeLessonEn:
      "Our tool lessons should follow a full delivery: requirement, demo, agent, deployment, logs, and report rather than isolated tool introductions.",
  },
  {
    slug: "invisible-forward-deployed-engineering",
    sourceTitle: "What Is Forward Deployed Engineering?",
    sourcePublisher: "Invisible Technologies",
    sourceUrl: "https://invisibletech.ai/blog/what-is-forward-deployed-engineering",
    title: "什么是 Forward Deployed Engineer：角色边界与交付责任",
    titleEn: "What Is a Forward Deployed Engineer: Role Boundaries and Delivery Accountability",
    kicker: "角色讲义 / FDE Role",
    kickerEn: "Role Lesson / FDE Role",
    dateLabel: "Accessed 2026-06-28",
    figure: "role-map",
    abstract:
      "我们先用岗位地图理解 FDE：FDE 位于客户、产品和工程之间，既要理解业务，又要把解决方案带到现场。我们把这个角色拆成训练标准：沟通、建模、实现、部署、文档和边界。",
    abstractEn:
      "We map the FDE role between customers, product, and engineering: understanding the business while taking solutions into the field. We translate this role into training standards: communication, modeling, implementation, deployment, documentation, and boundaries.",
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
      "我们在首页和评分标准里继续强调边界：FDE 是轻量工程交付岗位，不承诺就业、接单或独立承担核心系统。",
    fdeLessonEn:
      "We keep the boundary clear in the homepage and assessment standard: FDE is a lightweight engineering delivery role, not a promise of employment, contracting, or independent core-system ownership.",
  },
  {
    slug: "kamechi-ai-ux-workshop",
    sourceTitle: "AI / UX practice note on SIer workshops and FDE-style delivery",
    sourcePublisher: "note.com / kamechi_ai_ux",
    sourceUrl: "https://note.com/kamechi_ai_ux/n/n03e655f6d383?hl=en",
    title: "从 SIer 工作坊到 FDE：价值发现、NSM 与产物驱动提示",
    titleEn: "From SIer Workshops to FDE: Value Discovery, NSM, and Artifact-Driven Prompting",
    kicker: "实践讲义 / AI UX",
    kickerEn: "Practice Lesson / AI UX",
    dateLabel: "Accessed 2026-06-28",
    figure: "workshop-loop",
    abstract:
      "我们把 FDE 式工作放进 SIer/UX 的日常训练：从客户访谈、工作坊、价值定义、NSM 设定，到用产物截图、流程图和已有资料提示 AI。前端 Demo 不是终点，而是让客户、模型和交付团队围绕同一个可见产物对齐。",
    abstractEn:
      "We place FDE-style work inside SIer and UX routines: customer interviews, workshops, value definition, NSM selection, and prompting AI with screenshots, flow maps, and existing artifacts. A front-end demo is not the endpoint; it is the shared artifact that aligns customer, model, and delivery team.",
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
      "我们把“客户材料整理”作为核心训练项：会问、会看、会截图、会把现场信息变成模型可用上下文。",
    fdeLessonEn:
      "We should treat customer-material preparation as a core skill: ask, observe, capture, and transform field information into model-usable context.",
  },
];

export const insightDeepDives: Record<string, {
  sourceMap: Array<[string, string, string]>;
  sourceMapEn: Array<[string, string, string]>;
  sections: Array<{
    title: string;
    titleEn: string;
    body: string;
    bodyEn: string;
  }>;
  assignments: string[];
  assignmentsEn: string[];
}> = {
  "hfs-ai-fde-flywheel": {
    sourceMap: [
      ["核心论点", "AI 交付正在从单次项目进入可循环的生产飞轮，FDE 是把客户现场反馈送回产品和模型系统的人。", "把 FDE 训练成飞轮运营者，而不是一次性 Demo 执行者。"],
      ["角色变化", "AI 可以自动化部分配置、代码生成和文档生成，但现场语境、优先级判断、上线责任仍需要 FDE 承担。", "训练学员判断哪些事情交给模型，哪些事情必须人工确认。"],
      ["组织意义", "企业真正需要的是能把经验、评估、模板和交付机制沉淀下来的团队能力。", "每次项目必须输出复用资产。"],
      ["风险提醒", "如果只追求模型能力或 Demo 速度，飞轮会断在上线、监控和复盘环节。", "评分标准要覆盖日志、测试、回滚和复盘。"],
    ],
    sourceMapEn: [
      ["Core thesis", "AI delivery is moving from one-off projects into a repeatable production flywheel, with FDEs carrying field feedback back into product and model systems.", "Train FDEs as flywheel operators, not one-off demo executors."],
      ["Role shift", "AI can automate parts of configuration, code generation, and documentation, but context, priority judgment, and launch accountability still need FDE ownership.", "Train learners to decide what the model can own and what requires human confirmation."],
      ["Organizational meaning", "Enterprises need team capability that preserves experience, evals, templates, and delivery mechanisms.", "Every project must leave reusable assets."],
      ["Risk warning", "If teams chase model capability or demo speed alone, the loop breaks at launch, monitoring, and retrospective.", "Assessment must cover logs, tests, rollback, and review."],
    ],
    sections: [
      {
        title: "1. 这不是“FDE 被 AI 替代”，而是 FDE 的工作对象变了",
        titleEn: "1. This is not AI replacing FDEs; it changes what FDEs operate",
        body: "“FDE-optional”容易被误读成企业不再需要 FDE。我们更准确地理解为，AI 让许多原来由 FDE 手工完成的部署动作变成可自动化组件：生成代码、整理文档、配置工作流、解释日志、批量改版。但当系统进入真实业务环境，仍然需要有人判断上下文是否完整、边界是否清楚、客户是否真的接受、结果是否能被业务验收。FDE 的工作对象从“亲手做每一个部署动作”，升级为“设计一个能不断吸收反馈的交付系统”。",
        bodyEn: "The phrase 'FDE-optional' can sound like companies no longer need FDEs. A better reading is that AI turns many formerly manual deployment activities into automatable components: code generation, documentation, workflow configuration, log explanation, and bulk revision. But once a system reaches a real business environment, someone still has to judge whether the context is complete, the boundaries are clear, the customer accepts the result, and the outcome can pass business validation. The FDE moves from doing every deployment step by hand to designing a delivery system that continuously absorbs feedback.",
      },
      {
        title: "2. 飞轮的关键不是速度，而是反馈能不能回流",
        titleEn: "2. The flywheel is not only about speed; it is about feedback returning to the system",
        body: "我们要把每个项目拆成六个回流点：需求澄清回流到模板，Prompt 失败样本回流到提示词库，用户操作问题回流到前端交互，Agent 失败路径回流到工具编排，部署事故回流到运维清单，客户复盘回流到下一版项目任务。只有这些回流点存在，AI 才不是一次性加速器，而是能持续提高交付质量的飞轮。",
        bodyEn: "We should break every project into six feedback return points: requirement clarification back to templates, prompt failures back to the prompt library, user-operation issues back to UI interaction, agent failure paths back to orchestration, deployment incidents back to the operations checklist, and customer retrospectives back to the next project task. Only with these return points does AI become more than a one-time accelerator; it becomes a flywheel that improves delivery quality.",
      },
      {
        title: "3. 面向学习者：FDE 是生产型角色，不是工具体验官",
        titleEn: "3. For learners: FDE is a production role, not a tool tourist",
        body: "我们要明确地区分 FDE 与普通 AI 工具课。普通课程教“如何使用工具”；FDE 训练必须教“如何把工具放进真实生产流程”。因此首页和课程页应强调部署链接、测试集、README、演示脚本、验收清单和复盘报告，而不仅是炫酷界面或 Prompt 技巧。",
        bodyEn: "We distinguish FDE training from ordinary AI tool classes. A normal course teaches how to use tools; FDE training teaches how to place tools inside real production workflows. The homepage and curriculum should therefore emphasize deployment URLs, eval sets, README files, demo scripts, acceptance checklists, and retrospectives rather than only polished UI or prompt tricks.",
      },
      {
        title: "4. 企业诊断 Agent 的训练要求",
        titleEn: "4. Training requirement for the Diagnosis Agent",
        body: "诊断 Agent 不能只生成一份报告，还要把访谈、画像、报告、后续任务和复盘连接起来。用户每说一句话，都应该进入画像和机会地图；每次报告生成，都应该留下可追踪字段；每次建议，都应该能转成项目任务和验收条件。这样诊断工具本身就是一个 FDE 飞轮案例。",
        bodyEn: "The Diagnosis Agent should not merely generate a report; it should connect interview, profile, report, follow-up tasks, and retrospective. Every user statement should feed the profile and opportunity map; every generated report should leave traceable fields; every recommendation should be convertible into project tasks and acceptance criteria. In that sense, the diagnosis tool itself becomes an FDE flywheel case.",
      },
    ],
    assignments: [
      "把一个已完成的项目拆成六个回流点，并写出每个回流点的可复用资产。",
      "为企业诊断 Agent 增加一张“飞轮日志表”：记录输入、模型判断、人工确认、输出和复盘。",
      "用 README 写清楚下一个 FDE 接手时应如何继续迭代。",
    ],
    assignmentsEn: [
      "Break a completed project into six feedback return points and write the reusable asset produced by each point.",
      "Add a flywheel log table to the Diagnosis Agent: input, model judgment, human confirmation, output, retrospective.",
      "Use the README to explain how the next FDE should continue iteration.",
    ],
  },
  "unframe-context-platform": {
    sourceMap: [
      ["核心论点", "企业正在重新思考 FDE，因为现场知识不能长期停留在少数人的脑子里。", "把个人经验变成上下文资产。"],
      ["平台化方向", "上下文、权限、工具、评估和组件需要被平台承载，而不是每次项目重做。", "课程要训练上下文工程。"],
      ["FDE 新职责", "FDE 不只是客户现场解决问题，还要把解决方案产品化、模板化、可复用化。", "每个作业必须产出可移交资产。"],
      ["组织风险", "如果没有平台化，FDE 成为昂贵瓶颈；如果过度平台化，又可能丢失客户现场判断。", "训练“平台 + 人”的边界。"],
    ],
    sourceMapEn: [
      ["Core thesis", "Companies are rethinking FDEs because field knowledge cannot remain inside a few individuals' heads.", "Turn individual experience into context assets."],
      ["Platform direction", "Context, permissions, tools, evals, and components must be carried by platforms rather than rebuilt each time.", "Train context engineering."],
      ["New FDE responsibility", "FDEs do not only solve problems in the field; they productize, templatize, and reuse solutions.", "Every assignment must produce transferable assets."],
      ["Organizational risk", "Without platforms, FDEs become expensive bottlenecks; with excessive platformization, teams may lose field judgment.", "Train the boundary between platform and human."],
    ],
    sections: [
      {
        title: "1. 上下文是 FDE 的核心资产",
        titleEn: "1. Context is the core FDE asset",
        body: "FDE 的现场价值往往来自对客户系统、流程、隐性规则和组织政治的理解。问题是，这些理解如果只存在于个人脑中，就无法规模化。FDE 要把现场知识转换成结构化上下文，包括数据来源、字段定义、业务规则、权限边界、异常样本、验收口径和维护说明。",
        bodyEn: "FDE value often comes from understanding customer systems, workflows, implicit rules, and organizational dynamics. The problem is that this understanding does not scale if it lives only inside an individual. We convert field knowledge into structured context: data sources, field definitions, business rules, access boundaries, failure samples, acceptance definitions, and maintenance notes.",
      },
      {
        title: "2. 平台不是替代 FDE，而是减少重复劳动",
        titleEn: "2. Platforms do not replace FDEs; they remove repeated work",
        body: "当上下文被平台化，FDE 不需要每次从零开始理解客户资料、拼接 API、写相同的工具说明或重复创建测试清单。平台负责保存和调用上下文，FDE 负责判断上下文是否完整、是否过期、是否越权、是否足以支持上线。课程中应把“资料结构化”设为必修任务。",
        bodyEn: "When context is platformized, FDEs do not need to repeatedly understand customer materials from scratch, stitch APIs, write the same tool descriptions, or recreate test checklists. The platform stores and retrieves context; the FDE judges whether it is complete, outdated, over-permissioned, or sufficient for launch. We make source structuring a required task.",
      },
      {
        title: "3. 从项目英雄到组织能力",
        titleEn: "3. From project hero to organizational capability",
        body: "传统 FDE 容易变成项目英雄：某个人很懂客户、能快速救火、能把系统跑起来。但这类能力很难复制。新的 FDE 训练应该要求学员每做一次项目，都把经验沉淀成模板、组件、Prompt、测试样本、权限说明和操作手册，让下一位同学或下一位企业同事可以接手。",
        bodyEn: "Traditional FDEs can become project heroes: someone understands the customer, fixes fires quickly, and gets the system running. But that ability is hard to reproduce. New FDE training should require learners to turn every project into templates, components, prompts, test samples, permission notes, and runbooks so another student or colleague can take over.",
      },
      {
        title: "4. 课程升级要求",
        titleEn: "4. Curriculum upgrade requirement",
        body: "我们要把课程从“会做 Demo”升级到“会沉淀组织资产”。每个案例页应该要求学员提交资料结构图、上下文选择理由、敏感信息处理方式、Prompt 版本记录、测试清单和移交说明。这样学员学到的不是一个页面，而是 FDE 的工作系统。",
        bodyEn: "We push the course from 'can build a demo' to 'can create organizational assets'. Every case should require learners to submit a source-structure map, context selection rationale, sensitive-data handling plan, prompt version history, test checklist, and handoff note. Learners then study an FDE operating system, not merely a page.",
      },
    ],
    assignments: [
      "把一个客户资料包整理成上下文目录：哪些给模型、哪些不给、哪些需要脱敏。",
      "为一个 Agent 项目写 Prompt 版本记录和权限说明。",
      "把一次人工救火过程改写成可复用的 runbook。",
    ],
    assignmentsEn: [
      "Turn a customer source pack into a context directory: what goes to the model, what does not, and what must be masked.",
      "Write prompt version history and permission notes for an agent project.",
      "Convert one manual firefighting process into a reusable runbook.",
    ],
  },
  "perspective-2026-tool-stack": {
    sourceMap: [
      ["核心论点", "FDE 工具栈不能只看单个工具，而要按交付链路组合。", "按阶段训练工具，而不是按品牌训练工具。"],
      ["能力泳道", "从 AI 编码、内部工具、自动化、数据连接到监控协作，每条泳道解决不同风险。", "课程要让每个工具对应一个交付风险。"],
      ["2026 趋势", "AI 工具提高构建速度，但上线质量依赖集成、权限、日志和团队协作。", "部署课必须讲真实运行。"],
      ["选型原则", "工具要能被学员解释：为何选、替代方案是什么、失败后如何回退。", "项目报告加入工具选型表。"],
    ],
    sourceMapEn: [
      ["Core thesis", "The FDE tool stack should be understood as a delivery chain, not a list of individual tools.", "Train tools by stage, not by brand."],
      ["Capability lanes", "AI coding, internal tools, automation, data connection, monitoring, and collaboration each address different risks.", "Every tool must map to a delivery risk."],
      ["2026 trend", "AI tools improve build speed, but launch quality depends on integration, permissions, logs, and collaboration.", "Deployment lessons must cover real operation."],
      ["Selection principle", "Learners must explain why a tool was chosen, what alternatives exist, and how to roll back if it fails.", "Add tool selection tables to project reports."],
    ],
    sections: [
      {
        title: "1. 工具栈的正确单位是交付阶段",
        titleEn: "1. The right unit for a tool stack is the delivery stage",
        body: "FDE 不应该问“今年最火的工具是什么”，而应该问“我现在卡在哪个交付阶段”：需求变成界面、界面变成代码、代码连接数据、数据进入工作流、工作流上线、上线后可观测。不同阶段需要不同工具，也有不同失败模式。",
        bodyEn: "An FDE should not ask which tool is trending this year, but which delivery stage is blocked: requirement to UI, UI to code, code to data, data to workflow, workflow to production, and production to observability. Different stages require different tools and have different failure modes.",
      },
      {
        title: "2. AI 编码工具只解决一部分问题",
        titleEn: "2. AI coding tools solve only part of the problem",
        body: "AI IDE 可以显著提高生成和修改速度，但 FDE 的难点并不只在写代码。真正消耗时间的是业务规则不清楚、数据字段不稳定、API 权限不完整、用户验收标准变化、部署环境和本地环境不一致。工具栈要覆盖这些风险，而不是只堆代码生成能力。",
        bodyEn: "AI IDEs can greatly improve generation and modification speed, but FDE difficulty is not only code. Time is often consumed by unclear business rules, unstable data fields, incomplete API permissions, shifting acceptance criteria, and differences between local and deployed environments. A tool stack must cover these risks rather than only add code generation power.",
      },
      {
        title: "3. 工具比较应该服务于决策，而不是排名",
        titleEn: "3. Tool comparison should support decisions, not rankings",
        body: "工具榜单容易让学员陷入“哪个最好”的问题。FDE 训练要把比较改成决策表：这个项目是否需要登录？是否需要数据库？是否需要内部人员维护？是否需要低代码后台？是否需要日志？是否要给客户演示？答案不同，工具选择就不同。",
        bodyEn: "Tool rankings can trap learners in asking which tool is best. FDE training should turn comparison into a decision table: does the project need login, a database, internal maintenance, a low-code admin panel, logs, or customer demonstration? Different answers lead to different tools.",
      },
      {
        title: "4. 站内训练方式",
        titleEn: "4. How we train this on the site",
        body: "资源页可以增加“工具选型模板”，要求学员填写阶段、候选工具、选择理由、风险、替代方案和回退方式。项目题库中每个项目也应规定最小工具栈，例如静态站、后端 API、数据库、日志和部署平台。",
        bodyEn: "We can add a tool-selection template requiring learners to fill in stage, candidate tools, rationale, risk, alternatives, and rollback. Each project brief specifies a minimum stack such as static site, backend API, database, logs, and deployment platform.",
      },
    ],
    assignments: [
      "为诊断 Agent 写一张工具选型表，列出构建、连接、运行三层工具。",
      "把一个项目的失败模式映射到工具：哪个工具负责发现、哪个工具负责恢复。",
      "为 Vercel 部署写一份日志查看和回滚说明。",
    ],
    assignmentsEn: [
      "Write a tool-selection table for the Diagnosis Agent covering build, connect, and operate layers.",
      "Map a project's failure modes to tools: which tool detects and which tool restores.",
      "Write a log-inspection and rollback guide for a Vercel deployment.",
    ],
  },
  "invisible-forward-deployed-engineering": {
    sourceMap: [
      ["核心论点", "FDE 位于客户、产品和工程之间，把业务问题带到现场解决。", "定义岗位边界。"],
      ["角色能力", "既要沟通业务，又要具备工程实现和部署能力。", "训练跨界交付。"],
      ["区别岗位", "FDE 不等同于售前、实施、前端或客服，但会借用这些岗位的部分能力。", "我们需要岗位地图。"],
      ["交付责任", "FDE 要让方案可运行、可验证、可移交，而不是只给建议。", "评分要看产物。"],
    ],
    sourceMapEn: [
      ["Core thesis", "FDEs sit between customer, product, and engineering and solve business problems in the field.", "Define role boundaries."],
      ["Role capabilities", "They need both business communication and engineering/deployment ability.", "Train hybrid delivery."],
      ["Role distinction", "FDEs are not presales, implementation, front-end, or support, though they borrow capabilities from each.", "We need a role map."],
      ["Delivery accountability", "FDEs make solutions runnable, testable, and transferable, not merely advisory.", "Assessment should inspect artifacts."],
    ],
    sections: [
      {
        title: "1. FDE 的难点是跨界，而不是“什么都会一点”",
        titleEn: "1. The difficulty of FDE is hybridity, not shallow generalism",
        body: "FDE 不是简单把售前、产品、前端、实施和客服揉在一起，而是在客户现场承担一个清晰责任：把模糊业务问题转成可运行解决方案，并把解决方案反馈给产品和工程体系。跨界不是泛泛而谈，而是围绕交付责任组织能力。",
        bodyEn: "An FDE is not a casual blend of presales, product, front-end, implementation, and support. The field responsibility is clear: convert ambiguous business problems into running solutions and feed those solutions back into product and engineering systems. Hybridity is organized around delivery accountability.",
      },
      {
        title: "2. 与相邻岗位的边界",
        titleEn: "2. Boundaries with adjacent roles",
        body: "售前证明价值但通常不负责长期维护；传统前端实现界面但不一定进入客户业务流；实施顾问配置系统但不一定补工程缺口；产品经理定义需求但不一定现场部署。FDE 的独特性在于同时接触客户现场和工程产物，并对试点交付的闭环负责。",
        bodyEn: "Presales proves value but usually does not maintain the solution; front-end engineers build interfaces but may not enter customer workflows; implementation consultants configure systems but may not fill engineering gaps; product managers define requirements but may not deploy in the field. The FDE is distinctive because they touch both field context and engineering artifacts while owning the pilot delivery loop.",
      },
      {
        title: "3. 我们训练哪些行为",
        titleEn: "3. Behaviors we train",
        body: "我们不只考察学生会不会写页面，而要观察学生是否会问澄清问题、是否能指出数据缺口、是否能画出业务流程、是否能设计最小可行 Demo、是否能部署到稳定 URL、是否能写清楚边界和测试方法。这些行为才构成 FDE 的岗位能力。",
        bodyEn: "We do not only check whether a student can build a page. We observe whether the student asks clarifying questions, identifies data gaps, maps workflows, designs a minimum viable demo, deploys to a stable URL, and documents boundaries and tests. These behaviors form the FDE role capability.",
      },
      {
        title: "4. 对招生承诺的约束",
        titleEn: "4. Constraints on enrollment promises",
        body: "因为 FDE 接近客户现场，我们必须明确边界：学员可以做试点、Demo、交付包和复盘，但不承诺就业、薪资、接单成功，也不能让初学者独立承担企业核心系统。这不是弱化课程价值，而是建立可信度。",
        bodyEn: "Because FDE work approaches the customer field, we state boundaries: learners can build pilots, demos, delivery packages, and retrospectives, but we do not promise jobs, salaries, contracting success, or allow beginners to independently own core enterprise systems. This does not weaken the course; it builds trust.",
      },
    ],
    assignments: [
      "画出 FDE 与售前、前端、实施、产品经理的责任边界图。",
      "为一个项目写“我能负责什么 / 不能负责什么”的边界声明。",
      "把一次客户需求改写成可运行 Demo、验收标准和移交说明。",
    ],
    assignmentsEn: [
      "Draw a responsibility map separating FDE, presales, front-end, implementation, and product management.",
      "Write a boundary statement for a project: what I can own and what I cannot own.",
      "Turn a customer request into a running demo, acceptance checks, and handoff notes.",
    ],
  },
  "kamechi-ai-ux-workshop": {
    sourceMap: [
      ["核心论点", "FDE 式交付可以从 SIer/UX 工作坊中获得方法：先发现价值，再制作产物，再用产物提示 AI。", "把工作坊纳入课程。"],
      ["价值发现", "客户不一定能直接说清需求，需要通过访谈、旅程、截图、现有流程和指标逐步逼近。", "训练提问与观察。"],
      ["NSM 思维", "用一个核心指标统一业务目标、体验设计和 AI 方案。", "让项目有可观察成功标准。"],
      ["产物驱动提示", "截图、流程图、表格、旧系统页面等，比抽象文字更能提供高质量上下文。", "训练多模态上下文整理。"],
    ],
    sourceMapEn: [
      ["Core thesis", "FDE-style delivery can borrow from SIer and UX workshops: discover value, create artifacts, then prompt AI with artifacts.", "Bring workshops into our curriculum."],
      ["Value discovery", "Customers may not state requirements clearly; interviews, journeys, screenshots, existing workflows, and metrics help approach the real need.", "Train questioning and observation."],
      ["NSM thinking", "A single core metric aligns business goals, experience design, and AI solutions.", "Give every project an observable success criterion."],
      ["Artifact-driven prompting", "Screenshots, flow maps, tables, and old system pages provide stronger context than abstract text.", "Train multimodal context preparation."],
    ],
    sections: [
      {
        title: "1. 工作坊是 FDE 的前置工程",
        titleEn: "1. Workshops are pre-engineering for FDE",
        body: "我们要把 FDE 的工程交付和 UX/SIer 的发现过程连接起来。很多企业 AI 项目失败不是因为模型不够强，而是因为前期没有把用户、流程、指标、限制和真实产物整理清楚。工作坊不是软性环节，而是让后续 Prompt、Demo 和 Agent 能准确落地的前置工程。",
        bodyEn: "We connect FDE engineering delivery with UX/SIer discovery. Many enterprise AI projects fail not because models are weak, but because users, workflows, metrics, constraints, and existing artifacts were not clarified early. Workshops are not soft activities; they are pre-engineering that enables prompts, demos, and agents to land accurately.",
      },
      {
        title: "2. NSM 把“想要 AI”变成可验证目标",
        titleEn: "2. NSM turns 'we want AI' into a verifiable objective",
        body: "客户常说想要自动化、想要增长、想要客服更聪明，但这些表达太宽。NSM 的作用是把宽泛愿望收敛成一个关键变化：响应时间、转化率、人工处理量、线索质量、内容产出速度、复购率或错误率。FDE 不一定负责最终商业结果，但必须帮助客户定义可观察的试点指标。",
        bodyEn: "Customers often say they want automation, growth, or smarter support, but these statements are broad. NSM narrows the wish into a key change: response time, conversion rate, manual workload, lead quality, content production speed, repeat purchase, or error rate. FDEs may not own final business outcomes, but they must help define observable pilot metrics.",
      },
      {
        title: "3. 用产物提示 AI，而不是只写抽象 Prompt",
        titleEn: "3. Prompt AI with artifacts, not only abstract instructions",
        body: "我们把截图、旧系统页面、表格、流程图、客服记录、邮件模板和报告样例纳入 Prompt 训练。真实企业里，最有价值的上下文往往不是一句需求，而是已有产物。学员要学会把这些产物转成模型可读、可引用、可验证的上下文。",
        bodyEn: "We include screenshots, old system pages, tables, flow maps, support records, email templates, and report samples in prompt training. In real enterprises, the highest-value context is often not a sentence of requirements but existing artifacts. Learners must turn those artifacts into model-readable, referable, and verifiable context.",
      },
      {
        title: "4. 课程落地：每个项目先做一页工作坊产物",
        titleEn: "4. Course application: every project begins with a workshop artifact",
        body: "在项目题库里，每个项目都可以要求提交一页工作坊产物：用户是谁、当前流程是什么、关键截图是什么、NSM 是什么、不能做什么、最小 Demo 证明什么。这样学生不会直接跳进代码，而是先建立业务和体验的共同语言。",
        bodyEn: "Each project brief can require a one-page workshop artifact: who the users are, what the current workflow is, what the key screenshots are, what the NSM is, what must not be done, and what the minimum demo proves. Learners do not jump directly into code; they first establish a shared business and experience language.",
      },
    ],
    assignments: [
      "为一个企业 AI 项目做一页工作坊画布：用户、流程、截图、NSM、边界、验收。",
      "用一张旧系统截图写一个 Prompt，让模型生成页面结构和字段说明。",
      "把一次访谈记录整理成 Agent 可用的上下文包。",
    ],
    assignmentsEn: [
      "Create a one-page workshop canvas for an enterprise AI project: users, workflow, screenshots, NSM, boundaries, acceptance.",
      "Use one old-system screenshot to write a prompt that asks the model for page structure and field definitions.",
      "Turn one interview transcript into a context pack usable by an agent.",
    ],
  },
};
