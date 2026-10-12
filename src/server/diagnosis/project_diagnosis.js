import { query, isPostgresMode } from './db.js';
import { generateText } from './text_model_provider.js';

export const PROJECT_FIELDS = [
  ['projectOverview','项目背景','项目类型、使用者、当前状况与负责人'],
  ['objectives','目标与优先级','为什么改造、成功后的关键结果'],
  ['currentArchitecture','当前技术基础','源码、客户端/服务端、数据库、部署环境'],
  ['scopeInventory','需求与数量清单','地图、NPC、装备、怪物及系统功能'],
  ['assetsAndRights','资产及授权','素材来源、代码授权、已有工具与权限'],
  ['migrationCompatibility','迁移与兼容性','网络协议、资源格式、脚本、数据库和战斗规则'],
  ['deliverables','交付与验收','可运行结果、性能、测试、范围外工作'],
  ['timelineAndPeople','工期与人员','目标日期、人员、依赖、阶段里程碑'],
  ['budgetAndCooperation','预算与合作','开发费、付款、分成、后续维护'],
  ['riskAndValidation','技术风险和验证','未解决问题、PoC、法律与安全风险']
];
const KEYS=PROJECT_FIELDS.map(x=>x[0]);
export const projectMissing = facts => PROJECT_FIELDS.filter(([k]) => !facts[k]).map(x=>x[1]);
export const projectCompleteness = facts => Math.round(100 * KEYS.filter(k=>facts[k]).length / KEYS.length);
const cleanFacts = facts => Object.fromEntries(KEYS.filter(k => typeof facts?.[k] === 'string' && facts[k].trim()).map(k => [k, facts[k].trim().slice(0,2000)]));
export const projectWelcome = goal => '你好，我是软件项目需求顾问。我们先厘清项目目标、现有源码、功能范围、兼容性、交付和合作条件。已确认事实与推测会分开记录，不会把工期目标当成技术承诺。\n\n' + (goal ? '项目方向：' + goal + '\n\n' : '') + '先告诉我：准备开发或改造什么软件？目前已有怎样的系统或源码？';
export const projectChatPrompts = (facts, history) => ({
  systemPrompt: '你是资深软件项目需求分析师和技术架构顾问，帮助客户和技术合作方确定真实范围、证据、验收和报价前提。每轮先做一句基于事实的判断，再只问一个最重要的问题。动态围绕目标、现有技术、源码与授权、功能、资源、兼容性、部署、性能、安全、工期、预算、双方责任、验收和非目标追问。不猜技术栈和成本，不将用户的期望工期称为已证实工期。如果项目涉及传奇2与传奇3，应区分玩法、客户端、服务端、资源、脚本、协议等，不假设能直接兼容。只用中文自然语言，简洁，禁止JSON。',
  userPrompt: '已确认事实：'+JSON.stringify(facts)+'\n尚待补充：'+projectMissing(facts).join('、')+'\n最近对话：\n'+history.map(x=> (x.sender==='user'?'客户':'顾问')+': '+x.content).join('\n')+'\n请给出短判断和一个追问。'
});
function parseJSON(raw) {
  const fence=String.fromCharCode(96).repeat(3);
  const s=String(raw||'').split(fence).join('').replace(/^json\s*/i,'').trim(), a=s.indexOf('{'), b=s.lastIndexOf('}');
  if(a<0||b<a) throw new Error('模型未返回有效JSON');
  return JSON.parse(s.slice(a,b+1));
}
export async function extractProjectFacts(sessionId, message, history) {
  const profiles=await query('SELECT known_facts FROM diagnosis_profiles WHERE session_id = ?', [sessionId]);
  const prior=cleanFacts(typeof profiles[0]?.known_facts==='string'?JSON.parse(profiles[0].known_facts):profiles[0]?.known_facts);
  const raw=await generateText({
    task:'extraction',temperature:0.1,timeout:45000,
    systemPrompt:'严格需求事实提取器。根据已有事实、最近对话和用户最新回复更新十类字段。只提取客户明确陈述、确认或纠正的事实，不能把顾问建议当事实。其他已有事实必须保留。若客户明确否定旧信息应更新该字段。输出JSON对象 {"facts":{...}}，字段仅允许：'+KEYS.join(','),
    userPrompt:'已有事实：'+JSON.stringify(prior)+'\n最近对话：'+history.map(x=>x.sender+': '+x.content).join('\n')+'\n最新回复：'+message
  });
  const next=cleanFacts(parseJSON(raw).facts);
  const facts={...prior,...next}, missing=projectMissing(facts), completeness=projectCompleteness(facts);
  await query('UPDATE diagnosis_profiles SET known_facts = ?, missing_fields = ? WHERE session_id = ?',[JSON.stringify(facts),JSON.stringify(missing),sessionId]);
  await query("UPDATE diagnosis_sessions SET completeness = ?, profile_status = 'updated' WHERE id = ?",[completeness,sessionId]);
  return {facts,missing,completeness};
}
export async function generateProjectReport(sessionId) {
  const profiles=await query('SELECT known_facts FROM diagnosis_profiles WHERE session_id = ?', [sessionId]);
  if(!profiles.length) throw Object.assign(new Error('缺少需求画像'),{status:404});
  const facts=cleanFacts(typeof profiles[0].known_facts==='string'?JSON.parse(profiles[0].known_facts):profiles[0].known_facts);
  const completeness=projectCompleteness(facts);
  if(completeness<50) throw Object.assign(new Error('需求完整度不足50%，请继续补充关键事实'),{status:400});
  const raw=await generateText({
    task:'report',temperature:0.2,timeout:90000,
    systemPrompt:'你是独立软件项目技术尽调顾问，输出审慎的项目需求和技术评估草稿。严格区分客户已经确认的事实和未核实的可能性；不虚构预算、工期、兼容性或客户承诺，项目未检验不能声称已经可行。返回严格 JSON：{"summary":"","confirmedRequirements":[{"item":"","evidence":"","acceptance":""}],"compatibilityMatrix":[{"module":"","current":"","proposed":"","verification":""}],"deliverables":[""],"outOfScope":[""],"milestones":[{"stage":"","result":"","gate":""}],"risks":[""],"openQuestions":[""],"estimate":{"confidence":"待验证","duration":"","conditions":[""]},"commercialTerms":[""]}。没有依据的字段留空或注明待验证。保留可用于双方逐项确认的清单。',
    userPrompt:'客户已知事实：'+JSON.stringify(facts)+'\n未回答维度：'+projectMissing(facts).join('、')+'\n信息完整度：'+completeness+'%。输出需求与技术评估初稿。'
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
    openQuestions:[...(Array.isArray(obj.openQuestions)?obj.openQuestions:[]),...projectMissing(facts).map(x=>'待补充：'+x)],
    estimate:obj.estimate&&typeof obj.estimate==='object'?obj.estimate:{confidence:'待验证',duration:'',conditions:[]},
    commercialTerms:Array.isArray(obj.commercialTerms)?obj.commercialTerms:[],
    completeness,preliminary:true,generatedAt:new Date().toISOString()
  };
  const sql=isPostgresMode
    ? 'INSERT INTO diagnosis_project_reports (session_id, report_json) VALUES (?, ?) ON CONFLICT (session_id) DO UPDATE SET report_json = EXCLUDED.report_json, updated_at = CURRENT_TIMESTAMP'
    : 'INSERT INTO diagnosis_project_reports (session_id, report_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE report_json = VALUES(report_json), updated_at = CURRENT_TIMESTAMP';
  await query(sql,[sessionId,JSON.stringify(report)]);
  await query("UPDATE diagnosis_sessions SET status = 'report_ready' WHERE id = ?",[sessionId]);
  await query("INSERT INTO diagnosis_messages (session_id,sender,content) VALUES (?, ?, ?)",[sessionId,'agent','📄 软件项目需求与技术评估初稿已生成。请核对已确认事实及待验证项目；未经双方确认不作为正式报价或工期承诺。']);
  return report;
}
