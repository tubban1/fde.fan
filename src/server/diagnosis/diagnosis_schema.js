import { isPostgresMode, query } from './db.js';
import { initDiagnosisTables } from './diagnosis_init.js';

let ensuredDiagnosisRuntimeSchema = false;

export async function ensureDiagnosisRuntimeSchema() {
  if (ensuredDiagnosisRuntimeSchema) return;

  await initDiagnosisTables();

  if (isPostgresMode) {
    await query(`ALTER TABLE diagnosis_sessions ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE diagnosis_sessions ADD COLUMN IF NOT EXISTS diagnosis_goal VARCHAR(32) NULL`);
    await query(`
      CREATE TABLE IF NOT EXISTS diagnosis_export_leads (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } else {
    try {
      await query(`ALTER TABLE diagnosis_sessions ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE`);
    } catch (error) {
      const code = error?.code || '';
      const message = String(error?.message || '').toLowerCase();
      if (code !== 'ER_DUP_FIELDNAME' && !message.includes('duplicate column')) {
        throw error;
      }
    }

    try {
      await query(`ALTER TABLE diagnosis_sessions ADD COLUMN diagnosis_goal VARCHAR(32) NULL`);
    } catch (error) {
      const code = error?.code || '';
      const message = String(error?.message || '').toLowerCase();
      if (code !== 'ER_DUP_FIELDNAME' && !message.includes('duplicate column')) {
        throw error;
      }
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
  }

  ensuredDiagnosisRuntimeSchema = true;
}
