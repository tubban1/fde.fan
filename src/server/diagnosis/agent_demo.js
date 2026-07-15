import { generateText } from './text_model_provider.js';
import {
  AGENT_DEMO_LIBRARY_REGISTRY,
  resolveAgentDemoLibraries,
  selectAgentDemoLibraryIds,
  withAgentDemoLibraries
} from './agent_demo_libraries.js';

export { AGENT_DEMO_LIBRARY_REGISTRY, selectAgentDemoLibraryIds, withAgentDemoLibraries };

export const MAX_AGENT_DEMO_HTML_BYTES = 420000;
export const MAX_AGENT_DEMO_REVISION_CHARS = 1200;

const buildCspContent = (libraries) => {
  const sourceMapUrls = libraries.flatMap(library => [library.src, library.fallbackSrc]
    .filter(Boolean)
    .map(sourceUrl => `${sourceUrl}.map`));
  const connectSources = sourceMapUrls.length ? sourceMapUrls.join(' ') : "'none'";
  return `default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://tubban1.oss-cn-beijing.aliyuncs.com; style-src 'unsafe-inline'; img-src data: blob:; connect-src ${connectSources}; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; child-src 'none'; form-action 'none'; base-uri 'none'`;
};

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
  { pattern: /createElement\s*\(\s*["']script["']\s*\)/i, reason: '不允许动态加载脚本' },
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

export function stripAgentDemoPlatformShell(rawHtml) {
  return String(rawHtml || '')
    .replace(/<meta[^>]+http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/ig, '')
    .replace(/<script[^>]+data-fde-library\s*=\s*["'][^"']+["'][^>]*><\/script>/ig, '')
    .replace(/<div[^>]+id\s*=\s*["']fde-simulation-notice["'][^>]*>[\s\S]*?<\/div>/ig, '')
    .replace(/<base\b[^>]*>/ig, '');
}

export function secureAgentDemoHtml(rawHtml, libraryIds = null) {
  let html = stripAgentDemoPlatformShell(rawHtml);

  validateAgentDemoHtml(html);

  const libraries = resolveAgentDemoLibraries({ libraries: libraryIds || undefined });
  const securityMeta = `<meta http-equiv="Content-Security-Policy" content="${buildCspContent(libraries)}">`;
  const libraryScripts = libraries
    .map(library => {
      const fallbackAttributes = library.fallbackSrc
        ? ` data-fde-fallback="${library.fallbackSrc}" onerror="this.onerror=null;this.src=this.dataset.fdeFallback"`
        : '';
      return `<script data-fde-library="${library.id}" src="${library.src}" crossorigin="anonymous"${fallbackAttributes}></script>`;
    })
    .join('');
  html = html.replace(/<head\b([^>]*)>/i, `<head$1>${securityMeta}${libraryScripts}`);

  const notice = `<div id="fde-simulation-notice" role="status" style="position:sticky;top:0;z-index:2147483647;box-sizing:border-box;width:100%;padding:8px 14px;background:#fff7ed;border-bottom:1px solid #fed7aa;color:#9a3412;font:600 12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center">模拟智能体 Demo · 使用合成数据，不调用真实业务服务或执行真实业务操作</div>`;
  html = html.replace(/<body\b([^>]*)>/i, `<body$1>${notice}`);
  if (Buffer.byteLength(html, 'utf8') > MAX_AGENT_DEMO_HTML_BYTES) {
    throw new Error('Demo 内容过大，请缩小生成范围');
  }
  return html;
}

const buildLibraryPrompt = (libraries) => `平台会在 HTML head 中按顺序预加载以下固定版本依赖，不要自行输出任何外部 script、link 或 CDN 地址：
${libraries.map(library => `- ${library.label}，全局变量 ${library.global}：${library.usage}`).join('\n')}`;

function demoPrompt(spec, knownFacts, libraries) {
  return `请生成一个可以直接放入 iframe srcDoc 运行的完整单文件 HTML 智能体 Demo。

智能体方案：
${JSON.stringify(spec, null, 2)}

诊断画像（只能用于理解业务背景；必须改写为合成模拟数据，不得原样展示企业隐私信息）：
${JSON.stringify(knownFacts || {}, null, 2)}

硬性要求：
1. 只输出从 <!doctype html> 到 </html> 的完整代码，不要 Markdown 和解释。
2. 使用 Vue.createApp 构建交互；所有业务代码、样式和合成模拟数据必须内联。
3. ${buildLibraryPrompt(libraries)}
4. 禁止任何其他外部 URL、依赖、网络请求、动态 import、eval、WebSocket、浏览器存储、页面跳转、父窗口访问和 postMessage。
5. 页面是可重复操作的业务工作台，不是营销落地页。根据业务场景组织工具栏、关键指标、数据列表或表格、任务执行轨迹、结构化结果和人工确认区域；不要把所有内容都做成卡片。
6. 视觉需丰富但克制：使用中性色背景、清晰层级和至少两种功能色；使用 Lucide 图标；卡片圆角不超过 8px；禁止渐变、装饰光球、超大标题和大面积单一蓝紫色。
7. 至少提供 3 个可切换的模拟业务场景，每个场景有不同合成数据、指标和结果；需要统计表达时使用平台已提供的图表库，并在切换场景时正确释放和重建图表实例。
8. 用户点击运行后，展示 3 至 4 个带时间的模拟执行步骤和不同状态，再展示结构化结果；总等待不超过 2 秒。
9. 至少包含加载、空数据、信息不足、执行失败和需要人工确认的状态；确认后明确提示“模拟执行成功，未写入真实系统”。
10. 支持重置当前场景，表单、筛选、场景切换、弹窗和操作按钮必须可用，不能只做静态展示。
11. 不使用真实企业名、真实人名、手机号、邮箱、订单号或客户资料。
12. 自适应 360px 到 1440px 宽度，文字不得溢出或遮挡，不出现横向滚动。`;
}

function revisionPrompt(spec, currentHtml, instruction, libraries) {
  return `请根据用户要求修改一个模拟智能体 Demo，并返回修改后的完整单文件 HTML。

智能体方案：
${JSON.stringify(spec, null, 2)}

用户修改要求：
${instruction}

当前 HTML：
${stripAgentDemoPlatformShell(currentHtml)}

硬性要求：
1. 只输出从 <!doctype html> 到 </html> 的完整代码，不要 Markdown 和解释。
2. 保留现有主要功能，只修改用户要求涉及的部分。
3. 使用 Vue.createApp 组织交互，并根据修改需要使用平台依赖。
4. ${buildLibraryPrompt(libraries)}
5. 禁止任何其他外部 URL、依赖、网络请求、动态 import、eval、WebSocket、浏览器存储、页面跳转、父窗口访问和 postMessage。
6. 保留至少 3 个场景、模拟执行步骤、加载与失败状态、信息不足处理、人工确认和重置能力。
7. 保持业务工作台的信息密度和清晰层级，使用 Lucide 图标，卡片圆角不超过 8px，不使用渐变、装饰光球或超大标题。
8. 所有真实业务动作必须明确标记为模拟，不得声称已经写入真实系统。
9. 自适应 360px 到 1440px 宽度，文字和控件不得重叠。`;
}

async function generateAndSecure(userPrompt, libraryIds) {
  const rawContent = await generateText({
    systemPrompt: '你是一位资深 FDE 原型工程师，擅长把业务诊断转化为安全、可交互、使用合成数据的单页智能体 Demo。',
    userPrompt,
    temperature: 0.35,
    timeout: 90000,
    task: 'agent_demo'
  });
  return secureAgentDemoHtml(extractHtmlDocument(rawContent), libraryIds);
}

export function generateInitialAgentDemo(spec, knownFacts) {
  const preparedSpec = withAgentDemoLibraries(spec);
  const libraries = resolveAgentDemoLibraries(preparedSpec);
  return generateAndSecure(demoPrompt(preparedSpec, knownFacts, libraries), preparedSpec.libraries);
}

export function reviseAgentDemo(spec, currentHtml, instruction) {
  const preparedSpec = withAgentDemoLibraries(spec);
  const libraries = resolveAgentDemoLibraries(preparedSpec);
  return generateAndSecure(
    revisionPrompt(preparedSpec, currentHtml, instruction, libraries),
    preparedSpec.libraries
  );
}
