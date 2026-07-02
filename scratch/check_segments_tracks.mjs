import { loadLocalEnv } from '../scripts/gaokao/lib/env.mjs';
import { withDb } from '../scripts/gaokao/lib/db.mjs';

loadLocalEnv();

await withDb(async pool => {
  const tracks = await pool.query(`
    select candidate_track, count(*)::int as count 
      from gaokao_score_rank_segments 
     group by candidate_track 
     order by count desc
  `);
  console.log("Unique candidate_tracks:");
  console.table(tracks.rows);

  const combos = await pool.query(`
    select subject_combo, count(*)::int as count 
      from gaokao_score_rank_segments 
     group by subject_combo 
     order by count desc
  `);
  console.log("Unique subject_combos:");
  console.table(combos.rows);
});
