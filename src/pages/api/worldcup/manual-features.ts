import type { APIRoute } from "astro";
// @ts-ignore
import pg from 'pg';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    const client = new pg.Client({ connectionString: import.meta.env.SUPABASE_DB_URL });
    await client.connect();
    
    try {
        const body = await request.json();
        const { match_id, features } = body;
        
        if (!match_id) return new Response(JSON.stringify({ error: "match_id required" }), { status: 400 });

        const parseNum = (val: any) => (val === '' || val === null || val === undefined) ? null : Number(val);

        const odds_home = parseNum(features.odds_1x2_home);
        const odds_draw = parseNum(features.odds_1x2_draw);
        const odds_away = parseNum(features.odds_1x2_away);
        const injury_home = parseNum(features.injury_impact_home);
        const injury_away = parseNum(features.injury_impact_away);
        const lineup_home = parseNum(features.lineup_strength_home);
        const lineup_away = parseNum(features.lineup_strength_away);

        // Validation
        const validatePositive = (v: number | null, name: string) => {
            if (v !== null && v <= 0) throw new Error(`${name} must be positive`);
        };
        const validateRange = (v: number | null, name: string, min: number, max: number) => {
            if (v !== null && (v < min || v > max)) throw new Error(`${name} must be between ${min} and ${max}`);
        };

        validatePositive(odds_home, 'Odds Home');
        validatePositive(odds_draw, 'Odds Draw');
        validatePositive(odds_away, 'Odds Away');
        validateRange(injury_home, 'Injury Impact Home', -0.1, 0);
        validateRange(injury_away, 'Injury Impact Away', -0.1, 0);
        validateRange(lineup_home, 'Lineup Strength Home', 0.8, 1.2);
        validateRange(lineup_away, 'Lineup Strength Away', 0.8, 1.2);

        await client.query('BEGIN');
        
        // 1. Upsert manual features
        await client.query(`
            INSERT INTO worldcup_manual_features (
                match_id, odds_1x2_home, odds_1x2_draw, odds_1x2_away,
                injury_impact_home, injury_impact_away,
                lineup_strength_home, lineup_strength_away,
                odds_provider, odds_market, odds_captured_at,
                source_url, notes, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP
            )
            ON CONFLICT (match_id) DO UPDATE SET
                odds_1x2_home = EXCLUDED.odds_1x2_home,
                odds_1x2_draw = EXCLUDED.odds_1x2_draw,
                odds_1x2_away = EXCLUDED.odds_1x2_away,
                injury_impact_home = EXCLUDED.injury_impact_home,
                injury_impact_away = EXCLUDED.injury_impact_away,
                lineup_strength_home = EXCLUDED.lineup_strength_home,
                lineup_strength_away = EXCLUDED.lineup_strength_away,
                odds_provider = EXCLUDED.odds_provider,
                odds_market = EXCLUDED.odds_market,
                odds_captured_at = EXCLUDED.odds_captured_at,
                source_url = EXCLUDED.source_url,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
        `, [
            match_id, 
            odds_home, odds_draw, odds_away,
            injury_home, injury_away,
            lineup_home, lineup_away,
            features.odds_provider || null,
            features.odds_market || null,
            features.odds_captured_at ? new Date(features.odds_captured_at).toISOString() : null,
            features.source_url || null, features.notes || null
        ]);

        // 2. Mark corresponding gaps as resolved
        await client.query(`
            UPDATE worldcup_data_gaps
            SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP, resolved_by = 'admin_ui'
            WHERE match_id = $1
        `, [match_id]);

        await client.query('COMMIT');
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    } finally {
        await client.end();
    }
};
