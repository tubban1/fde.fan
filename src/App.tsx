import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Braces,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  Code2,
  DatabaseZap,
  FileCheck2,
  Globe2,
  GraduationCap,
  Layers3,
  Rocket,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Workflow,
} from "lucide-react";

type Locale = "zh" | "en";

interface CourseModule {
  week: string;
  title: string;
  titleEn: string;
  focus: string;
  focusEn: string;
  output: string;
  outputEn: string;
}

interface ProjectCard {
  name: string;
  nameEn: string;
  scenario: string;
  scenarioEn: string;
  deliverables: string;
  deliverablesEn: string;
}

interface OutcomeMetric {
  value: string;
  label: string;
  labelEn: string;
}

interface AssessmentLevel {
  level: string;
  score: string;
  meaning: string;
  meaningEn: string;
  path: string;
  pathEn: string;
}

const t = {
  zh: {
    nav: ["定位", "训练", "项目", "结业"],
    apply: "申请加入 FDE FAN",
    explore: "查看 8 周训练路径",
    heroKicker: "AI Agent x Cross-Border Commerce x Deployment",
    heroTitle: "FDE FAN",
    heroSubtitle: "AI Agent FDE 前端部署工程师实战班",
    heroCopy:
      "训练学员把企业需求转成高质量 Prompt、可运行前端 Demo、Agent 工作流、部署链接和完整交付文档。",
    chips: ["8 周标准班", "20-30 人首期小班", "40-60 小时项目开发", "7-8 周综合路演"],
    live: "LIVE TRAINING OPS",
    notCourse: "不是传统前端课，也不是单纯 AI 工具课。",
    fdeDefinition:
      "FDE 是面向企业 AI 应用落地的轻量工程交付岗位。它把业务问题拆解成可执行任务，再用 AI 编程工具、Agent 平台、协同自动化和部署流程完成可演示、可运行、可交付的成果。",
    roleCards: [
      ["业务诊断", "识别跨境电商业务里适合引入 AI 的环节"],
      ["Prompt 到页面", "用高质量提示词生成、迭代、审核前端界面"],
      ["Agent 工作流", "搭建 FAQ、任务分发、通知流转和知识库 Demo"],
      ["部署交付", "完成访问测试、README、演示脚本和交付包"],
    ],
    systemTitle: "8 周训练系统",
    systemCopy: "课堂时间集中在实战：需求拆解、AI 生成代码、工作流搭建、部署验收和项目路演。",
    outcomesTitle: "学员最终带走什么",
    outcomesCopy: "每个成果都面向企业可演示、可复盘、可归档的真实交付链路。",
    projectTitle: "Project Lab",
    projectCopy: "项目题库围绕跨境电商企业的真实轻量 AI 应用场景设计。",
    assessmentTitle: "评分、分层与后续路径",
    assessmentCopy: "结业不是一句证书口号，而是作品、能力评分、项目表现和边界意识的综合判断。",
    boundariesTitle: "清晰边界，可信招生",
    boundaries: [
      "不承诺就业、薪资、接单或创业成功。",
      "推荐机会不等于录用，最终由企业或项目组决定。",
      "企业真实数据进入课堂前必须脱敏。",
      "学员不得独立承担商业项目核心交付。",
    ],
    contactTitle: "让下一位 FDE 从这里起飞",
    contactCopy: "首期重点不是盲目扩大规模，而是跑通招生筛选、视频预习、课堂实战、项目验收、人才分层、作品沉淀和企业转化机制。",
    contactButton: "预约说明会 / 获取报名表",
    foot: "FDE FAN - Built for AI Agent delivery training.",
  },
  en: {
    nav: ["Role", "Training", "Projects", "Graduation"],
    apply: "Apply for FDE FAN",
    explore: "Explore the 8-Week Path",
    heroKicker: "AI Agent x Cross-Border Commerce x Deployment",
    heroTitle: "FDE FAN",
    heroSubtitle: "Front-End Deployment Engineer for AI Agent Delivery",
    heroCopy:
      "Train learners to turn business needs into precise prompts, runnable front-end demos, Agent workflows, deployment links, and complete delivery documents.",
    chips: ["8-Week Program", "20-30 Learners", "40-60 Project Hours", "Weeks 7-8 Demo Day"],
    live: "LIVE TRAINING OPS",
    notCourse: "Not a traditional front-end course. Not a generic AI tool class.",
    fdeDefinition:
      "FDE is a lightweight engineering delivery role for enterprise AI adoption. It breaks business problems into executable tasks, then ships demos with AI coding tools, Agent platforms, collaboration automation, and deployment workflows.",
    roleCards: [
      ["Business Diagnosis", "Identify where cross-border teams can apply AI"],
      ["Prompt to Interface", "Generate, iterate, and review front-end UI with prompts"],
      ["Agent Workflow", "Build FAQ, task-routing, notification, and knowledge-base demos"],
      ["Deploy and Deliver", "Ship tests, README, demo scripts, and delivery packages"],
    ],
    systemTitle: "8-Week Training System",
    systemCopy: "Class time focuses on doing: requirement breakdown, AI-generated code, workflows, deployment checks, and final demos.",
    outcomesTitle: "What Learners Leave With",
    outcomesCopy: "Every output maps to a demonstrable, reviewable, reusable enterprise delivery workflow.",
    projectTitle: "Project Lab",
    projectCopy: "The project bank is designed around practical AI application scenarios for cross-border commerce teams.",
    assessmentTitle: "Assessment, Levels, and Next Paths",
    assessmentCopy: "Graduation is based on work, scoring, project behavior, and responsible delivery boundaries.",
    boundariesTitle: "Clear Boundaries, Credible Enrollment",
    boundaries: [
      "No promise of employment, salary, freelance orders, or startup success.",
      "Recommendations are not offers; final decisions belong to companies or project teams.",
      "Real enterprise data must be anonymized before entering class.",
      "Learners may not independently own core delivery of commercial projects.",
    ],
    contactTitle: "Launch the Next FDE From Here",
    contactCopy: "The first cohort focuses on proving the full mechanism: screening, pre-study, live practice, project review, talent levels, portfolio assets, and enterprise conversion.",
    contactButton: "Book Briefing / Get Application Form",
    foot: "FDE FAN - Built for AI Agent delivery training.",
  },
};

