import crypto from 'crypto';
import { query } from '../../diagnosis/db.js';
import { initGaokaoTables } from '../gaokao_init.js';
import { REQUIRED_FIELDS } from '../gaokao_profile.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(401).json({ error: '请先登录后再开始' });

  try {
    await initGaokaoTables();
    const users = await query(`SELECT email FROM user_credits WHERE email = ? AND password = ? LIMIT 1`, [email, password]);
    if (!users.length) return res.status(401).json({ error: '登录状态无效，请重新登录' });

    const sessionId = 'gk_' + crypto.randomBytes(16).toString('hex');
    const welcomeText = `我们先不填长表。我会先收集 6 个最关键的信息：省份、年份、选科/科类、总分、全省位次，以及城市/专业/学校/风险偏好。

你可以直接用一句话告诉我，比如：“广东 2026 物化生，623 分，位次 18000，想去深圳或广州，计算机优先，风险稳一点。”`;

    await query(`INSERT INTO gaokao_sessions (id, email, status, completeness) VALUES (?, ?, ?, ?)`, [sessionId, email, 'collecting_info', 0]);
    await query(`INSERT INTO gaokao_profiles (session_id, known_facts, missing_fields) VALUES (?, ?, ?)`, [sessionId, JSON.stringify({}), JSON.stringify(REQUIRED_FIELDS)]);
    await query(`INSERT INTO gaokao_messages (session_id, sender, content) VALUES (?, ?, ?)`, [sessionId, 'agent', welcomeText]);

    return res.status(200).json({ success: true, sessionId, welcomeText, completeness: 0, knownFacts: {}, missingFields: REQUIRED_FIELDS, status: 'collecting_info' });
  } catch (error) {
    console.error('[Gaokao start]', error);
    return res.status(500).json({ error: '启动高考志愿智能体失败' });
  }
}

