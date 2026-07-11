import { isPostgresMode, query } from '../db.js';

const CHINA_MOBILE_REGEX = /^1[3-9]\d{9}$/;

let exportLeadTablePromise = null;

async function ensureExportLeadTable() {
  if (exportLeadTablePromise) return exportLeadTablePromise;

  exportLeadTablePromise = (async () => {
    if (isPostgresMode) {
      await query(`
        CREATE TABLE IF NOT EXISTS diagnosis_export_leads (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(64) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(32) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return;
    }

    await query(`
      CREATE TABLE IF NOT EXISTS diagnosis_export_leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(32) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  })().catch((error) => {
    exportLeadTablePromise = null;
    throw error;
  });

  return exportLeadTablePromise;
}

function isMissingExportLeadTableError(error) {
  const code = error?.code || '';
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'ER_NO_SUCH_TABLE' ||
    message.includes('relation "diagnosis_export_leads" does not exist') ||
    message.includes("relation 'diagnosis_export_leads' does not exist") ||
    message.includes("table 'diagnosis_export_leads'") ||
    message.includes('no such table')
  );
}

async function insertExportLead(sessionId, email, phone) {
  try {
    await query(
      `INSERT INTO diagnosis_export_leads (session_id, email, phone) VALUES (?, ?, ?)`,
      [sessionId, email, phone]
    );
  } catch (error) {
    if (!isMissingExportLeadTableError(error)) {
      throw error;
    }
    await ensureExportLeadTable();
    await query(
      `INSERT INTO diagnosis_export_leads (session_id, email, phone) VALUES (?, ?, ?)`,
      [sessionId, email, phone]
    );
  }
}

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

    await insertExportLead(sessionId, email, normalizedPhone);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Save diagnosis export lead error:', error);
    return res.status(500).json({ error: '服务器内部错误，无法保存手机号' });
  }
}
