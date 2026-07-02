import { withDb } from './lib/db.mjs';
import { loadLocalEnv } from './lib/env.mjs';

loadLocalEnv();

async function run() {
  console.log("Starting backfill for Shandong 2024-2025 admissions...");
  
  await withDb(async (pool) => {
    // 1. Backfill min_score from min_rank (for regular batches)
    console.log("1. Mapping min_rank to min_score using gaokao_score_rank_segments...");
    const scoreResult = await pool.query(`
      UPDATE gaokao_admission_records ar
      SET min_score = (
        SELECT s.score
        FROM gaokao_score_rank_segments s
        WHERE s.province = '山东'
          AND s.year = ar.year
          AND s.subject_combo = '不限'
          AND s.cumulative_count >= ar.min_rank
        ORDER BY s.cumulative_count ASC
        LIMIT 1
      )
      WHERE ar.province = '山东'
        AND ar.year IN (2024, 2025)
        AND ar.min_rank IS NOT NULL
        AND ar.min_score IS NULL
    `);
    console.log(`Updated ${scoreResult.rowCount} rows with resolved min_score values.`);

    // 2. Backfill min_rank from min_score (for sport/arts batches)
    console.log("2. Mapping min_score to min_rank using gaokao_score_rank_segments...");
    const rankResult = await pool.query(`
      UPDATE gaokao_admission_records ar
      SET min_rank = (
        SELECT s.cumulative_count
        FROM gaokao_score_rank_segments s
        WHERE s.province = '山东'
          AND s.year = ar.year
          AND s.subject_combo = '不限'
          AND s.score = ar.min_score
        LIMIT 1
      )
      WHERE ar.province = '山东'
        AND ar.year IN (2024, 2025)
        AND ar.min_score IS NOT NULL
        AND ar.min_rank IS NULL
    `);
    console.log(`Updated ${rankResult.rowCount} rows with resolved min_rank values.`);
  });
  
  console.log("Backfill completed successfully.");
}

run().catch(err => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
