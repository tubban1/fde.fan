import { query } from '../db.js';
import { ensureDiagnosisRuntimeSchema } from '../diagnosis_schema.js';

const CHINA_MOBILE_REGEX = /^1[3-9]\d{9}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { sessionId, email, password, phone } = req.body || {};
  const normalizedPhone = String(phone || '').replace(/\D/g, '');

  if (!sessionId) {
    return res.status(400).json({ error: '缺少会话 ID' });
  }
  if (!email || !password) {
    return res.status(401).json({ error: '请先登录后导出诊断报告' });
  }
  if (!CHINA_MOBILE_REGEX.test(normalizedPhone)) {
    return res.status(400).json({ error: '请输入有效的 11 位手机号' });
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

    const sessions = await query(
      `SELECT id FROM diagnosis_sessions WHERE id = ? AND email = ? AND COALESCE(is_hidden, FALSE) = FALSE LIMIT 1`,
      [sessionId, email]
    );
    if (sessions.length === 0) {
      return res.status(404).json({ error: '未找到该诊断会话' });
    }

    await query(
      `INSERT INTO diagnosis_export_leads (session_id, email, phone) VALUES (?, ?, ?)`,
      [sessionId, email, normalizedPhone]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Save diagnosis export lead error:', error);
    return res.status(500).json({ error: '服务器内部错误，无法保存手机号' });
  }
}