const modules: CourseModule[] = [
  {
    week: "01",
    title: "岗位认知与企业业务诊断",
    titleEn: "Role Map and Business Diagnosis",
    focus: "FDE 边界、交付链路、跨境企业场景拆解",
    focusEn: "FDE scope, delivery chain, cross-border business mapping",
    output: "岗位认知图 / 业务分析表",
    outputEn: "Role map / business analysis sheet",
  },
  {
    week: "02",
    title: "需求拆解与 Prompt 结构",
    titleEn: "Requirement Breakdown and Prompt Structure",
    focus: "从原始需求提炼页面目标、字段、流程和验收标准",
    focusEn: "Turn raw needs into page goals, fields, flows, and acceptance criteria",
    output: "需求转页面 Prompt",
    outputEn: "Requirement-to-page prompt",
  },
  {
    week: "03",
    title: "AI 生成前端页面",
    titleEn: "AI-Generated Front-End Pages",
    focus: "展示页、表单页、报告页、管理后台和工具型 Demo",
    focusEn: "Landing pages, forms, reports, dashboards, and tool demos",
    output: "可运行前端 Demo",
    outputEn: "Runnable front-end demo",
  },
  {
    week: "04",
    title: "AI 编程工具实战",
    titleEn: "AI Coding Tool Practice",
    focus: "项目创建、代码修改、Bug 修复、README 生成",
    focusEn: "Project creation, code edits, bug fixes, README generation",
    output: "小型项目模块",
    outputEn: "Small project module",
  },
  {
    week: "05",
    title: "Agent 工作流与企业协同",
    titleEn: "Agent Workflows and Collaboration",
    focus: "FAQ Agent、任务分发、多维表格、通知流转",
    focusEn: "FAQ Agents, task routing, tables, and notifications",
    output: "Agent / 工作流 Demo",
    outputEn: "Agent / workflow demo",
  },
  {
    week: "06",
    title: "数据处理、部署与交付",
    titleEn: "Data, Deployment, and Delivery",
    focus: "轻量脚本、API 调用、本地运行、静态部署、测试清单",
    focusEn: "Light scripts, API calls, local runs, static deploys, test checklists",
    output: "部署链接 / 交付包",
    outputEn: "Deployment link / delivery pack",
  },
  {
    week: "07",
    title: "综合项目冲刺",
    titleEn: "Capstone Sprint",
    focus: "分组推进企业 AI 应用 Demo，整合前端、Agent 和文档",
    focusEn: "Group sprint for enterprise AI demos across UI, Agent, and docs",
    output: "项目终版包",
    outputEn: "Final project package",
  },
  {
    week: "08",
    title: "结业路演与人才分层",
    titleEn: "Demo Day and Talent Levels",
    focus: "路演彩排、导师评分、作品归档、后续路径建议",
    focusEn: "Pitch rehearsal, mentor scoring, portfolio archive, next path",
    output: "结业评分表 / 作品库",
    outputEn: "Graduation scorecard / portfolio library",
  },
];

