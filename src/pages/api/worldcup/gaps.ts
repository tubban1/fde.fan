import type { APIRoute } from "astro";
// @ts-ignore
import pg from 'pg';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
    const client = new pg.Client({ connectionString: import.meta.env.SUPABASE_DB_URL });
    await client.connect();
    
    try {
        // Get all gaps and their matches
        const res = await client.query(`
            SELECT 
                g.id as gap_id, g.match_id, g.team_id, g.field_name, g.priority, g.reason, g.status as gap_status, g.created_at,
                m.home_team_id, m.away_team_id, m.stage,
                f.odds_1x2_home, f.odds_1x2_draw, f.odds_1x2_away,
                f.injury_impact_home, f.injury_impact_away,
                f.lineup_strength_home, f.lineup_strength_away,
                f.odds_provider, f.odds_market, f.odds_captured_at,
                f.source_url, f.notes
            FROM worldcup_data_gaps g
            JOIN worldcup_matches m ON g.match_id = m.id
            LEFT JOIN worldcup_manual_features f ON m.id = f.match_id
            ORDER BY m.id ASC
        `);
        
        // Group by match
        const matchesMap = new Map();
        
        res.rows.forEach((row: any) => {
            if (!matchesMap.has(row.match_id)) {
                matchesMap.set(row.match_id, {
                    match_id: row.match_id,
                    home_team_id: row.home_team_id,
                    away_team_id: row.away_team_id,
                    stage: row.stage,
                    gaps: [],
                    // Current manual features if any
                    features: {
                        odds_1x2_home: row.odds_1x2_home,
                        odds_1x2_draw: row.odds_1x2_draw,
                        odds_1x2_away: row.odds_1x2_away,
                        injury_impact_home: row.injury_impact_home,
                        injury_impact_away: row.injury_impact_away,
                        lineup_strength_home: row.lineup_strength_home,
                        lineup_strength_away: row.lineup_strength_away,
                        odds_provider: row.odds_provider || '',
                        odds_market: row.odds_market || '',
                        odds_captured_at: row.odds_captured_at ? new Date(row.odds_captured_at).toISOString().slice(0, 16) : '',
                        source_url: row.source_url || '',
                        notes: row.notes || ''
                    }
                });
            }
            
            matchesMap.get(row.match_id).gaps.push({
                gap_id: row.gap_id,
                team_id: row.team_id,
                field_name: row.field_name,
                status: row.gap_status,
                reason: row.reason
            });
        });
        
        const data = Array.from(matchesMap.values());
        
        return new Response(JSON.stringify({ data }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    } finally {
        await client.end();
    }
};
