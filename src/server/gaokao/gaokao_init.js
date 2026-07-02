import { isPostgresMode, query } from '../diagnosis/db.js';

let initialized = false;

export async function initGaokaoTables() {
  if (initialized) return;

  await query(`
    CREATE TABLE IF NOT EXISTS gaokao_sessions (
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

  await query(`
    CREATE TABLE IF NOT EXISTS gaokao_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(64),
      sender VARCHAR(50),
      content TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gaokao_profiles (
      session_id VARCHAR(64) PRIMARY KEY,
      known_facts JSON,
      missing_fields JSON,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gaokao_reports (
      session_id VARCHAR(64) PRIMARY KEY,
      report JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (isPostgresMode) {
    await query(`ALTER TABLE gaokao_sessions ADD COLUMN IF NOT EXISTS profile_status VARCHAR(32) DEFAULT 'idle'`);
    await query(`ALTER TABLE gaokao_sessions ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE`);
  }

  initialized = true;
}

