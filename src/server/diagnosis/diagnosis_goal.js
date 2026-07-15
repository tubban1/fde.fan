export const DIAGNOSIS_GOALS = {
  growth_conversion: {
    key: 'growth_conversion',
    label: '增长转化',
    title: '增长转化诊断',
    targetGuidance: '围绕获客、线索响应、销售跟进、成交转化、客户服务或复购，明确一个可衡量的增长结果。',
    reportGuidance: '机会地图、推荐智能体和路线图应优先服务增长链路，并用转化率、响应时效、有效线索、成交周期或复购等指标验收。'
  },
  cost_efficiency: {
    key: 'cost_efficiency',
    label: '降本增效',
    title: '降本增效诊断',
    targetGuidance: '围绕重复劳动、等待、返工、差错、跨部门流转或人力投入，明确一个可量化的成本或效率结果。',
    reportGuidance: '机会地图、推荐智能体和路线图应优先服务流程效率，并用节省工时、处理时长、吞吐量、返工率或差错率等指标验收。'
  },
  ai_pilot: {
    key: 'ai_pilot',
    label: 'AI 试点',
    title: 'AI 试点落地诊断',
    targetGuidance: '围绕 30 天内可验证的小场景，明确试点用户、输入数据、人工确认边界和一个可观察的成功指标。',
    reportGuidance: '机会地图和推荐智能体应优先选择低风险、数据可得、30 天内能演示和验收的 MVP，避免第一阶段做大范围系统改造。'
  },
  comprehensive_transformation: {
    key: 'comprehensive_transformation',
    label: '综合转型',
    title: '综合转型诊断',
    targetGuidance: '综合比较增长、降本增效、AI 试点和组织能力四类机会，最终确定一条主线目标和一个首期试点。',
    reportGuidance: '先比较增长价值、效率价值、实施难度和组织准备度，再明确一条主线目标、一个首期试点以及后续扩展顺序。'
  }
};

const GOAL_ALIASES = [
  { pattern: /增长|转化|销售|客服|运营/, key: 'growth_conversion' },
  { pattern: /降本|增效|提效|自动化|重复活/, key: 'cost_efficiency' },
  { pattern: /试点|30\s*天|小成果|mvp/i, key: 'ai_pilot' },
  { pattern: /综合|转型|梳理方向|不确定|引导/, key: 'comprehensive_transformation' }
];

export function normalizeDiagnosisGoalKey(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (DIAGNOSIS_GOALS[normalized]) return normalized;
  return GOAL_ALIASES.find(item => item.pattern.test(normalized))?.key || '';
}

export function getDiagnosisGoalDefinition(value) {
  const key = normalizeDiagnosisGoalKey(value);
  return key ? DIAGNOSIS_GOALS[key] : null;
}

export function buildDiagnosisWelcomeMessage(goal) {
  const definition = getDiagnosisGoalDefinition(goal) || DIAGNOSIS_GOALS.comprehensive_transformation;
  return `您好，已记录这次诊断的入口方向是【${definition.label}】。${definition.targetGuidance}

不过先不急着讨论 AI 工具或具体方案，我想先了解企业的基本情况，这样后面的判断会更贴合实际。

贵公司主要做什么业务或产品，通常服务哪一类客户？一句话介绍就可以。`;
}

export function formatDiagnosisGoalPrompt(goal) {
  const definition = getDiagnosisGoalDefinition(goal);
  if (!definition) {
    return '入口方向：历史会话未记录。请先从企业基本情况和用户最新表达判断方向，不要自行假定。';
  }
  return `入口方向：${definition.label}\n方向内目标要求：${definition.targetGuidance}\n报告约束：${definition.reportGuidance}`;
}
