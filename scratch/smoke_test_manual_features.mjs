import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

async function test() {
  const match_id = 'match-86';
  
  // Clean up
  await pool.query('DELETE FROM worldcup_manual_features WHERE match_id = $1', [match_id]);
  
  // Simulate POST API behavior
  const features = {
      odds_1x2_home: 1.5,
      odds_1x2_draw: 3.5,
      odds_1x2_away: 5.0,
      injury_impact_home: 0, // This is the 0 we are testing
      injury_impact_away: -0.05,
      lineup_strength_home: 1.1,
      lineup_strength_away: 0.9,
      source_url: 'test',
      notes: 'test'
  };

  const parseNum = (val) => (val === '' || val === null || val === undefined) ? null : Number(val);
  
  const odds_home = parseNum(features.odds_1x2_home);
  const injury_home = parseNum(features.injury_impact_home);
  const lineup_home = parseNum(features.lineup_strength_home);

  if (odds_home <= 0) throw new Error('odds_home must be positive');
  if (injury_home < -0.1 || injury_home > 0) throw new Error('injury_home out of range');
  if (lineup_home < 0.8 || lineup_home > 1.2) throw new Error('lineup_home out of range');

  await pool.query(`
      INSERT INTO worldcup_manual_features (
          match_id, odds_1x2_home, injury_impact_home, lineup_strength_home
      ) VALUES ($1, $2, $3, $4)
  `, [match_id, odds_home, injury_home, lineup_home]);

  const res = await pool.query('SELECT injury_impact_home FROM worldcup_manual_features WHERE match_id = $1', [match_id]);
  console.log("Saved injury_impact_home:", res.rows[0].injury_impact_home); // Should be '0.00' (numeric type returns string in pg)

  pool.end();
}
test();
