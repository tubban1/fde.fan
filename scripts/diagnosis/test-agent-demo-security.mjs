import assert from 'node:assert/strict';
import {
  extractHtmlDocument,
  normalizeRecommendedAgent,
  secureAgentDemoHtml,
  validateAgentDemoHtml
} from '../../src/server/diagnosis/agent_demo.js';

const validHtml = `<!doctype html>
<html>
  <head><meta charset="utf-8"><style>body { color: #111; }</style></head>
  <body><button id="run">运行</button><script>document.querySelector('#run').onclick = () => { document.body.dataset.ran = 'true'; };</script></body>
</html>`;

assert.equal(validateAgentDemoHtml(validHtml), true);

const extracted = extractHtmlDocument(`这是说明\n\`\`\`html\n${validHtml}\n\`\`\``);
assert.ok(extracted.startsWith('<!doctype html>'));

const secured = secureAgentDemoHtml(validHtml);
assert.match(secured, /Content-Security-Policy/);
assert.match(secured, /模拟智能体 Demo/);
assert.match(secured, /connect-src 'none'/);

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
