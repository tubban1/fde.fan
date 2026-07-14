import { query } from '../db.js';
import { formatErrorForLog, isTransientNetworkError } from '../safe_error.js';
import { authenticateUser } from '../../diagnosis-auth/authenticate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(401).json({ error: '请先登录后查看诊断历史' });
  }

  try {
    const auth = await authenticateUser(email, password);
    if (!auth.ok) {
      return res.status(401).json({ error: '登录状态无效，请重新登录' });
    }

    const sessions = await query(
      `SELECT
         s.id,
         s.status,
         s.completeness,
         s.profile_status,
         s.created_at,
         s.updated_at,
         (SELECT COUNT(*) FROM diagnosis_messages m WHERE m.session_id = s.id) AS message_count,
         (
           SELECT m.content
           FROM diagnosis_messages m
           WHERE m.session_id = s.id AND m.sender = 'user'
           ORDER BY m.id DESC
           LIMIT 1
         ) AS last_user_message
       FROM diagnosis_sessions s
       WHERE s.email = ? AND COALESCE(s.is_hidden, FALSE) = FALSE
       ORDER BY s.updated_at DESC, s.created_at DESC
       LIMIT 50`,
      [auth.email]
    );

    return res.status(200).json({
      success: true,
      sessions: sessions.map(item => ({
        id: item.id,
        status: item.status,
        completeness: item.completeness || 0,
        profileStatus: item.profile_status || 'idle',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        messageCount: item.message_count || 0,
        lastUserMessage: item.last_user_message || ''
      }))
    });
  } catch (error) {
    console.error('Fetch diagnosis history error:', formatErrorForLog(error));
    if (isTransientNetworkError(error)) {
      return res.status(503).json({ error: '数据库连接暂时不可用，请检查本机网络/DNS 或稍后重试' });
    }
    return res.status(500).json({ error: '服务器内部错误，无法加载诊断历史' });
  }
}
