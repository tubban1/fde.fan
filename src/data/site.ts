export const navItems = [
  { href: "/learn", zh: "课程", en: "Learn" },
  { href: "/cases", zh: "案例", en: "Cases" },
  { href: "/projects", zh: "项目", en: "Projects" },
  { href: "/resources", zh: "资源", en: "Resources" },
  { href: "/assessment", zh: "评分", en: "Assessment" },
  { href: "/tools/diagnosis", zh: "诊断工具", en: "Diagnosis" },
];

export const learningTracks = [
  {
    href: "/learn/foundations",
    mark: "WEB",
    zh: "Frontend Basics",
    en: "Frontend Basics",
    summary: "HTML、CSS、JS、React、Vite、Git 与部署基础。",
    summaryEn: "HTML, CSS, JS, React, Vite, Git, and deployment basics.",
  },
  {
    href: "/learn/prompt-to-ui",
    mark: "P2P",
    zh: "Prompt to Product",
    en: "Prompt to Product",
    summary: "把业务需求拆成页面、字段、状态、Prompt 与验收标准。",
    summaryEn: "Convert business needs into pages, fields, states, prompts, and acceptance checks.",
  },
  {
    href: "/learn/agent-workflows",
    mark: "AGT",
    zh: "Agent Workflow",
    en: "Agent Workflow",
    summary: "学习工具调用、状态、路由、协作、人审和安全边界。",
    summaryEn: "Learn tool calling, state, routing, collaboration, human review, and safety boundaries.",
  },
  {
    href: "/learn/ecommerce-ai",
    mark: "XBR",
    zh: "Cross-border AI Cases",
    en: "Cross-border AI Cases",
    summary: "客服、商品、广告、内容矩阵、运营诊断等跨境场景。",
    summaryEn: "Support, products, ads, content matrices, and operations diagnosis for commerce teams.",
  },
  {
    href: "/learn/deployment",
    mark: "OPS",
    zh: "Deployment System",
    en: "Deployment System",
    summary: "GitHub、Vercel、域名、OG 图、微信分享和上线检查。",
    summaryEn: "GitHub, Vercel, domains, OG images, WeChat sharing, and launch checks.",
  },
  {
    href: "/resources",
    mark: "DOC",
    zh: "Delivery System",
    en: "Delivery System",
    summary: "README、测试清单、演示脚本、交付文档和复盘报告。",
    summaryEn: "README, test checklist, demo script, delivery docs, and retrospective report.",
  },
];

export const weekPath = [
  ["01", "FDE 岗位认知", "Role map"],
  ["02", "需求拆解与 Prompt", "Prompt"],
  ["03", "AI 生成前端", "UI demo"],
  ["04", "AI 编程工具实战", "Coding"],
  ["05", "Agent 工作流", "Workflow"],
  ["06", "部署与交付", "Deploy"],
  ["07", "综合项目冲刺", "Capstone"],
  ["08", "结业路演与分层", "Demo day"],
];

export const stats = [
  ["8 周", "标准训练路径", "8 weeks"],
  ["20-30", "首期小班", "cohort size"],
  ["40-60h", "作业与项目开发", "project hours"],
  ["9+", "真实案例库", "case library"],
];

export const outcomes = [
  { mark: "UI", text: "前端 Demo", en: "Front-end demo" },
  { mark: "AI", text: "Agent 工作流", en: "Agent workflow" },
  { mark: "URL", text: "部署链接", en: "Deployment link" },
  { mark: "QA", text: "测试清单", en: "Test checklist" },
  { mark: "DOC", text: "README 与交付文档", en: "README and delivery docs" },
  { mark: "RISK", text: "边界与风险说明", en: "Boundary and risk notes" },
];

export const assessmentLevels = [
  ["A", "90-100", "人才库 / 项目优先推荐", "Talent pool / project priority"],
  ["B", "80-89", "项目强化班 / 作品集完善", "Project bootcamp / portfolio polish"],
  ["C", "70-79", "结业通过 / 继续练习", "Graduated / keep practicing"],
  ["D", "60-69", "暂不推荐商业交付", "Not ready for commercial delivery"],
  ["未达标", "<60", "重修核心模块", "Repeat core modules"],
];

export const boundaryItems = [
  "不承诺就业、薪资、接单或创业成功。",
  "企业真实数据进入课堂前必须脱敏。",
  "推荐机会不等于录用，最终由企业或项目组决定。",
  "学员不得独立承担商业项目核心交付。",
];

export const diagnosisFlow = [
  "邮箱登录与诊断 Session",
  "多轮轻量访谈",
  "本地快速画像抽取",
  "后台慢提取补全",
  "成熟度评分与机会地图",
  "30/60/90 天落地路线图",
];
