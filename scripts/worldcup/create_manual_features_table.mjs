import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

async function migrate() {
  console.log('Creating worldcup_manual_features table...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worldcup_manual_features (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          match_id VARCHAR(50) NOT NULL REFERENCES worldcup_matches(id),
          home_team_id VARCHAR(50),
          away_team_id VARCHAR(50),
          
          odds_1x2_home NUMERIC(5,2),
          odds_1x2_draw NUMERIC(5,2),
          odds_1x2_away NUMERIC(5,2),
          
          injury_impact_home NUMERIC(5,2),
          injury_impact_away NUMERIC(5,2),
          
          lineup_strength_home NUMERIC(5,2),
          lineup_strength_away NUMERIC(5,2),
          
          source_url TEXT,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_worldcup_manual_features_match 
      ON worldcup_manual_features(match_id);
    `);
    console.log('Table created successfully.');
  } catch(e) {
    console.error('Error creating table:', e);
  } finally {
    pool.end();
  }
}

migrate();
