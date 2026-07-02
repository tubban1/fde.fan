import { isPostgresMode, query } from '../../diagnosis/db.js';
import { initGaokaoTables } from '../gaokao_init.js';
import { calculateCompleteness, loadProfile } from '../gaokao_profile.js';
import { generateRecommendationReport } from '../gaokao_recommend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
  const { sessionId, email, password, force } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: '缺少会话 ID' });
  if (!email || !password) return res.status(401).json({ error: '请先登录' });

  try {
    await initGaokaoTables();
    const users = await query(`SELECT email FROM user_credits WHERE email = ? AND password = ? LIMIT 1`, [email, password]);
    if (!users.length) return res.status(401).json({ error: '登录状态无效，请重新登录' });

    const sessions = await query(`SELECT id FROM gaokao_sessions WHERE id = ? AND email = ? AND COALESCE(is_hidden, FALSE) = FALSE`, [sessionId, email]);
    if (!sessions.length) return res.status(404).json({ error: '该会话不存在' });

    const { knownFacts, missingFields } = await loadProfile(sessionId);
    const completeness = calculateCompleteness(knownFacts);
    if (completeness < 65 && !force) {
      return res.status(400).json({ error: `当前信息完整度 ${completeness}%，还差：${missingFields.join('、')}` });
    }

    const { report } = await generateRecommendationReport(knownFacts);
    if (isPostgresMode) {
      await query(
        `INSERT INTO gaokao_reports (session_id, report) VALUES (?, ?)
         ON CONFLICT (session_id) DO UPDATE SET report = EXCLUDED.report, created_at = CURRENT_TIMESTAMP`,
        [sessionId, JSON.stringify(report)]
      );
    } else {
      await query(
        `INSERT INTO gaokao_reports (session_id, report) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE report = VALUES(report)`,
        [sessionId, JSON.stringify(report)]
      );
    }
    await query(`UPDATE gaokao_sessions SET status = 'report_ready' WHERE id = ?`, [sessionId]);
    await query(`INSERT INTO gaokao_messages (session_id, sender, content) VALUES (?, ?, ?)`, [sessionId, 'agent', '志愿建议已经生成。请在右侧“志愿建议”面板查看冲稳保、风险提示和下一步需要补齐的数据。']);

    return res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('[Gaokao recommend]', error);
    return res.status(500).json({ error: '生成志愿建议失败，请稍后重试' });
  }
}
