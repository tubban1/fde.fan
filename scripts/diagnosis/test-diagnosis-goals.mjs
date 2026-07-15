import assert from 'node:assert/strict';
import {
  buildDiagnosisWelcomeMessage,
  formatDiagnosisGoalPrompt,
  getDiagnosisGoalDefinition,
  normalizeDiagnosisGoalKey
} from '../../src/server/diagnosis/diagnosis_goal.js';

assert.equal(normalizeDiagnosisGoalKey('增长转化诊断 (销售/客服/运营 Agent)'), 'growth_conversion');
assert.equal(normalizeDiagnosisGoalKey('降本提效诊断'), 'cost_efficiency');
assert.equal(normalizeDiagnosisGoalKey('降本增效诊断'), 'cost_efficiency');
assert.equal(normalizeDiagnosisGoalKey('AI 试点落地诊断 (30天内见到小成果)'), 'ai_pilot');
assert.equal(normalizeDiagnosisGoalKey('综合转型诊断 (让顾问帮我梳理方向)'), 'comprehensive_transformation');
assert.equal(normalizeDiagnosisGoalKey('未知方向'), '');

for (const key of ['growth_conversion', 'cost_efficiency', 'ai_pilot', 'comprehensive_transformation']) {
  const definition = getDiagnosisGoalDefinition(key);
  assert.ok(definition?.label);
  assert.ok(definition?.targetGuidance);
  assert.ok(definition?.reportGuidance);

  const welcome = buildDiagnosisWelcomeMessage(key);
  assert.match(welcome, /先了解企业的基本情况/);
  assert.match(welcome, /主要做什么业务或产品/);
  assert.doesNotMatch(welcome, /最近团队每天最耗人/);

  const prompt = formatDiagnosisGoalPrompt(key);
  assert.match(prompt, new RegExp(definition.label));
  assert.match(prompt, /方向内目标要求/);
}

assert.match(formatDiagnosisGoalPrompt(''), /历史会话未记录/);

console.log('Diagnosis goal tests passed.');
