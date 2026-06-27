import { isPostgresMode, query } from './db.js';

let initialized = false;

export async function initDiagnosisTables() {
  if (initialized) return;

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS diagnosis_sessions (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NULL,
        status VARCHAR(50) DEFAULT 'collecting_info',
        completeness INT DEFAULT 0,
        profile_status VARCHAR(32) DEFAULT 'idle',
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    if (isPostgresMode) {
      await query(`ALTER TABLE diagnosis_sessions ADD COLUMN IF NOT EXISTS profile_status VARCHAR(32) DEFAULT 'idle';`);
      await query(`ALTER TABLE diagnosis_sessions ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;`);
    } else {
      try {
        await query(`ALTER TABLE diagnosis_sessions ADD COLUMN profile_status VARCHAR(32) DEFAULT 'idle';`);
      } catch (e) {
        // 忽略已存在列的报错
      }

      try {
        await query(`ALTER TABLE diagnosis_sessions ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;`);
      } catch (e) {
        // 忽略已存在列的报错
      }
    }

    await query(`
      CREATE TABLE IF NOT EXISTS diagnosis_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64),
        sender VARCHAR(50),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS diagnosis_profiles (
        session_id VARCHAR(64) PRIMARY KEY,
        known_facts JSON,
        missing_fields JSON,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS diagnosis_reports (
        session_id VARCHAR(64) PRIMARY KEY,
        summary TEXT,
        maturity_score INT DEFAULT 0,
        pain_points JSON,
        opportunity_map JSON,
        recommended_agents JSON,
        roadmap_30_60_90 JSON,
        risks JSON,
        data_requirements JSON,
        next_actions JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    initialized = true;
  } catch (error) {
    console.error('Failed to initialize diagnosis tables:', error);
    throw error;
  }
}
