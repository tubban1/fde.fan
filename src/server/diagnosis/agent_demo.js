import { generateText } from './text_model_provider.js';

export const MAX_AGENT_DEMO_HTML_BYTES = 420000;
export const MAX_AGENT_DEMO_REVISION_CHARS = 1200;

const CSP_CONTENT = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; child-src 'none'; form-action 'none'; base-uri 'none'";

const FORBIDDEN_HTML_PATTERNS = [
  { pattern: /<(?:script|img|iframe|audio|video|source)[^>]+\bsrc\s*=\s*["']\s*(?:https?:)?\/\//i, reason: '不允许引用外部资源' },
  { pattern: /<link[^>]+\bhref\s*=\s*["']\s*(?:https?:)?\/\//i, reason: '不允许引用外部样式' },
  { pattern: /<(?:a|area|form)[^>]+\b(?:href|action)\s*=\s*["']\s*(?:https?:|\/\/|\/)/i, reason: '不允许跳转到其他页面' },
  { pattern: /<meta[^>]+http-equiv\s*=\s*["']refresh["']/i, reason: '不允许自动跳转页面' },
  { pattern: /\bfetch\s*\(/i, reason: '不允许发起网络请求' },
  { pattern: /\bXMLHttpRequest\b/i, reason: '不允许发起网络请求' },
  { pattern: /\bWebSocket\b/i, reason: '不允许使用 WebSocket' },
  { pattern: /\bEventSource\b/i, reason: '不允许使用 EventSource' },
  { pattern: /\bnavigator\s*\.\s*sendBeacon\b/i, reason: '不允许发送 Beacon' },
  { pattern: /\bimport\s*\(/i, reason: '不允许动态加载模块' },
  { pattern: /\beval\s*\(/i, reason: '不允许动态执行代码' },
  { pattern: /\bnew\s+Function\b/i, reason: '不允许动态执行代码' },
  { pattern: /\bwindow\s*\.\s*open\s*\(/i, reason: '不允许打开新页面' },
  { pattern: /\b(?:window\s*\.\s*)?location\s*(?:[.[]|=)/i, reason: '不允许页面跳转' },
  { pattern: /\b(?:window\s*\.\s*)?(?:parent|top|opener)\b\s*[.[]/i, reason: '不允许访问宿主页面' },
  { pattern: /\bpostMessage\s*\(/i, reason: '不允许向宿主页面发送消息' },
  { pattern: /\b(?:localStorage|sessionStorage|indexedDB)\b/i, reason: '不允许持久化浏览器数据' },
  { pattern: /\bdocument\s*\.\s*cookie\b/i, reason: '不允许访问 Cookie' },
  { pattern: /\bwhile\s*\(\s*true\s*\)/i, reason: '不允许无限循环' },
  { pattern: /\bfor\s*\(\s*;\s*;\s*\)/i, reason: '不允许无限循环' }
];

const toStringArray = (value) => {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  const text = String(value || '').trim();
  return text ? [text] : [];
};

const normalizeScenario = (scenario, index) => {
  if (typeof scenario === 'string') {
    return { name: scenario, input: `模拟场景 ${index + 1}`, expectedResult: '展示相应的模拟分析结果' };
  }
  return {
    name: String(scenario?.name || scenario?.title || `模拟场景 ${index + 1}`).trim(),
    input: String(scenario?.input || scenario?.sampleInput || '使用预置模拟数据').trim(),
    expectedResult: String(scenario?.expectedResult || scenario?.result || '展示相应的模拟分析结果').trim()
  };
};

export function normalizeRecommendedAgent(agent, index = 0) {
  const name = String(agent?.name || `推荐智能体 ${index + 1}`).trim();
  const fallbackScenarios = [
    { name: '标准业务场景', input: '使用完整的模拟业务资料', expectedResult: '完成分析并给出结构化建议' },
    { name: '信息不足场景', input: '使用字段缺失的模拟资料', expectedResult: '指出缺失信息并给出补充建议' },
    { name: '需要人工确认', input: '模拟一个涉及业务操作的请求', expectedResult: '在执行前展示人工确认步骤' }
  ];
  const scenarios = Array.isArray(agent?.mockScenarios) && agent.mockScenarios.length
    ? agent.mockScenarios.slice(0, 6).map(normalizeScenario)
    : fallbackScenarios;

  return {
    id: String(agent?.id || agent?.key || `agent-${index}`).trim(),
    name,
    businessProblem: String(agent?.businessProblem || agent?.problem || agent?.description || '').trim(),
    targetUser: String(agent?.targetUser || agent?.users || '相关业务人员').trim(),
    recommendationReason: String(agent?.recommendationReason || agent?.reason || '与当前优先业务问题直接相关').trim(),
    description: String(agent?.description || '').trim(),
    integration: String(agent?.integration || 'MVP 仅使用模拟数据，不进行真实系统对接').trim(),
    inputs: toStringArray(agent?.inputs).length ? toStringArray(agent.inputs) : ['预置模拟业务资料'],
    workflow: toStringArray(agent?.workflow).length
      ? toStringArray(agent.workflow)
      : ['读取模拟资料', '执行规则分析', '生成结构化结果', '等待人工确认'],
    outputs: toStringArray(agent?.outputs).length ? toStringArray(agent.outputs) : ['模拟分析结论', '下一步建议'],
    mockScenarios: scenarios
  };
}

export function extractHtmlDocument(rawContent) {
  const raw = String(rawContent || '').trim();
  const withoutFence = raw
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = withoutFence.search(/<!doctype\s+html|<html\b/i);
  const endMatch = withoutFence.match(/<\/html\s*>/ig);
  if (start < 0 || !endMatch?.length) {
    throw new Error('模型没有返回完整的 HTML 文档');
  }
  const lastClosingTag = withoutFence.toLowerCase().lastIndexOf('</html>');
  return withoutFence.slice(start, lastClosingTag + 7).trim();
}

export function validateAgentDemoHtml(html) {
  const content = String(html || '');
  if (!/^\s*(?:<!doctype\s+html[^>]*>\s*)?<html\b/i.test(content)) {
    throw new Error('Demo 必须是完整的 HTML 文档');
  }
  if (!/<head\b[^>]*>/i.test(content) || !/<body\b[^>]*>/i.test(content) || !/<\/html\s*>/i.test(content)) {
    throw new Error('Demo 缺少 head、body 或 html 结束标签');
  }
  if (!/<script\b/i.test(content)) {
    throw new Error('Demo 缺少可交互脚本');
  }
  if (Buffer.byteLength(content, 'utf8') > MAX_AGENT_DEMO_HTML_BYTES) {
    throw new Error('Demo 内容过大，请缩小生成范围');
  }
  for (const rule of FORBIDDEN_HTML_PATTERNS) {
    if (rule.pattern.test(content)) throw new Error(rule.reason);
  }
  return true;
}

export function secureAgentDemoHtml(rawHtml) {
  let html = String(rawHtml || '')
    .replace(/<meta[^>]+http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/ig, '')
    .replace(/<base\b[^>]*>/ig, '');

  validateAgentDemoHtml(html);

  const securityMeta = `<meta http-equiv="Content-Security-Policy" content="${CSP_CONTENT}">`;
  html = html.replace(/<head\b([^>]*)>/i, `<head$1>${securityMeta}`);

  const notice = `<div id="fde-simulation-notice" role="status" style="position:sticky;top:0;z-index:2147483647;box-sizing:border-box;width:100%;padding:8px 14px;background:#fff7ed;border-bottom:1px solid #fed7aa;color:#9a3412;font:600 12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center">模拟智能体 Demo · 使用合成数据，不会调用外部服务或执行真实业务操作</div>`;
  html = html.replace(/<body\b([^>]*)>/i, `<body$1>${notice}`);
  validateAgentDemoHtml(html);
  return html;
}

function demoPrompt(spec, knownFacts) {
  return `请生成一个可以直接放入 iframe srcDoc 运行的完整单文件 HTML 智能体 Demo。

智能体方案：
${JSON.stringify(spec, null, 2)}

诊断画像（只能用于理解业务背景；必须改写为合成模拟数据，不得原样展示企业隐私信息）：
${JSON.stringify(knownFacts || {}, null, 2)}

硬性要求：
1. 只输出从 <!doctype html> 到 </html> 的完整代码，不要 Markdown 和解释。
2. 只用原生 HTML、CSS、JavaScript，所有代码和模拟数据必须内联。
3. 禁止任何外部 URL、依赖、网络请求、动态 import、eval、WebSocket、浏览器存储、页面跳转、父窗口访问和 postMessage。
4. 页面是可实际点击操作的业务工具，不是营销落地页。采用清晰、克制、专业的工作台界面，卡片圆角不超过 8px。
5. 至少提供 3 个可切换的模拟业务场景，每个场景有不同合成数据和结果。
6. 用户点击运行后，依次展示 3 至 4 个模拟执行步骤，再展示结构化结果；总等待不超过 2 秒。
7. 至少包含一个信息不足场景和一个需要人工确认的模拟操作；确认后明确提示“模拟执行成功，未写入真实系统”。
8. 支持重置当前场景，所有按钮和输入必须可用，错误状态要清晰。
9. 不使用真实企业名、真实人名、手机号、邮箱、订单号或客户资料。
10. 自适应 360px 到 1440px 宽度，不出现横向溢出。`;
}

function revisionPrompt(spec, currentHtml, instruction) {
  return `请根据用户要求修改一个模拟智能体 Demo，并返回修改后的完整单文件 HTML。

智能体方案：
${JSON.stringify(spec, null, 2)}

用户修改要求：
${instruction}

当前 HTML：
${currentHtml}

硬性要求：
1. 只输出从 <!doctype html> 到 </html> 的完整代码，不要 Markdown 和解释。
2. 保留现有主要功能，只修改用户要求涉及的部分。
3. 只用内联原生 HTML、CSS、JavaScript和合成模拟数据。
4. 禁止任何外部 URL、依赖、网络请求、动态 import、eval、WebSocket、浏览器存储、页面跳转、父窗口访问和 postMessage。
5. 保留至少 3 个场景、模拟执行步骤、信息不足处理、人工确认和重置能力。
6. 所有真实业务动作必须明确标记为模拟，不得声称已经写入真实系统。
7. 自适应 360px 到 1440px 宽度。`;
}

async function generateAndSecure(userPrompt) {
  const rawContent = await generateText({
    systemPrompt: '你是一位资深 FDE 原型工程师，擅长把业务诊断转化为安全、可交互、使用合成数据的单页智能体 Demo。',
    userPrompt,
    temperature: 0.35,
    timeout: 90000,
    task: 'agent_demo'
  });
  return secureAgentDemoHtml(extractHtmlDocument(rawContent));
}

export function generateInitialAgentDemo(spec, knownFacts) {
  return generateAndSecure(demoPrompt(spec, knownFacts));
}

export function reviseAgentDemo(spec, currentHtml, instruction) {
  return generateAndSecure(revisionPrompt(spec, currentHtml, instruction));
}