const projects: ProjectCard[] = [
  {
    name: "跨境电商 AI 诊断系统",
    nameEn: "Cross-Border AI Diagnosis System",
    scenario: "企业希望快速判断哪些业务环节适合引入 AI。",
    scenarioEn: "A company needs to identify where AI can improve operations.",
    deliverables: "诊断表单、报告页、推荐矩阵、交付说明",
    deliverablesEn: "Diagnosis form, report page, recommendation matrix, delivery notes",
  },
  {
    name: "TikTok 内容矩阵生成工具",
    nameEn: "TikTok Content Matrix Generator",
    scenario: "根据产品快速生成多平台内容素材。",
    scenarioEn: "Generate multi-platform content from product inputs.",
    deliverables: "输入表单、内容批量结果、导出说明",
    deliverablesEn: "Input form, batch content output, export guide",
  },
  {
    name: "跨境客服 FAQ Agent",
    nameEn: "Cross-Border FAQ Agent",
    scenario: "客服重复问题多，需要基础 FAQ Agent。",
    scenarioEn: "Support teams need a basic FAQ Agent for repeated questions.",
    deliverables: "知识库、问答流程、测试记录",
    deliverablesEn: "Knowledge base, Q&A flow, test records",
  },
  {
    name: "企业需求收集与任务分发系统",
    nameEn: "Request Intake and Task Router",
    scenario: "企业需求收集分散，需要统一入口和自动分发。",
    scenarioEn: "Requests are scattered and need one intake plus routing flow.",
    deliverables: "需求表单、分发表、通知流程",
    deliverablesEn: "Request form, routing table, notification flow",
  },
  {
    name: "商品信息批量整理工具",
    nameEn: "Product Data Batch Organizer",
    scenario: "商品资料需要整理成标准化内容。",
    scenarioEn: "Product material must be cleaned into a standard structure.",
    deliverables: "数据清洗脚本、输出表、风险说明",
    deliverablesEn: "Cleaning script, output table, risk notes",
  },
  {
    name: "AI 工具矩阵推荐页",
    nameEn: "AI Tool Matrix Recommendation Page",
    scenario: "企业不知道不同业务场景适合哪些 AI 工具。",
    scenarioEn: "Teams need guidance on which AI tools match each workflow.",
    deliverables: "工具矩阵、筛选交互、推荐说明",
    deliverablesEn: "Tool matrix, filters, recommendation notes",
  },
  {
    name: "企业知识库问答 Demo",
    nameEn: "Enterprise Knowledge Q&A Demo",
    scenario: "内部资料分散，需要基础知识库问答能力。",
    scenarioEn: "Internal documents are fragmented and need a Q&A demo.",
    deliverables: "资料结构、问答 Agent、引用规则",
    deliverablesEn: "Document structure, Q&A Agent, citation rules",
  },
  {
    name: "广告文案批量生成器",
    nameEn: "Ad Copy Batch Generator",
    scenario: "企业需要快速生成不同平台广告素材。",
    scenarioEn: "Teams need to generate ad copy for multiple platforms quickly.",
    deliverables: "平台模板、批量生成页、审核清单",
    deliverablesEn: "Platform templates, batch page, review checklist",
  },
];

const outcomes: OutcomeMetric[] = [
  { value: "Demo", label: "前端页面 / 轻量后台", labelEn: "Front-end pages / lightweight dashboards" },
  { value: "Agent", label: "业务工作流 / 知识库问答", labelEn: "Business workflows / knowledge Q&A" },
  { value: "Deploy", label: "可访问链接 / 测试清单", labelEn: "Live links / test checklists" },
  { value: "Docs", label: "README / 交付文档 / 复盘报告", labelEn: "README / delivery docs / retrospectives" },
];

