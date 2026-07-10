import type { APIRoute } from 'astro';
// @ts-ignore
import pg from 'pg';

export const prerender = false;

const getEnv = (name: string) => process.env[name] || import.meta.env[name] || '';

const outcomeFromScores = (home: number | null, away: number | null) => {
  if (home == null || away == null) return 'unknown';
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
};

const predictedOutcomeFromScore = (score?: string | null) => {
  const match = String(score || '').match(/(\d+)\s*[-:]\s*(\d+)/);
  if (!match) return 'unknown';
  return outcomeFromScores(Number(match[1]), Number(match[2]));
};

export const GET: APIRoute = async ({ url }) => {
  const limit = Math.min(80, Math.max(1, Number(url.searchParams.get('limit') || 24)));
  const client = new pg.Client({
    connectionString: getEnv('SUPABASE_DB_URL'),
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT
        m.id,
        m.stage,
        m.round,
        m.kickoff_utc,
        m.status,
        m.home_team_id,
        m.away_team_id,
        ht.name_zh AS home_name_zh,
        ht.name_en AS home_name_en,
        at.name_zh AS away_name_zh,
        at.name_en AS away_name_en,
        m.home_score_90,
        m.away_score_90,
        m.home_score_extra,
        m.away_score_extra,
        m.home_penalties,
        m.away_penalties,
        m.winner_team_id,
        sa.predicted_score,
        sa.score_probabilities,
        sa.summary_zh,
        sa.reasoning_md,
        sa.basis,
        sa.updated_at AS prediction_updated_at
      FROM worldcup_matches m
      LEFT JOIN worldcup_teams ht ON ht.id = m.home_team_id
      LEFT JOIN worldcup_teams at ON at.id = m.away_team_id
      LEFT JOIN worldcup_score_analyses sa ON sa.match_id = m.id AND sa.status = 'success'
      WHERE m.status = 'finished'
        AND m.home_team_id IS NOT NULL
        AND m.away_team_id IS NOT NULL
        AND m.home_score_90 IS NOT NULL
        AND m.away_score_90 IS NOT NULL
      ORDER BY m.kickoff_utc DESC
      LIMIT $1
    `, [limit]);

    const matches = result.rows.map((row: any) => {
      const actualOutcome = row.winner_team_id === row.home_team_id
        ? 'home'
        : row.winner_team_id === row.away_team_id
          ? 'away'
          : outcomeFromScores(row.home_score_90, row.away_score_90);
      const predictedOutcome = predictedOutcomeFromScore(row.predicted_score);
      const predictionAvailable = Boolean(row.predicted_score);
      const outcomeHit = predictionAvailable && predictedOutcome !== 'unknown'
        ? predictedOutcome === actualOutcome
        : null;
      const exactScoreHit = predictionAvailable
        ? String(row.predicted_score).trim() === `${row.home_score_90}-${row.away_score_90}`
        : null;

      return {
        match_id: row.id,
        stage: row.stage,
        round: row.round,
        kickoff_utc: row.kickoff_utc,
        home_team_id: row.home_team_id,
        away_team_id: row.away_team_id,
        home_team: {
          id: row.home_team_id,
          zh: row.home_name_zh,
          en: row.home_name_en,
        },
        away_team: {
          id: row.away_team_id,
          zh: row.away_name_zh,
          en: row.away_name_en,
        },
        actual: {
          score_90: `${row.home_score_90}-${row.away_score_90}`,
          home_score_90: row.home_score_90,
          away_score_90: row.away_score_90,
          home_score_extra: row.home_score_extra,
          away_score_extra: row.away_score_extra,
          home_penalties: row.home_penalties,
          away_penalties: row.away_penalties,
          winner_team_id: row.winner_team_id,
          outcome: actualOutcome,
        },
        prediction: {
          available: predictionAvailable,
          predicted_score: row.predicted_score,
          outcome: predictedOutcome,
          score_probabilities: row.score_probabilities || [],
          summary_zh: row.summary_zh,
          reasoning_md: row.reasoning_md,
          basis: row.basis || {},
          updated_at: row.prediction_updated_at,
        },
        comparison: {
          outcome_hit: outcomeHit,
          exact_score_hit: exactScoreHit,
        },
      };
    });

    const predicted = matches.filter((item: any) => item.prediction.available);
    const outcomeHits = predicted.filter((item: any) => item.comparison.outcome_hit).length;
    const exactHits = predicted.filter((item: any) => item.comparison.exact_score_hit).length;

    return new Response(JSON.stringify({
      matches,
      summary: {
        total_finished: matches.length,
        predicted_count: predicted.length,
        outcome_hits: outcomeHits,
        exact_score_hits: exactHits,
        outcome_accuracy: predicted.length ? outcomeHits / predicted.length : null,
        exact_score_accuracy: predicted.length ? exactHits / predicted.length : null,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'failed to load worldcup history' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await client.end().catch(() => undefined);
  }
};
