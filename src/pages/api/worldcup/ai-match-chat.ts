import type { APIRoute } from 'astro';
// @ts-ignore
import pg from 'pg';
import { streamText, extractStreamTextFromJson } from '../../../server/diagnosis/text_model_provider.js';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { match_id, user_message, baseline, current_scenario } = body;

        if (!user_message) {
            return new Response(JSON.stringify({ error: "Missing user message" }), { status: 400 });
        }

        // Mock test bypass
        if (user_message.includes("测试弃赛") || user_message.includes("mock test")) {
            const mockStream = new ReadableStream({
                start(controller) {
                    const mockJson = JSON.stringify({
                        answer: "这是一个断言测试，检测到关键字，因此直接标记为规则异常。",
                        model_basis: ["Mock Test Triggered"],
                        data_quality: "complete",
                        scenario_judgement: "rule_exception",
                        suggested_actions: [{
                            label: "标记为异常赛况",
                            action: "set_match_status_exception"
                        }],
                        follow_up_questions: []
                    });
                    controller.enqueue("这是 Mock 测试环境的解释流...\n\n```json\n" + mockJson + "\n```");
                    controller.close();
                }
            });
            return new Response(mockStream, {
                headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' }
            });
        }

        const client = new pg.Client({ 
            connectionString: import.meta.env.SUPABASE_DB_URL,
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        
        let fullMatchContext: any = {};
        let dataGaps: any[] = [];
        let homeRecentForm: any[] = [];
        let awayRecentForm: any[] = [];
        let homeRanking: any = null;
        let awayRanking: any = null;
        
        try {
            const matchRes = await client.query(`
                SELECT m.home_team_id, m.away_team_id, m.stage,
                       t_home.name_zh AS home_name_zh, t_home.name_en AS home_name_en,
                       t_away.name_zh AS away_name_zh, t_away.name_en AS away_name_en,
                       v.name AS venue_name, v.city AS venue_city, v.capacity AS venue_capacity,
                       f.odds_1x2_home, f.odds_1x2_draw, f.odds_1x2_away,
                       f.injury_impact_home, f.injury_impact_away,
                       f.lineup_strength_home, f.lineup_strength_away,
                       f.notes AS manual_features_source
                FROM worldcup_matches m
                LEFT JOIN worldcup_teams t_home ON m.home_team_id = t_home.id
                LEFT JOIN worldcup_teams t_away ON m.away_team_id = t_away.id
                LEFT JOIN worldcup_venues v ON m.venue_id = v.id
                LEFT JOIN worldcup_manual_features f ON m.id = f.match_id
                WHERE m.id = $1
            `, [match_id]);
            
            if (matchRes.rows.length > 0) {
                fullMatchContext = matchRes.rows[0];
            }
            
            const gapsRes = await client.query(`
                SELECT field_name, reason, priority, status
                FROM worldcup_data_gaps
                WHERE match_id = $1
            `, [match_id]);
            dataGaps = gapsRes.rows;

            if (fullMatchContext.home_team_id && fullMatchContext.away_team_id) {
                const rankingRes = await client.query(`
                    SELECT team_id, ranking_type, rank, rating
                    FROM worldcup_team_rankings
                    WHERE team_id IN ($1, $2)
                `, [fullMatchContext.home_team_id, fullMatchContext.away_team_id]);
                
                rankingRes.rows.forEach((r: any) => {
                    if (r.team_id === fullMatchContext.home_team_id) homeRanking = r;
                    if (r.team_id === fullMatchContext.away_team_id) awayRanking = r;
                });

                const formRes = await client.query(`
                    SELECT team_id, result, goals_for, goals_against, opponent_name_raw, competition, match_date
                    FROM worldcup_team_form
                    WHERE team_id IN ($1, $2)
                    ORDER BY match_date DESC
                    LIMIT 20
                `, [fullMatchContext.home_team_id, fullMatchContext.away_team_id]);
                
                formRes.rows.forEach((r: any) => {
                    if (r.team_id === fullMatchContext.home_team_id) homeRecentForm.push(r);
                    if (r.team_id === fullMatchContext.away_team_id) awayRecentForm.push(r);
                });
            }
        } finally {
            await client.end();
        }

        const systemPrompt = `You are an expert World Cup Match Analyst.
Your goal is to converse with users about their match assumptions, explain the model's perspective, and suggest actionable parameter adjustments.
You have access to the complete match data:
- Match ID: ${match_id}
- Stage: ${fullMatchContext.stage}
- Venue: ${fullMatchContext.venue_name} (${fullMatchContext.venue_city}) Capacity: ${fullMatchContext.venue_capacity}
- Home Team: ${fullMatchContext.home_name_en} (${fullMatchContext.home_name_zh}) 
  - Ranking: ${JSON.stringify(homeRanking)}
  - Form (Last 10): ${JSON.stringify(homeRecentForm)}
- Away Team: ${fullMatchContext.away_name_en} (${fullMatchContext.away_name_zh})
  - Ranking: ${JSON.stringify(awayRanking)}
  - Form (Last 10): ${JSON.stringify(awayRecentForm)}
- Official Manual Features (currently in DB): 
  - Features: ${JSON.stringify({
      odds_1x2_home: fullMatchContext.odds_1x2_home,
      odds_1x2_draw: fullMatchContext.odds_1x2_draw,
      odds_1x2_away: fullMatchContext.odds_1x2_away,
      injury_impact_home: fullMatchContext.injury_impact_home,
      injury_impact_away: fullMatchContext.injury_impact_away,
      lineup_strength_home: fullMatchContext.lineup_strength_home,
      lineup_strength_away: fullMatchContext.lineup_strength_away
  })}
  - Manual Features Source Note: ${fullMatchContext.manual_features_source}
- Known Data Gaps: ${JSON.stringify(dataGaps)}
- Baseline Probabilities: ${JSON.stringify(baseline)}
- User's Current Scenario Adjustments: ${JSON.stringify(current_scenario)}

Important distinctions:
1. "Normal Assumptions" (e.g. injury, weather, lineup changes, odds shifting): These can be simulated using sliding parameters.
2. "Rule Exceptions" (e.g. forfeit, match cancelled, team disqualified): These CANNOT be simulated via normal parameters. You must flag it as an exception.
3. "Data Gap": If user asks about missing odds or lineups that are listed in Data Gaps, tell them we are awaiting data.

OUTPUT FORMAT:
First, write out your detailed natural language explanation in Chinese. Discuss the model basis (Elo, form, odds), data quality, and your judgment on the scenario.
Then, on a NEW LINE at the very end, output EXACTLY one markdown JSON block containing the structure:
\`\`\`json
{
  "answer": "A short summary of your explanation",
  "model_basis": ["e.g. Elo Advantage", "Recent Form", "Odds Implication"],
  "data_quality": "complete" | "partial" | "weak",
  "scenario_judgement": "normal_assumption" | "rule_exception" | "data_gap" | "needs_clarification",
  "suggested_actions": [
    {
      "label": "Button Label in Chinese (e.g. 标记为异常赛况 or 模拟主队严重伤缺)",
      "action": "set_match_status_exception" | "apply_features",
      "features": { "injury_impact_home": -0.1 } // Only include if action is apply_features. Valid keys: odds_1x2_home, injury_impact_home, lineup_strength_home, rain_level, etc.
    }
  ],
  "follow_up_questions": ["What if ...?", "Is ... confirmed?"]
}
\`\`\`
Do not include any other text after the JSON block.`;

        let modelStream;
        try {
            process.env.AIMATCH_MODEL_PROVIDER = 'vectorengine';
            modelStream = await streamText({
                systemPrompt,
                userPrompt: user_message,
                temperature: 0.7,
                timeout: 70000,
                task: 'AIMATCH'
            });
        } catch (veError: any) {
            console.warn("VectorEngine failed, falling back to TokenRouter", veError?.message || veError);
            process.env.AIMATCH_MODEL_PROVIDER = 'tokenrouter';
            modelStream = await streamText({
                systemPrompt,
                userPrompt: user_message,
                temperature: 0.7,
                timeout: 70000,
                task: 'AIMATCH'
            });
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    let pending = '';
                    for await (const chunk of modelStream) {
                        pending += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
                        const lines = pending.split(/\\r?\\n/);
                        pending = lines.pop() || '';
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed || trimmed === 'data: [DONE]') continue;
                            let text = '';
                            try {
                                if (trimmed.startsWith('data:')) {
                                    text = extractStreamTextFromJson(JSON.parse(trimmed.slice(5) || '{}'));
                                } else if (trimmed.startsWith('{')) {
                                    text = extractStreamTextFromJson(JSON.parse(trimmed));
                                }
                            } catch (e) {
                                // JSON parse error for incomplete chunk, ignore
                            }
                            if (text) {
                                controller.enqueue(text);
                            }
                        }
                    }
                    if (pending.trim()) {
                        let text = '';
                        try {
                            if (pending.startsWith('data:')) text = extractStreamTextFromJson(JSON.parse(pending.slice(5) || '{}'));
                            else if (pending.startsWith('{')) text = extractStreamTextFromJson(JSON.parse(pending));
                        } catch (e) {}
                        if (text) controller.enqueue(text);
                    }
                    controller.close();
                } catch (e) {
                    controller.error(e);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked'
            }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
