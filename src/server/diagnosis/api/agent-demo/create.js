import { randomUUID } from 'node:crypto';
import { query } from '../../db.js';
import { ensureDiagnosisRuntimeSchema } from '../../diagnosis_schema.js';
import { generateInitialAgentDemo, normalizeRecommendedAgent, withAgentDemoLibraries } from '../../agent_demo.js';
import { findAgentDemoBySource, loadOwnedAgentDemo, normalizeAgentKey, parseJsonValue } from '../../agent_demo_store.js';
import { formatErrorForLog } from '../../safe_error.js';
import { authenticateUser } from '../../../diagnosis-auth/authenticate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });

  const { sessionId, agentIndex, email, password } = req.body || {};
  const parsedAgentIndex = Number.parseInt(agentIndex, 10);
  if (!sessionId || !Number.isInteger(parsedAgentIndex) || parsedAgentIndex < 0) {
    return res.status(400).json({ error: '缺少有效的诊断会话或推荐智能体参数' });
  }

  try {
    const auth = await authenticateUser(email, password);
    if (!auth.ok) return res.status(401).json({ error: '登录状态无效，请返回诊断页面重新登录' });

    await ensureDiagnosisRuntimeSchema();
    const rows = await query(
      `SELECT s.id, p.known_facts, r.recommended_agents
         FROM diagnosis_sessions s
         LEFT JOIN diagnosis_profiles p ON p.session_id = s.id
         LEFT JOIN diagnosis_reports r ON r.session_id = s.id
        WHERE s.id = ? AND s.email = ? AND COALESCE(s.is_hidden, FALSE) = FALSE
        LIMIT 1`,
      [sessionId, auth.email]
    );
    if (!rows.length) return res.status(404).json({ error: '诊断会话不存在' });

    const recommendedAgents = parseJsonValue(rows[0].recommended_agents, []);
    if (!Array.isArray(recommendedAgents) || !recommendedAgents[parsedAgentIndex]) {
      return res.status(404).json({ error: '推荐智能体不存在，请重新生成诊断报告' });
    }

    const rawAgent = recommendedAgents[parsedAgentIndex];
    const explicitKey = rawAgent?.id || rawAgent?.key;
    const agentKey = normalizeAgentKey(explicitKey, `legacy-agent-${parsedAgentIndex}`);
    const existingDemoId = await findAgentDemoBySource(sessionId, auth.email, agentKey);
    if (existingDemoId) {
      const demo = await loadOwnedAgentDemo(existingDemoId, auth.email);
      return res.status(200).json({ success: true, existing: true, demo });
    }

    const spec = withAgentDemoLibraries(normalizeRecommendedAgent(rawAgent, parsedAgentIndex));
    const knownFacts = parseJsonValue(rows[0].known_facts, {});
    const html = await generateInitialAgentDemo(spec, knownFacts);
    const demoId = randomUUID();

    try {
      await query(
        `INSERT INTO diagnosis_agent_demo_versions
          (demo_id, version, html, change_request)
         VALUES (?, ?, ?, ?)`,
        [demoId, 1, html, '根据诊断报告生成初始模拟 Demo']
      );
      await query(
        `INSERT INTO diagnosis_agent_demos
          (id, session_id, email, agent_key, agent_name, spec, current_version)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [demoId, sessionId, auth.email, agentKey, spec.name, JSON.stringify(spec), 1]
      );
    } catch (insertError) {
      await query(`DELETE FROM diagnosis_agent_demo_versions WHERE demo_id = ?`, [demoId]).catch(() => {});
      const racedDemoId = await findAgentDemoBySource(sessionId, auth.email, agentKey);
      if (!racedDemoId) throw insertError;
      const demo = await loadOwnedAgentDemo(racedDemoId, auth.email);
      return res.status(200).json({ success: true, existing: true, demo });
    }

    const demo = await loadOwnedAgentDemo(demoId, auth.email);
    return res.status(200).json({ success: true, existing: false, demo });
  } catch (error) {
    console.error('Create agent demo error:', formatErrorForLog(error));
    return res.status(500).json({ error: '模拟智能体 Demo 生成失败，请稍后重试' });
  }
}
