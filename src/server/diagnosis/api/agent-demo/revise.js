import { query } from '../../db.js';
import { ensureDiagnosisRuntimeSchema } from '../../diagnosis_schema.js';
import { MAX_AGENT_DEMO_REVISION_CHARS, reviseAgentDemo, withAgentDemoLibraries } from '../../agent_demo.js';
import { loadOwnedAgentDemo } from '../../agent_demo_store.js';
import { formatErrorForLog } from '../../safe_error.js';
import { authenticateUser } from '../../../diagnosis-auth/authenticate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
  const { demoId, instruction, email, password } = req.body || {};
  const normalizedInstruction = String(instruction || '').trim();
  if (!demoId) return res.status(400).json({ error: '缺少 Demo ID' });
  if (normalizedInstruction.length < 3) return res.status(400).json({ error: '请具体说明希望修改的内容' });
  if (normalizedInstruction.length > MAX_AGENT_DEMO_REVISION_CHARS) {
    return res.status(400).json({ error: `修改要求不能超过 ${MAX_AGENT_DEMO_REVISION_CHARS} 个字符` });
  }

  try {
    const auth = await authenticateUser(email, password);
    if (!auth.ok) return res.status(401).json({ error: '登录状态无效，请返回诊断页面重新登录' });
    await ensureDiagnosisRuntimeSchema();
    const currentDemo = await loadOwnedAgentDemo(demoId, auth.email);
    if (!currentDemo) return res.status(404).json({ error: 'Demo 不存在或无权访问' });

    const preparedSpec = withAgentDemoLibraries(currentDemo.spec, normalizedInstruction);
    const html = await reviseAgentDemo(preparedSpec, currentDemo.html, normalizedInstruction);
    const nextVersion = currentDemo.currentVersion + 1;
    await query(
      `INSERT INTO diagnosis_agent_demo_versions
        (demo_id, version, html, change_request)
       VALUES (?, ?, ?, ?)`,
      [demoId, nextVersion, html, normalizedInstruction]
    );
    const updateResult = await query(
      `UPDATE diagnosis_agent_demos
          SET current_version = ?, spec = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND email = ? AND current_version = ?`,
      [nextVersion, JSON.stringify(preparedSpec), demoId, auth.email, currentDemo.currentVersion]
    );
    const affectedRows = Number(updateResult?.affectedRows ?? updateResult?.rowCount ?? 0);
    if (affectedRows !== 1) {
      return res.status(409).json({ error: 'Demo 已在其他窗口更新，请刷新后重试' });
    }

    const demo = await loadOwnedAgentDemo(demoId, auth.email);
    return res.status(200).json({ success: true, demo });
  } catch (error) {
    console.error('Revise agent demo error:', formatErrorForLog(error));
    const duplicateVersion = error?.code === 'ER_DUP_ENTRY' || error?.code === '23505';
    return res.status(duplicateVersion ? 409 : 500).json({
      error: duplicateVersion ? 'Demo 已在其他窗口更新，请刷新后重试' : 'Demo 修改失败，原版本已保留，请重试'
    });
  }
}
