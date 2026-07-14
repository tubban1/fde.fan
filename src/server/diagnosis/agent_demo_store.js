import { query } from './db.js';

export function parseJsonValue(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function loadOwnedAgentDemo(demoId, email) {
  const rows = await query(
    `SELECT d.id, d.session_id, d.email, d.agent_key, d.agent_name, d.spec, d.current_version,
            d.created_at, d.updated_at, v.html, v.change_request, v.created_at AS version_created_at
       FROM diagnosis_agent_demos d
       JOIN diagnosis_agent_demo_versions v
         ON v.demo_id = d.id AND v.version = d.current_version
      WHERE d.id = ? AND d.email = ?
      LIMIT 1`,
    [demoId, email]
  );
  if (!rows.length) return null;

  const row = rows[0];
  const versionRows = await query(
    `SELECT version, change_request, created_at
       FROM diagnosis_agent_demo_versions
      WHERE demo_id = ?
      ORDER BY version DESC`,
    [demoId]
  );

  return {
    id: row.id,
    sessionId: row.session_id,
    agentKey: row.agent_key,
    agentName: row.agent_name,
    spec: parseJsonValue(row.spec, {}),
    currentVersion: Number(row.current_version) || 1,
    html: row.html || '',
    currentChangeRequest: row.change_request || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.version_created_at,
    versions: versionRows.map(item => ({
      version: Number(item.version),
      changeRequest: item.change_request || '',
      createdAt: item.created_at
    }))
  };
}

export async function findAgentDemoBySource(sessionId, email, agentKey) {
  const rows = await query(
    `SELECT id FROM diagnosis_agent_demos
      WHERE session_id = ? AND email = ? AND agent_key = ?
      LIMIT 1`,
    [sessionId, email, agentKey]
  );
  return rows[0]?.id || '';
}

export function normalizeAgentKey(value, fallback) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return normalized || fallback;
}
