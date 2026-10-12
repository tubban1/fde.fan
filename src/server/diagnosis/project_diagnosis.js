import { query, isPostgresMode } from './db.js';
import { generateText } from './text_model_provider.js';

// The existing ten business-context fields are retained for historical sessions.
const CONTEXT_FIELDS = [
  ['projectOverview','项目背景','产品类型、使用者、当前状况与负责人'],
  ['objectives','目标与优先级','为什么改造、成功后的关键结果'],
  ['currentArchitecture','当前技术基础','源码、客户端/服务端、数据库、部署环境'],
  ['scopeInventory','需求与数量清单','各类功能与资源规模、可复用比例'],
  ['assetsAndRights','资产及授权','素材来源、代码授权、已有工具与权限'],
  ['migrationCompatibility','迁移与兼容性','网络协议、资源格式、脚本、数据库和战斗规则'],
  ['deliverables','交付与验收','可运行结果、性能、测试、范围外工作'],
  ['timelineAndPeople','工期与人员','目标日期、人员、依赖、阶段里程碑'],
  ['budgetAndCooperation','预算与合作','开发费、付款、分成、后续维护'],
  ['riskAndValidation','技术风险和验证','未解决问题、PoC、法律与安全风险']
];

// Mandatory decisions apply to *all* software projects, not just game migrations.
// Answers must be supported by a verbatim quotation from a customer's actual turn.
export const PROJECT_DECISIONS = Object.freeze([
  ['deliveryBoundary','最终交付边界','是交付迁移工具、交付最终可运行产品，还是两者都包括？谁负责工具运行后的修复？'],
  ['inventoryQuantities','功能与资源规模','哪些模块/功能/资源要处理？每类的数量、复杂度、是否已有、纳入或排除的范围是什么？'],
  ['sourceAccess','可用源码和接口权限','源端/目标端分别具备哪些代码、文档、接口、环境和合法使用授权？能否实际提供样本做验证？'],
  ['functionalParity','行为与功能兼容','必须保持一致的功能清单、关键交互、数值和例外功能有哪些？怎样逐项确认？'],
  ['existingDataMigration','历史业务数据迁移','需要迁移正式用户/业务历史数据还是只迁结构和配置？涉及哪些数据、脱敏、备份与回滚？'],
  ['acceptanceOwnership','验收标准与责任','由谁测试和签收，如何衡量通过，哪些性能、安全和缺陷标准必须满足，谁负责后续修复？']
]);
export const PROJECT_FIELDS = Object.freeze([...CONTEXT_FIELDS, ...PROJECT_DECISIONS]);
const KEYS = PROJECT_FIELDS.map(([key]) => key);
const DECISION_KEYS = PROJECT_DECISIONS.map(([key]) => key);
const PLACEHOLDER = /^(?:无|没有|未知|不清楚|未明确|未提供|待确认|待评估|待定|暂无|不确定|无要求|尚未确定|无信息|未回答|空|n\/a|none|tbd)[\s。！!]*$/i;
export const projectHasValue = value => typeof value === 'string' && !!value.trim() && !PLACEHOLDER.test(value.trim());

export function normalizeProjectFacts(input) {
  const facts = {};
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    for (const key of KEYS) if (projectHasValue(input[key])) facts[key] = input[key].trim().slice(0, 2400);
    const evidence = {};
    for (const key of DECISION_KEYS) {
      const item = input.requirementsEvidence?.[key];
      if (item && facts[key] && typeof item.quote === 'string' && item.quote.trim() &&
          ['confirmed','partial'].includes(item.status)) {
        evidence[key] = { status: item.status, quote: item.quote.trim().slice(0, 700) };
      }
    }
    if (Object.keys(evidence).length) facts.requirementsEvidence = evidence;
  }
  return facts;
}
export function projectDecisionChecklist(input) {
  const facts = normalizeProjectFacts(input);
  return PROJECT_DECISIONS.map(([key,label,question]) => {
    const evidence = facts.requirementsEvidence?.[key];
    return {
      key, label, question, value: facts[key] || '',
      status: evidence?.status === 'confirmed' ? 'confirmed' : (facts[key] || evidence?.status === 'partial' ? 'partial' : 'missing'),
      evidence: evidence?.quote || ''
    };
  });
}
export const projectMissing = input => {
  const facts = normalizeProjectFacts(input);
  const checked = projectDecisionChecklist(facts);
  return [
    ...CONTEXT_FIELDS.filter(([k]) => !projectHasValue(facts[k])).map(x=>x[1]),
    ...checked.filter(x=>x.status !== 'confirmed').map(x=>x.label)
  ];
};
export const projectCompleteness = input => {
  const facts = normalizeProjectFacts(input);
  const validContext = CONTEXT_FIELDS.filter(([k]) => projectHasValue(facts[k])).length;
  const validDecisions = projectDecisionChecklist(facts).filter(x=>x.status === 'confirmed').length;
  return Math.round(100 * (validContext + validDecisions) / (CONTEXT_FIELDS.length + PROJECT_DECISIONS.length));
};
export const projectDecisionReadiness = input => {
  const checklist = projectDecisionChecklist(input);
  return { confirmed: checklist.filter(x=>x.status==='confirmed').length,
    total: checklist.length, ready: checklist.every(x=>x.status==='confirmed'), checklist };
};
export const projectWelcome = goal => '你好，我是软件项目需求顾问。我们先厘清项目目标、现有源码、功能范围、兼容性、交付和合作条件。系统会跟踪六项必答决策，区分已经确认、回答不充分和尚未回答；不能把时间目标当作已经验证的工期。\n\n' +
  (goal ? '项目方向：' + goal + '\n\n' : '') + '先告诉我：准备开发或改造什么软件？目前已有怎样的系统或源码？';
