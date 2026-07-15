import assert from 'node:assert/strict';
import {
  AGENT_DEMO_LIBRARY_REGISTRY,
  extractHtmlDocument,
  normalizeRecommendedAgent,
  secureAgentDemoHtml,
  selectAgentDemoLibraryIds,
  stripAgentDemoPlatformShell,
  validateAgentDemoHtml,
  withAgentDemoLibraries
} from '../../src/server/diagnosis/agent_demo.js';

const validHtml = `<!doctype html>
<html>
  <head><meta charset="utf-8"><style>body { color: #111; }</style></head>
  <body><button id="run">运行</button><script>document.querySelector('#run').onclick = () => { document.body.dataset.ran = 'true'; };</script></body>
</html>`;

assert.equal(validateAgentDemoHtml(validHtml), true);

const extracted = extractHtmlDocument(`这是说明\n\`\`\`html\n${validHtml}\n\`\`\``);
assert.ok(extracted.startsWith('<!doctype html>'));

assert.deepEqual(selectAgentDemoLibraryIds({ name: '基础信息问答' }), ['dayjs', 'vue', 'lucide']);

const analyticsLibraries = selectAgentDemoLibraryIds({
  name: '销售趋势分析智能体',
  workflow: ['统计转化指标并生成分析报告']
});
assert.ok(analyticsLibraries.includes('lodash'));
assert.ok(analyticsLibraries.includes('chartjs'));

const dashboardLibraries = selectAgentDemoLibraryIds({ name: '多维经营仪表盘' });
assert.ok(dashboardLibraries.includes('echarts'));
assert.ok(!dashboardLibraries.includes('chartjs'));

const graphLibraries = selectAgentDemoLibraryIds({ name: '客户关系网络与知识图谱' });
assert.ok(graphLibraries.includes('d3'));
assert.ok(!graphLibraries.includes('chartjs'));
assert.ok(!graphLibraries.includes('echarts'));

const workflowLibraries = selectAgentDemoLibraryIds({ name: '工单审批流程自动化' });
assert.ok(workflowLibraries.includes('gsap'));

const spatialLibraries = selectAgentDemoLibraryIds({ name: '三维数字孪生任务调度' });
assert.ok(spatialLibraries.includes('three'));
assert.ok(spatialLibraries.length <= 8);

const revisedSpec = withAgentDemoLibraries({ name: '基础信息问答' }, '增加一个趋势图表和轻量动效');
assert.ok(revisedSpec.libraries.includes('chartjs'));
assert.ok(revisedSpec.libraries.includes('animejs'));

const secured = secureAgentDemoHtml(validHtml, analyticsLibraries);
assert.match(secured, /Content-Security-Policy/);
assert.match(secured, /模拟智能体 Demo/);
assert.match(secured, /script-src 'unsafe-inline' 'unsafe-eval' https:\/\/cdn\.jsdelivr\.net https:\/\/tubban1\.oss-cn-beijing\.aliyuncs\.com/);
assert.match(secured, /connect-src https:\/\/cdn\.jsdelivr\.net\/npm\/dayjs@1\.11\.21\/dayjs\.min\.js\.map/);
assert.match(secured, /https:\/\/cdn\.jsdelivr\.net\/npm\/lucide@1\.23\.0\/dist\/umd\/lucide\.min\.js\.map/);
assert.match(secured, /https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js@4\.5\.1\/dist\/chart\.umd\.min\.js\.map/);
assert.doesNotMatch(secured, /connect-src https:\/\/cdn\.jsdelivr\.net(?:;|\s+https:\/\/tubban1)/);
for (const libraryId of analyticsLibraries) {
  const library = AGENT_DEMO_LIBRARY_REGISTRY[libraryId];
  assert.match(secured, new RegExp(`data-fde-library="${libraryId}"`));
  assert.match(secured, new RegExp(library.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.doesNotMatch(secured, /data-fde-library="three"/);
assert.match(secured, /data-fde-fallback="https:\/\/tubban1\.oss-cn-beijing\.aliyuncs\.com\/static\/lib\/chart\.umd\.min\.js"/);

const stripped = stripAgentDemoPlatformShell(secured);
assert.doesNotMatch(stripped, /data-fde-library/);
assert.doesNotMatch(stripped, /fde-simulation-notice/);
assert.equal(validateAgentDemoHtml(stripped), true);

const securedAgain = secureAgentDemoHtml(secured, analyticsLibraries);
for (const libraryId of analyticsLibraries) {
  assert.equal((securedAgain.match(new RegExp(`data-fde-library="${libraryId}"`, 'g')) || []).length, 1);
}

for (const unsafeSnippet of [
  '<script>fetch("/api/private")</script>',
  '<script>new WebSocket("wss://example.com")</script>',
  '<script>window.parent.location = "/"</script>',
  '<script>window.location.href = "https://example.com"</script>',
  '<script>localStorage.setItem("secret", "value")</script>',
  '<script>while (true) {}</script>',
  '<script src="https://example.com/app.js"></script>',
  '<a href="https://example.com">跳转</a><script>document.body.dataset.ready = "true";</script>'
]) {
  const unsafeHtml = validHtml.replace(/<script>[\s\S]*?<\/script>/, unsafeSnippet);
  assert.throws(() => validateAgentDemoHtml(unsafeHtml));
}

const legacyAgent = normalizeRecommendedAgent({
  name: '旧版推荐 Agent',
  description: '整理业务资料',
  integration: '正式版对接 CRM'
}, 2);
assert.equal(legacyAgent.id, 'agent-2');
assert.equal(legacyAgent.mockScenarios.length, 3);
assert.ok(legacyAgent.workflow.length >= 3);

console.log('Agent Demo security tests passed.');
