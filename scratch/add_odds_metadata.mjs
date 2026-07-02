import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE worldcup_manual_features 
      ADD COLUMN IF NOT EXISTS odds_provider VARCHAR(100),
      ADD COLUMN IF NOT EXISTS odds_market VARCHAR(100),
      ADD COLUMN IF NOT EXISTS odds_captured_at TIMESTAMP WITH TIME ZONE
    `);
    console.log("Migration successful: added odds_provider, odds_market, odds_captured_at.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}
migrate();