const levels: AssessmentLevel[] = [
  {
    level: "A",
    score: "90-100",
    meaning: "优秀",
    meaningEn: "Excellent",
    path: "进入 FDE 人才库，优先推荐项目、实习或企业面试",
    pathEn: "Talent pool with priority project, internship, or interview recommendations",
  },
  {
    level: "B",
    score: "80-89",
    meaning: "良好",
    meaningEn: "Strong",
    path: "进入项目强化班或继续项目训练",
    pathEn: "Eligible for project bootcamp or continued practice",
  },
  {
    level: "C",
    score: "70-79",
    meaning: "合格",
    meaningEn: "Qualified",
    path: "可结业，建议继续补强项目能力",
    pathEn: "Graduate with continued project strengthening recommended",
  },
  {
    level: "D",
    score: "60-69",
    meaning: "待提升",
    meaningEn: "Needs Growth",
    path: "建议补交、补训或延期结业",
    pathEn: "Make-up work, retraining, or delayed graduation recommended",
  },
  {
    level: "N",
    score: "<60",
    meaning: "不达标",
    meaningEn: "Not Ready",
    path: "不建议结业，不进入项目池",
    pathEn: "No graduation recommended; not added to project pool",
  },
];

const iconMap = [Globe2, Braces, Code2, Workflow, DatabaseZap, Rocket, GraduationCap, ShieldCheck];

function pick<T>(locale: Locale, zh: T, en: T) {
  return locale === "zh" ? zh : en;
}

