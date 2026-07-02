import { query } from '../../diagnosis/db.js';
import { initGaokaoTables } from '../gaokao_init.js';
import { loadProfile } from '../gaokao_profile.js';
import { normalizeStoredReport } from '../gaokao_recommend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
  const { id, email, password } = req.body || {};
  if (!id) return res.status(400).json({ error: '缺少会话 ID' });
  if (!email || !password) return res.status(401).json({ error: '请先登录' });

  try {
    await initGaokaoTables();
    const users = await query(`SELECT email FROM user_credits WHERE email = ? AND password = ? LIMIT 1`, [email, password]);
    if (!users.length) return res.status(401).json({ error: '登录状态无效，请重新登录' });

    const sessions = await query(`SELECT * FROM gaokao_sessions WHERE id = ? AND email = ? AND COALESCE(is_hidden, FALSE) = FALSE`, [id, email]);
    if (!sessions.length) return res.status(404).json({ error: '该会话不存在' });

    const messages = await query(`SELECT sender, content, created_at FROM gaokao_messages WHERE session_id = ? ORDER BY id ASC`, [id]);
    const { knownFacts, missingFields } = await loadProfile(id);
    const reports = await query(`SELECT report FROM gaokao_reports WHERE session_id = ?`, [id]);

    return res.status(200).json({
      success: true,
      session: {
        id: sessions[0].id,
        status: sessions[0].status,
        completeness: sessions[0].completeness || 0,
        profileStatus: sessions[0].profile_status || 'idle'
      },
      messages,
      knownFacts,
      missingFields,
      report: reports.length ? normalizeStoredReport(reports[0].report) : null
    });
  } catch (error) {
    console.error('[Gaokao session]', error);
    return res.status(500).json({ error: '读取会话失败' });
  }
}

