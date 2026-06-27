import { query } from '../../../lib/db';
import { ensureDiagnosisRuntimeSchema } from '../../../lib/diagnosis_schema';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { sessionId, email, password } = req.body || {};
  if (!sessionId) {
    return res.status(400).json({ error: '缺少会话 ID' });
  }
  if (!email || !password) {
    return res.status(401).json({ error: '请先登录后删除诊断会话' });
  }

  try {
    const users = await query(
      `SELECT email FROM user_credits WHERE email = ? AND password = ? LIMIT 1`,
      [email, password]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: '登录状态无效，请重新登录' });
    }

    await ensureDiagnosisRuntimeSchema();

    const result = await query(
      `UPDATE diagnosis_sessions SET is_hidden = TRUE WHERE id = ? AND email = ?`,
      [sessionId, email]
    );

    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ error: '未找到该诊断会话' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete diagnosis session error:', error);
    return res.status(500).json({ error: '服务器内部错误，无法删除会话' });
  }
}
