import { query } from '../../db.js';
import { ensureDiagnosisRuntimeSchema } from '../../diagnosis_schema.js';
import { loadOwnedAgentDemo } from '../../agent_demo_store.js';
import { formatErrorForLog } from '../../safe_error.js';
import { authenticateUser } from '../../../diagnosis-auth/authenticate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
  const { demoId, version, email, password } = req.body || {};
  const targetVersion = Number.parseInt(version, 10);
  if (!demoId || !Number.isInteger(targetVersion) || targetVersion < 1) {
    return res.status(400).json({ error: '缺少有效的 Demo 版本' });
  }

  try {
    const auth = await authenticateUser(email, password);
    if (!auth.ok) return res.status(401).json({ error: '登录状态无效，请返回诊断页面重新登录' });
    await ensureDiagnosisRuntimeSchema();
    const currentDemo = await loadOwnedAgentDemo(demoId, auth.email);
    if (!currentDemo) return res.status(404).json({ error: 'Demo 不存在或无权访问' });

    const targetRows = await query(
      `SELECT html FROM diagnosis_agent_demo_versions
        WHERE demo_id = ? AND version = ?
        LIMIT 1`,
      [demoId, targetVersion]
    );
    if (!targetRows.length) return res.status(404).json({ error: '要恢复的版本不存在' });

    const nextVersion = currentDemo.currentVersion + 1;
    await query(
      `INSERT INTO diagnosis_agent_demo_versions
        (demo_id, version, html, change_request)
       VALUES (?, ?, ?, ?)`,
      [demoId, nextVersion, targetRows[0].html, `恢复至 v${targetVersion}`]
    );
    const updateResult = await query(
      `UPDATE diagnosis_agent_demos
          SET current_version = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND email = ? AND current_version = ?`,
      [nextVersion, demoId, auth.email, currentDemo.currentVersion]
    );
    const affectedRows = Number(updateResult?.affectedRows ?? updateResult?.rowCount ?? 0);
    if (affectedRows !== 1) {
      return res.status(409).json({ error: 'Demo 已在其他窗口更新，请刷新后重试' });
    }

    const demo = await loadOwnedAgentDemo(demoId, auth.email);
    return res.status(200).json({ success: true, demo });
  } catch (error) {
    console.error('Restore agent demo error:', formatErrorForLog(error));
    const duplicateVersion = error?.code === 'ER_DUP_ENTRY' || error?.code === '23505';
    return res.status(duplicateVersion ? 409 : 500).json({
      error: duplicateVersion ? 'Demo 已在其他窗口更新，请刷新后重试' : '版本恢复失败，请稍后重试'
    });
  }
}
