import { isPostgresMode, query } from './db';

let ensuredDiagnosisRuntimeSchema = false;

export async function ensureDiagnosisRuntimeSchema() {
  if (ensuredDiagnosisRuntimeSchema) return;

  if (isPostgresMode) {
    await query(`ALTER TABLE diagnosis_sessions ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE`);
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
  }

  ensuredDiagnosisRuntimeSchema = true;
}