function App() {
  const [locale, setLocale] = useState<Locale>("zh");
  const copy = t[locale];
  const animatedLines = useMemo(
    () => [
      "prompt.compile({ business: 'cross-border', goal: 'demo' })",
      "agent.route('FAQ', 'task-intake', 'notification')",
      "deploy.preview -> https://fde-fan.demo",
      "handoff.pack(['README', 'test-list', 'pitch-script'])",
    ],
    [],
  );

  return (
    <main className="min-h-screen overflow-hidden bg-void text-white">
      <div className="fixed inset-0 -z-20 bg-radial-signal" />
      <div className="fixed inset-0 -z-10 grid-mask opacity-70" />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-void/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="FDE FAN home">
            <span className="flex h-9 w-9 items-center justify-center border border-neon/50 bg-neon/10 text-neon shadow-glow">
              <CircuitBoard size={18} />
            </span>
            <span className="font-display text-sm font-black tracking-[0.26em] text-white">FDE FAN</span>
          </a>
          <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.22em] text-white/58 md:flex">
            {copy.nav.map((item, index) => (
              <a key={item} className="transition hover:text-neon" href={["#role", "#training", "#projects", "#assessment"][index]}>
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 border border-white/12 bg-white/5 p-1">
            {(["zh", "en"] as Locale[]).map((item) => (
              <button
                key={item}
                className={`min-w-12 px-3 py-1.5 text-xs font-bold transition ${
                  locale === item ? "bg-neon text-void" : "text-white/64 hover:text-white"
                }`}
                type="button"
                onClick={() => setLocale(item)}
              >
                {item === "zh" ? "中文" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section id="top" className="relative min-h-screen px-4 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 34 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="mb-5 inline-flex items-center gap-2 border border-neon/30 bg-neon/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-neon">
              <Sparkles size={15} />
              {copy.heroKicker}
            </div>
            <h1 className="hero-title font-display text-[clamp(4.3rem,13vw,11.5rem)] font-black leading-[0.78] text-white">
              FDE
              <span className="block text-outline">FAN</span>
            </h1>
            <p className="mt-7 max-w-3xl text-[clamp(1.3rem,3.2vw,2.8rem)] font-black leading-tight text-white">
              {copy.heroSubtitle}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">{copy.heroCopy}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a className="cta-primary" href="#contact">
                {copy.apply}
                <ArrowRight size={18} />
              </a>
              <a className="cta-secondary" href="#training">
                {copy.explore}
                <ChevronRight size={18} />
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {copy.chips.map((chip) => (
                <span key={chip} className="border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/82">
                  {chip}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative mx-auto w-full max-w-[640px]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="hud-panel relative overflow-hidden border border-white/14 bg-ink/78 p-4 shadow-glow backdrop-blur">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase tracking-[0.26em] text-signal">{copy.live}</span>
                <span className="flex items-center gap-2 text-xs text-neon">
                  <span className="h-2 w-2 animate-pulse bg-neon" />
                  READY
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {animatedLines.map((line, index) => (
                  <motion.div
                    key={line}
                    className="terminal-tile"
                    animate={{ y: [0, -5, 0], opacity: [0.76, 1, 0.76] }}
                    transition={{ duration: 3 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <TerminalSquare className="text-neon" size={18} />
                    <span>{line}</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 h-64 overflow-hidden border border-neon/18 bg-black/30 p-4">
                <div className="ops-grid">
                  {modules.map((module, index) => {
                    const Icon = iconMap[index];
                    return (
                      <motion.div
                        key={module.week}
                        className="ops-node"
                        animate={{ boxShadow: ["0 0 0 rgba(69,244,255,0)", "0 0 22px rgba(69,244,255,.28)", "0 0 0 rgba(69,244,255,0)"] }}
                        transition={{ duration: 2.4, delay: index * 0.2, repeat: Infinity }}
                      >
                        <Icon size={18} />
                        <span>{module.week}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="role" className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">WHAT IS FDE</p>
          <h2>{copy.notCourse}</h2>
          <p>{copy.fdeDefinition}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {copy.roleCards.map(([title, body], index) => {
            const Icon = [Bot, Braces, Workflow, FileCheck2][index];
            return (
              <motion.article
                key={title}
                className="role-card"
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              >
                <Icon className="text-neon" size={28} />
                <h3>{title}</h3>
                <p>{body}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section id="training" className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">TRAINING SYSTEM</p>
          <h2>{copy.systemTitle}</h2>
          <p>{copy.systemCopy}</p>
        </div>
        <div className="stage-rail">
          {modules.map((module, index) => (
            <article key={module.week} className="stage-card">
              <span className="week-badge">W{module.week}</span>
              <h3>{pick(locale, module.title, module.titleEn)}</h3>
              <p>{pick(locale, module.focus, module.focusEn)}</p>
              <div className="mt-auto border-t border-white/10 pt-4 text-sm font-bold text-signal">
                {pick(locale, module.output, module.outputEn)}
              </div>
              {index < modules.length - 1 && <div className="rail-line" />}
            </article>
          ))}
        </div>
      </section>

      <section className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">DELIVERABLES</p>
          <h2>{copy.outcomesTitle}</h2>
          <p>{copy.outcomesCopy}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {outcomes.map((outcome) => (
            <div key={outcome.value} className="metric-card">
              <span>{outcome.value}</span>
              <p>{pick(locale, outcome.label, outcome.labelEn)}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="projects" className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">PROJECT LAB</p>
          <h2>{copy.projectTitle}</h2>
          <p>{copy.projectCopy}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {projects.map((project, index) => (
            <motion.article key={project.name} className="project-card" whileHover={{ y: -8 }}>
              <div className="flex items-start justify-between gap-4">
                <span className="project-index">{String(index + 1).padStart(2, "0")}</span>
                <Layers3 className="text-plasma" size={22} />
              </div>
              <h3>{pick(locale, project.name, project.nameEn)}</h3>
              <p>{pick(locale, project.scenario, project.scenarioEn)}</p>
              <div className="project-hover">
                <span>{locale === "zh" ? "交付物" : "Deliverables"}</span>
                <strong>{pick(locale, project.deliverables, project.deliverablesEn)}</strong>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="assessment" className="section-wrap">
        <div className="section-heading">
          <p className="eyebrow">ASSESSMENT</p>
          <h2>{copy.assessmentTitle}</h2>
          <p>{copy.assessmentCopy}</p>
        </div>
        <div className="assessment-grid">
          {levels.map((level) => (
            <div key={level.level} className="level-card">
              <div>
                <span className="level-mark">{level.level}</span>
                <span className="ml-3 text-sm font-bold text-white/50">{level.score}</span>
              </div>
              <h3>{pick(locale, level.meaning, level.meaningEn)}</h3>
              <p>{pick(locale, level.path, level.pathEn)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-wrap">
        <div className="boundary-panel">
          <div>
            <p className="eyebrow">BOUNDARIES</p>
            <h2>{copy.boundariesTitle}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {copy.boundaries.map((item) => (
              <div key={item} className="boundary-item">
                <CheckCircle2 size={20} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl border border-neon/20 bg-neon/10 p-6 shadow-glow sm:p-10 lg:p-14">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">JOIN FDE FAN</p>
              <h2 className="max-w-4xl font-display text-[clamp(2.1rem,6vw,5.6rem)] font-black leading-none">
                {copy.contactTitle}
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/72 sm:text-lg">{copy.contactCopy}</p>
            </div>
            <a className="cta-primary whitespace-nowrap" href="mailto:hello@fde.fan?subject=FDE%20FAN%20Application">
              {copy.contactButton}
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
        <footer className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>{copy.foot}</span>
          <span>AI Agent / Prompt / Front-End / Workflow / Deploy</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
