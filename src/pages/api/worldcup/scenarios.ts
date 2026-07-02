import type { APIRoute } from 'astro';
// @ts-ignore
import pkg from 'pg';
const { Client } = pkg;

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const match_id = url.searchParams.get('match_id');
    if (!match_id) return new Response(JSON.stringify({ error: 'missing match_id' }), { status: 400 });

    const client = new Client({
        connectionString: import.meta.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT s.id, s.match_id, s.scenario_name, s.user_id, s.is_official, s.created_at,
                   f.odds_provider, f.odds_market, f.odds_1x2_home, f.odds_1x2_draw, f.odds_1x2_away,
                   f.injury_impact_home, f.injury_impact_away, f.lineup_strength_home, f.lineup_strength_away,
                   f.temperature_c, f.humidity_pct, f.rain_level, f.weather_impact_style, f.notes
            FROM worldcup_prediction_scenarios s
            LEFT JOIN worldcup_scenario_features f ON s.id = f.scenario_id
            WHERE s.match_id = $1
            ORDER BY s.created_at DESC
        `, [match_id]);

        return new Response(JSON.stringify({ scenarios: res.rows }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    } finally {
        await client.end();
    }
};

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json();
    const { match_id, scenario_name, user_id, is_official, features } = body;

    const client = new Client({
        connectionString: import.meta.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        const sRes = await client.query(`
            INSERT INTO worldcup_prediction_scenarios (match_id, scenario_name, user_id, is_official)
            VALUES ($1, $2, $3, $4) RETURNING id
        `, [match_id, scenario_name, user_id, is_official || false]);

        const scenario_id = sRes.rows[0].id;

        if (features) {
            await client.query(`
                INSERT INTO worldcup_scenario_features (
                    scenario_id, odds_provider, odds_market, odds_1x2_home, odds_1x2_draw, odds_1x2_away,
                    injury_impact_home, injury_impact_away, lineup_strength_home, lineup_strength_away,
                    temperature_c, humidity_pct, rain_level, weather_impact_style, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                scenario_id, features.odds_provider, features.odds_market,
                features.odds_1x2_home, features.odds_1x2_draw, features.odds_1x2_away,
                features.injury_impact_home, features.injury_impact_away,
                features.lineup_strength_home, features.lineup_strength_away,
                features.temperature_c, features.humidity_pct, features.rain_level,
                features.weather_impact_style, features.notes
            ]);
        }

        await client.query('COMMIT');
        return new Response(JSON.stringify({ success: true, scenario_id }), { status: 200 });
    } catch (e: any) {
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    } finally {
        await client.end();
    }
};
