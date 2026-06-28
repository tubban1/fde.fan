export const navItems = [
  { href: "/learn", zh: "课程", en: "Learn" },
  { href: "/industries", zh: "行业", en: "Industries" },
  { href: "/cases", zh: "案例", en: "Cases" },
  { href: "/insights", zh: "洞察", en: "Insights" },
  { href: "/projects", zh: "项目", en: "Projects" },
  { href: "/resources", zh: "资源", en: "Resources" },
  { href: "/assessment", zh: "评分", en: "Assessment" },
  { href: "/tools/diagnosis", zh: "诊断工具", en: "Diagnosis" },
];

export const learningTracks = [
  {
    href: "/learn",
    mark: "FDE",
    zh: "AI-FDE Operating Model",
    en: "AI-FDE Operating Model",
    summary: "对齐意图、上下文、数据权限、工具调用、验证、评审和上线审计。",
    summaryEn: "Align intent, context, data access, tools, validation, review, and launch audit.",
  },
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
    href: "/industries",
    mark: "IND",
    zh: "Vertical Industry Labs",
    en: "Vertical Industry Labs",
    summary: "把跨境电商、文旅等行业拆成工具矩阵、业务流、Agent 流和交付模板。",
    summaryEn: "Turn commerce and culture-tourism into tool matrices, workflows, agents, and delivery templates.",
  },
  {
    href: "/learn/deployment",
    mark: "OPS",
    zh: "Deployment System",
    en: "Deployment System",
    summary: "把本地项目发布成稳定 URL：构建、环境变量、API、域名、日志、回滚和上线验收。",
    summaryEn: "Turn local projects into stable URLs: build, env vars, APIs, domains, logs, rollback, and launch acceptance.",
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
  ["2", "垂直行业实验室", "industry labs"],
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

export const aiFdeLoop = [
  {
    mark: "01",
    zh: "意图澄清",
    en: "Intent framing",
    text: "把一句业务诉求拆成用户、目标、边界、数据来源和验收标准。",
    textEn: "Convert a business request into users, goals, boundaries, data sources, and acceptance checks.",
  },
  {
    mark: "02",
    zh: "上下文工程",
    en: "Context engineering",
    text: "选择知识、样例、工具说明和限制条件，避免把全部材料丢给模型。",
    textEn: "Select knowledge, examples, tool specs, and constraints instead of dumping everything into the model.",
  },
  {
    mark: "03",
    zh: "工具与权限",
    en: "Tools and access",
    text: "为 Agent 设计可调用工具、数据权限、人工确认点和失败回退。",
    textEn: "Design callable tools, data access, human approvals, and fallback paths for agents.",
  },
  {
    mark: "04",
    zh: "分支交付",
    en: "Branch delivery",
    text: "用小分支、小 PR、小验收推进 Demo、工作流、部署和文档。",
    textEn: "Ship demos, workflows, deployment, and docs through small branches, reviews, and checks.",
  },
  {
    mark: "05",
    zh: "评估与审计",
    en: "Evaluation and audit",
    text: "建立测试集、人工评分、日志追踪、风险说明和上线复盘。",
    textEn: "Build eval sets, human scoring, logs, risk notes, and launch retrospectives.",
  },
];

export const industryLabs = [
  {
    href: "/industries/cross-border-commerce",
    mark: "XBR",
    zh: "跨境电商 AI 工具矩阵",
    en: "Cross-Border Commerce AI Matrix",
    summary: "基于 OPC 一人公司创业者场景，把 14 个模块、50+ 工具和链主资源转成 FDE 可交付案例。",
    summaryEn: "Turn 14 modules, 50+ tools, and platform partners into FDE-ready commerce delivery cases.",
    signals: ["选品", "POD", "AI 内容", "数字人", "广告投放", "达人建联", "ERP", "本地化", "IP 安全", "RPA", "BI", "合规", "金融", "AI 客服"],
  },
  {
    href: "/industries/culture-tourism",
    mark: "CT",
    zh: "文旅 AI 转型实验室",
    en: "Culture-Tourism AI Transformation Lab",
    summary: "面向景区、酒店、旅行社、文博场馆和目的地运营，训练内容生产、游客服务、运营调度和数据诊断。",
    summaryEn: "Train content, visitor service, operations, and data diagnosis for destinations, attractions, hotels, agencies, and museums.",
    signals: ["智能导览", "行程推荐", "多语客服", "AIGC 营销", "客流预测", "舆情分析", "收益管理", "文博知识库"],
  },
];

export const commerceModules = [
  ["选品与竞品分析", "卖家精灵 / Helium 10 / Jungle Scout / 出海匠 / Echotik", "爆款概率、关键词、竞品销量、视频拆解"],
  ["供应链与 POD", "CJ Dropshipping / 赛亿POD / 灵图POD / 1688 API", "一件代发、按需生产、库存预测、供应商评级"],
  ["AI 创意与内容生成", "Creatok / Linkfox / Vidau / TAPNOW / 可灵 / 即梦", "商品图、场景图、短视频、AI 模特、带货素材"],
  ["数字人与视频", "BOOMCUT / Topview / Vidau 数字人", "数字人口播、多语言视频、换背景、商品展示"],
  ["流量与广告投放", "TikTok Ads / Facebook Ads AI / Google Ads / XNURTA", "受众、素材、智能出价、ROI 优化"],
  ["达人建联与管理", "ProBoost / 95AI / ScoreHub", "达人筛选、批量邀约、样品风险控制"],
  ["多平台运营", "亚马逊 SPN / 美客多 / 妙手 ERP / 船长 BI / 赛狐 ERP", "多平台商品、库存、财务和运营看板"],
  ["本地化与翻译", "出海匠 / DeepL API / Google Translate API", "多语言翻译、文化适配、术语库"],
  ["IP 与账号安全", "紫鸟 / 战斧 / 猎豹 TK", "防关联、浏览器隔离、TK 专线 IP"],
  ["RPA 自动化", "影刀 / 实在", "批量上架、数据抓取、报表同步、流程编排"],
  ["数据分析与 BI", "船长 BI / Google Analytics / Power BI", "销售预测、库存预警、异常检测、自然语言查询"],
  ["合规与税务", "跨境合规 AI / 税智汇 / 小飞象 / 小麦云", "VAT、EPR、报关、政策解释和风险预警"],
  ["AI 供应链金融", "PingPong / 连连支付 / 空中云汇 / 微众银行", "资金预测、收款路由、授信评估、现金流优化"],
  ["AI 客服", "多客 AI / 3CHATAI / Zendesk AI / Intercom", "7x24 多语言客服、情绪分析、私域承接"],
];

export const tourismScenarios = [
  ["目的地内容中台", "把景区、酒店、活动、节庆、交通和本地文化材料转成短视频脚本、图文攻略和多平台发布日历。", "内容矩阵 Demo / Prompt 库 / 发布日历 / 质检清单"],
  ["游客智能服务 Agent", "面向游客提供多语言问答、路线建议、票务规则、开放时间、无障碍信息和投诉分流。", "FAQ Agent / 知识库 / 人工转接规则 / 对话测试集"],
  ["智能导览与文博讲解", "把展品、非遗、历史人物、路线节点组织成可追问、可分龄、可多语的讲解体验。", "知识图谱草案 / 导览脚本 / 语音讲解 Prompt / 风险边界"],
  ["客流与运营诊断", "结合预约、门票、天气、活动、舆情和历史客流，生成运营风险和调度建议。", "数据看板 / 异常预警 / 值班建议 / 复盘报告"],
  ["酒店与民宿收益助手", "整理房价、入住率、点评、活动和竞品数据，辅助定价、套餐和服务优化。", "收益管理表 / 点评洞察 / 套餐文案 / A/B 测试计划"],
  ["旅行社行程生成器", "根据客群、预算、出行天数、交通和偏好生成可解释行程，并自动提示合规和安全边界。", "行程生成 Demo / 合规提醒 / 报价模板 / 客户确认单"],
];
