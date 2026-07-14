import { ensureDiagnosisRuntimeSchema } from '../../diagnosis_schema.js';
import { loadOwnedAgentDemo } from '../../agent_demo_store.js';
import { formatErrorForLog } from '../../safe_error.js';
import { authenticateUser } from '../../../diagnosis-auth/authenticate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
  const { demoId, email, password } = req.body || {};
  if (!demoId) return res.status(400).json({ error: '缺少 Demo ID' });

  try {
    const auth = await authenticateUser(email, password);
    if (!auth.ok) return res.status(401).json({ error: '登录状态无效，请返回诊断页面重新登录' });
    await ensureDiagnosisRuntimeSchema();
    const demo = await loadOwnedAgentDemo(demoId, auth.email);
    if (!demo) return res.status(404).json({ error: 'Demo 不存在或无权访问' });
    return res.status(200).json({ success: true, demo });
  } catch (error) {
    console.error('Get agent demo error:', formatErrorForLog(error));
    return res.status(500).json({ error: 'Demo 加载失败，请稍后重试' });
  }
}
