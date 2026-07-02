import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

async function check() {
  const res = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE 'worldcup_%'
  `);
  console.log("Tables:", res.rows.map(r => r.table_name));

  try {
    const res2 = await pool.query('SELECT * FROM worldcup_data_gaps LIMIT 1');
    console.log("worldcup_data_gaps columns:", Object.keys(res2.rows[0] || {}));
  } catch(e) {
    console.log("worldcup_data_gaps error:", e.message);
  }
  
  pool.end();
}
check();
