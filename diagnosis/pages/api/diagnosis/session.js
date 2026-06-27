import { query } from '../../../lib/db';
import { ensureDiagnosisRuntimeSchema } from '../../../lib/diagnosis_schema';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { id, email, password } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: '缺少会话 ID 参数' });
  }
  if (!email || !password) {
    return res.status(401).json({ error: '请先登录后查看诊断会话' });
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

    // 使用 1 次联合 LEFT JOIN 查询，一次性拉取会话、画像、报告和所有的对话消息
    // 这彻底避免了同一个 API 运行周期内多次调用 db.query() 和 db.end() 导致的连接冲突及挂起阻塞
    const rows = await query(
      `SELECT 
         s.id AS session_id, s.email, s.status, s.completeness, s.profile_status, s.created_at AS session_created_at,
         p.known_facts, p.missing_fields,
         r.summary, r.maturity_score, r.pain_points, r.opportunity_map, r.recommended_agents, r.roadmap_30_60_90, r.risks, r.data_requirements, r.next_actions,
         m.id AS msg_id, m.sender AS msg_sender, m.content AS msg_content, m.created_at AS msg_created_at
       FROM diagnosis_sessions s
       LEFT JOIN diagnosis_profiles p ON s.id = p.session_id
       LEFT JOIN diagnosis_reports r ON s.id = r.session_id
       LEFT JOIN diagnosis_messages m ON s.id = m.session_id
       WHERE s.id = ? AND s.email = ? AND COALESCE(s.is_hidden, FALSE) = FALSE
       ORDER BY m.id ASC`,
      [id, email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '未找到该诊断会话' });
    }

    const firstRow = rows[0];

    // 1. 组装 Session 状态
    const session = {
      id: firstRow.session_id,
      email: firstRow.email,
      status: firstRow.status,
      completeness: firstRow.completeness,
      profileStatus: firstRow.profile_status || 'idle',
      createdAt: firstRow.session_created_at
    };

    // 2. 对消息数据进行去重折叠
    const messages = [];
    const seenMsgIds = new Set();
    for (const row of rows) {
      if (row.msg_id && !seenMsgIds.has(row.msg_id)) {
        seenMsgIds.add(row.msg_id);
        messages.push({
          id: row.msg_id,
          sender: row.msg_sender,
          content: row.msg_content,
          created_at: row.msg_created_at
        });
      }
    }

    // 3. 提取画像信息
    let knownFacts = {};
    let missingFields = [];
    if (firstRow.known_facts) {
      try {
        knownFacts = typeof firstRow.known_facts === 'string' ? JSON.parse(firstRow.known_facts) : firstRow.known_facts;
      } catch (e) {
        knownFacts = firstRow.known_facts || {};
      }
    }
    if (firstRow.missing_fields) {
      try {
        missingFields = typeof firstRow.missing_fields === 'string' ? JSON.parse(firstRow.missing_fields) : firstRow.missing_fields;
      } catch (e) {
        missingFields = firstRow.missing_fields || [];
      }
    }

    // 4. 提取报告数据并转换为驼峰格式
    let report = null;
    if (firstRow.summary) {
      const parseJsonField = (val) => {
        if (!val) return [];
        try {
          return typeof val === 'string' ? JSON.parse(val) : val;
        } catch (e) {
          return val;
        }
      };

      report = {
        summary: firstRow.summary || '',
        maturityScore: firstRow.maturity_score || 0,
        painPoints: parseJsonField(firstRow.pain_points),
        opportunityMap: parseJsonField(firstRow.opportunity_map),
        recommendedAgents: parseJsonField(firstRow.recommended_agents),
        roadmap30_60_90: parseJsonField(firstRow.roadmap_30_60_90),
        risks: parseJsonField(firstRow.risks),
        dataRequirements: parseJsonField(firstRow.data_requirements),
        nextActions: parseJsonField(firstRow.next_actions)
      };
    }

    return res.status(200).json({
      success: true,
      session,
      messages,
      knownFacts,
      missingFields,
      report
    });
  } catch (error) {
    console.error('Fetch diagnosis session error:', error);
    return res.status(500).json({ error: '服务器内部错误，无法加载会话数据' });
  }
}