export function projectChatPrompts(input, history) {
  const facts = normalizeProjectFacts(input);
  const checklist = projectDecisionChecklist(facts);
  const next = checklist.find(x => x.status !== 'confirmed');
  const contextGaps = CONTEXT_FIELDS.filter(([k]) => !facts[k]).map(([,label])=>label);
  return {
    systemPrompt: '你是严谨的通用软件项目需求分析师。每轮简短承接事实，只问一个最有价值的主问题。必须完成六项独立决策：交付边界、功能资源规模（逐类数量及是否纳入）、源代码接口权限与实际样本、功能行为兼容清单、正式历史数据迁移范围、可衡量的验收及责任。提问时能看到部分答案，就追问缺失的部分而非重复要求同一份样本。明确区分用户实际回答/工具和AI的建议；回答“需要、都可以、有文档”等不能自动表示所有细节确认。“10天”“50天”是目标，必须经过PoC验证后才可承诺。一个主问题、易懂中文，禁止JSON。',
    userPrompt: '客户历史事实：'+JSON.stringify(facts)+'\n六项决策及状态：'+JSON.stringify(checklist)+
      '\n其他缺失维度：'+contextGaps.join('、')+
      '\n优先下一问：'+(next ? next.question : '必要时补充性能指标、预算、依赖和验收证据')+
      '\n近期对话：\n'+history.map(x=>(x.sender==='user'?'客户':'顾问')+': '+x.content).join('\n')+
      '\n如果用户最新答复涉及上述决策，应先确认具体内容；若尚不充分，明确指出缺什么，再问一个问题。'
  };
}
function parseJSON(raw) {
  const fence=String.fromCharCode(96).repeat(3);
  const s=String(raw||'').split(fence).join('').replace(/^json\s*/i,'').trim();
  const a=s.indexOf('{'), b=s.lastIndexOf('}');
  if(a<0||b<a) throw new Error('模型未返回有效JSON');
  return JSON.parse(s.slice(a,b+1));
}
export function mergeProjectExtraction(priorInput, parsed, latestMessage) {
  const prior=normalizeProjectFacts(priorInput);
  const next=normalizeProjectFacts(parsed?.facts);
  const facts={...prior,...next};
  const evidence={...(prior.requirementsEvidence || {})};
  for (const key of DECISION_KEYS) if (next[key] && next[key] !== prior[key]) delete evidence[key];
  const text=String(latestMessage||'');
  for (const key of DECISION_KEYS) {
    const item=parsed?.evidence?.[key];
    // Only a literal substring of this user's message can justify a changed decision.
    if (!next[key] || !item || !['confirmed','partial'].includes(item.status) ||
      typeof item.quote!=='string' || item.quote.trim().length<2 || !text.includes(item.quote.trim())) continue;
    evidence[key]={status:item.status, quote:item.quote.trim().slice(0,700)};
  }
  if (Object.keys(evidence).length) facts.requirementsEvidence=evidence;
  return normalizeProjectFacts(facts);
}
export async function extractProjectFacts(sessionId, message, history) {
  const profiles=await query('SELECT known_facts FROM diagnosis_profiles WHERE session_id = ?',[sessionId]);
  const original=typeof profiles[0]?.known_facts==='string'?JSON.parse(profiles[0].known_facts):profiles[0]?.known_facts;
  const prior=normalizeProjectFacts(original);
  const raw=await generateText({
    task:'extraction',temperature:0.1,timeout:45000,
    systemPrompt:'你是严格的需求证据提取器。只收集用户明确说明的事实，不把顾问的建议当承诺，不得把“无、待定、未知、需要”等当成完整答复。输出JSON：{"facts":{"字段":"值"},"evidence":{"六项决策字段":{"status":"confirmed 或 partial","quote":"直接摘录当前用户最新回答中的原文"}}}。字段仅允许：'+KEYS.join(',')+'。只有该决策所有必要细节均回答时才标记 confirmed，否则用 partial；quote必须是当前用户消息的逐字子串。原有事实不需要重复输出。用户撤回时不得新增证据。',
    userPrompt:'已有画像：'+JSON.stringify(prior)+'\n六项决策描述：'+JSON.stringify(PROJECT_DECISIONS)+
      '\n最近对话：'+history.map(x=>x.sender+': '+x.content).join('\n')+'\n最新用户消息：'+message
  });
  const facts=mergeProjectExtraction(prior,parseJSON(raw),message);
  const missing=projectMissing(facts),completeness=projectCompleteness(facts);
  await query('UPDATE diagnosis_profiles SET known_facts = ?, missing_fields = ? WHERE session_id = ?',
    [JSON.stringify(facts),JSON.stringify(missing),sessionId]);
  await query("UPDATE diagnosis_sessions SET completeness = ?, profile_status = 'updated' WHERE id = ?",[completeness,sessionId]);
  return {facts,missing,completeness};
}
export async function generateProjectReport(sessionId) {
  const profiles=await query('SELECT known_facts FROM diagnosis_profiles WHERE session_id = ?',[sessionId]);
  if(!profiles.length) throw Object.assign(new Error('缺少需求画像'),{status:404});
  const stored=typeof profiles[0].known_facts==='string'?JSON.parse(profiles[0].known_facts):profiles[0].known_facts;
  const facts=normalizeProjectFacts(stored);
  const completeness=projectCompleteness(facts), decisions=projectDecisionReadiness(facts);
  if(completeness<50) throw Object.assign(new Error('需求信息不足50%，请继续补充关键事实'),{status:400});
  const raw=await generateText({
    task:'report',temperature:0.2,timeout:90000,
    systemPrompt:'你是独立软件项目技术尽调顾问，输出审慎的项目需求与技术评估初稿。严格区分客户已明确陈述事实、推断、待验证事项；严禁伪造预算、工期、兼容性、协议、验收、客户授权或模拟证据。所有六项决策缺失时必须列出阻塞，不得建议直接固定总价签约。返回严格JSON：{"summary":"","confirmedRequirements":[{"item":"","evidence":"","acceptance":""}],"compatibilityMatrix":[{"module":"","current":"","proposed":"","verification":""}],"deliverables":[""],"outOfScope":[""],"milestones":[{"stage":"","result":"","gate":""}],"risks":[""],"openQuestions":[""],"estimate":{"confidence":"待验证","duration":"","conditions":[""]},"commercialTerms":[""],"implementationPlan":[{"day":"","goal":"","aiTasks":"","humanGate":""}]}。如客户指定压缩工期，将其作为条件性目标，先安排PoC关卡、保留人工验收、异常清单和回滚，不保证全自动成功。不要把没有客户证据的建议写入已确认需求。',
    userPrompt:'客户明确事实：'+JSON.stringify(facts)+'\n六项核实状态：'+JSON.stringify(decisions.checklist)+
      '\n待确认维度：'+projectMissing(facts).join('、')+'\n信息完整度：'+completeness+'%。输出合同核对用初稿。'
  });
  const obj=parseJSON(raw);
  const report={
    kind:'software',summary:String(obj.summary||''),
    confirmedRequirements:Array.isArray(obj.confirmedRequirements)?obj.confirmedRequirements:[],
    compatibilityMatrix:Array.isArray(obj.compatibilityMatrix)?obj.compatibilityMatrix:[],
    deliverables:Array.isArray(obj.deliverables)?obj.deliverables:[],
    outOfScope:Array.isArray(obj.outOfScope)?obj.outOfScope:[],
    milestones:Array.isArray(obj.milestones)?obj.milestones:[],
    risks:Array.isArray(obj.risks)?obj.risks:[],
    openQuestions:[...(Array.isArray(obj.openQuestions)?obj.openQuestions:[]), ...projectMissing(facts).map(x=>'待补充：'+x)],
    estimate:obj.estimate&&typeof obj.estimate==='object'?obj.estimate:{confidence:'待验证',duration:'',conditions:[]},
    commercialTerms:Array.isArray(obj.commercialTerms)?obj.commercialTerms:[],
    implementationPlan:Array.isArray(obj.implementationPlan)?obj.implementationPlan:[],
    decisionChecklist:decisions.checklist,
    acceptanceReady:decisions.ready,
    completeness,preliminary:true,generatedAt:new Date().toISOString()
  };
  const sql=isPostgresMode
    ? 'INSERT INTO diagnosis_project_reports (session_id, report_json) VALUES (?, ?) ON CONFLICT (session_id) DO UPDATE SET report_json = EXCLUDED.report_json, updated_at = CURRENT_TIMESTAMP'
    : 'INSERT INTO diagnosis_project_reports (session_id, report_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE report_json = VALUES(report_json), updated_at = CURRENT_TIMESTAMP';
  await query(sql,[sessionId,JSON.stringify(report)]);
  await query("UPDATE diagnosis_sessions SET status = 'report_ready' WHERE id = ?",[sessionId]);
  await query("INSERT INTO diagnosis_messages (session_id,sender,content) VALUES (?, ?, ?)",
    [sessionId,'agent','📄 软件项目需求与技术评估初稿已生成；若六项必答决策尚未确认，不能视为最终合同或工期承诺。']);
  return report;
}
