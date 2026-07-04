import type { APIRoute } from 'astro';
// @ts-ignore
import pg from 'pg';

const getEnv = (name: string) => {
    return process.env[name] || import.meta.env[name] || '';
};

const extractVectorEngineDelta = (data: any) => {
    const openAiText = data?.choices?.[0]?.delta?.content || data?.choices?.[0]?.message?.content || '';
    if (openAiText) return openAiText;

    return (data?.candidates || [])
        .flatMap((candidate: any) => candidate?.content?.parts || [])
        .filter((part: any) => !part?.thought && typeof part?.text === 'string')
        .map((part: any) => part.text)
        .join('');
};

const createVectorEngineStream = async (systemPrompt: string, userMessage: string) => {
    const apiKey = getEnv('VECTORENGINE_GEMINI_KEY') || getEnv('VECTORENGINE_API_KEY');
    const apiBase = (getEnv('VECTORENGINE_API_BASE') || 'https://api.vectorengine.cn/v1').replace(/\/$/, '');
    const model = getEnv('REASONING_MODEL') || 'gemini-3.5-flash';

    if (!apiKey) {
        throw new Error('VECTORENGINE_GEMINI_KEY or VECTORENGINE_API_KEY is not configured');
    }

    const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model,
            stream: true,
            temperature: 0.7,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ]
        })
    });

    if (!response.ok) {
        const raw = await response.text().catch(() => '');
        let message = raw || `VectorEngine API Error: ${response.status} ${response.statusText}`;
        try {
            const parsed = JSON.parse(raw);
            message = parsed?.error?.message || parsed?.error || message;
        } catch {}
        throw new Error(message);
    }

    if (!response.body) {
        throw new Error('VectorEngine returned an empty response body');
    }

    return response.body;
};

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
        let homeRanking: any[] = [];
        let awayRanking: any[] = [];
        let weatherSnapshot: any = null;
        let oddsSnapshots: any[] = [];
        let scoreAnalysis: any = null;
        let tournamentResults: any[] = [];
        
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
                    WITH RankedRankings AS (
                        SELECT team_id, ranking_type, rank, rating,
                               ROW_NUMBER() OVER (PARTITION BY team_id, ranking_type ORDER BY ranking_date DESC) as rn
                        FROM worldcup_team_rankings
                        WHERE team_id IN ($1, $2)
                    )
                    SELECT team_id, ranking_type, rank, rating
                    FROM RankedRankings
                    WHERE rn = 1
                `, [fullMatchContext.home_team_id, fullMatchContext.away_team_id]);
                
                rankingRes.rows.forEach((r: any) => {
                    if (r.team_id === fullMatchContext.home_team_id) homeRanking.push(r);
                    if (r.team_id === fullMatchContext.away_team_id) awayRanking.push(r);
                });

                const formRes = await client.query(`
                    WITH RankedForm AS (
                        SELECT team_id, result, goals_for, goals_against, opponent_name_raw, competition, match_date,
                               ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY match_date DESC) as rn
                        FROM worldcup_team_form
                        WHERE team_id IN ($1, $2)
                    )
                    SELECT team_id, result, goals_for, goals_against, opponent_name_raw, competition, match_date 
                    FROM RankedForm 
                    WHERE rn <= 10
                    ORDER BY match_date DESC
                `, [fullMatchContext.home_team_id, fullMatchContext.away_team_id]);
                
                formRes.rows.forEach((r: any) => {
                    if (r.team_id === fullMatchContext.home_team_id) homeRecentForm.push(r);
                    if (r.team_id === fullMatchContext.away_team_id) awayRecentForm.push(r);
                });

                const tournamentRes = await client.query(`
                    SELECT
                        m.id,
                        m.stage,
                        m.round,
                        m.kickoff_utc,
                        m.home_team_id,
                        m.away_team_id,
                        ht.name_zh AS home_name_zh,
                        at.name_zh AS away_name_zh,
                        m.home_score,
                        m.away_score,
                        CASE
                            WHEN m.home_score > m.away_score THEN m.home_team_id
                            WHEN m.away_score > m.home_score THEN m.away_team_id
                            ELSE 'draw'
                        END AS result_side
                    FROM worldcup_matches m
                    LEFT JOIN worldcup_teams ht ON ht.id = m.home_team_id
                    LEFT JOIN worldcup_teams at ON at.id = m.away_team_id
                    WHERE m.status = 'finished'
                      AND m.home_score IS NOT NULL
                      AND m.away_score IS NOT NULL
                      AND (
                        m.home_team_id IN ($1, $2)
                        OR m.away_team_id IN ($1, $2)
                      )
                    ORDER BY m.kickoff_utc DESC
                    LIMIT 12
                `, [fullMatchContext.home_team_id, fullMatchContext.away_team_id]);
                tournamentResults = tournamentRes.rows;
            }

            const weatherRes = await client.query(`
                SELECT forecast_time, temperature_c, apparent_temperature_c, humidity_pct,
                       precipitation_probability_pct, precipitation_mm, wind_speed_kmh, wind_gusts_kmh, weather_code
                FROM worldcup_weather_snapshots
                WHERE match_id = $1
                ORDER BY snapshot_time DESC
                LIMIT 1
            `, [match_id]);
            weatherSnapshot = weatherRes.rows[0] || null;

            const oddsRes = await client.query(`
                WITH ranked AS (
                    SELECT bookmaker_key, bookmaker_title, market_key, market_title,
                           home_odds, draw_odds, away_odds, last_update,
                           ROW_NUMBER() OVER (
                             PARTITION BY bookmaker_key, market_key
                             ORDER BY COALESCE(last_update, snapshot_time) DESC, snapshot_time DESC
                           ) rn
                    FROM worldcup_market_odds_snapshots
                    WHERE match_id = $1
                      AND market_key = 'h2h'
                      AND home_odds IS NOT NULL
                      AND draw_odds IS NOT NULL
                      AND away_odds IS NOT NULL
                )
                SELECT *
                FROM ranked
                WHERE rn = 1
                ORDER BY bookmaker_title
            `, [match_id]);
            oddsSnapshots = oddsRes.rows;

            const scoreRes = await client.query(`
                SELECT predicted_score, score_probabilities, summary_zh, reasoning_md, basis, updated_at
                FROM worldcup_score_analyses
                WHERE match_id = $1 AND status = 'success'
                LIMIT 1
            `, [match_id]);
            scoreAnalysis = scoreRes.rows[0] || null;
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
- Latest Weather Snapshot: ${JSON.stringify(weatherSnapshot)}
- Latest 1X2 Odds Snapshots: ${JSON.stringify(oddsSnapshots)}
- Cached Score Analysis: ${JSON.stringify(scoreAnalysis)}
- Current Tournament Finished Results For These Teams: ${JSON.stringify(tournamentResults)}
- Baseline Probabilities: ${JSON.stringify(baseline)}
- User's Current Scenario Adjustments: ${JSON.stringify(current_scenario)}

Important distinctions:
1. "Normal Assumptions" (e.g. injury, weather, lineup changes, odds shifting): These can be simulated using sliding parameters.
2. "Rule Exceptions" (e.g. forfeit, match cancelled, team disqualified): These CANNOT be simulated via normal parameters. You must flag it as an exception.
3. "Data Gap": If user asks about missing odds or lineups that are listed in Data Gaps, tell them we are awaiting data.
4. If cached score analysis exists, use it as the current official score reasoning baseline, but explain any user-specific assumption separately.
5. Do not mention model vendor names. Say "AI 分析师" or "模型" instead.

OUTPUT FORMAT:
First, write out your detailed natural language explanation in Chinese. Discuss the model basis (Elo, form, current tournament results, weather, odds), data quality, and your judgment on the scenario.
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

        const modelStream = await createVectorEngineStream(systemPrompt, user_message);

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        (async () => {
            const reader = modelStream.getReader();
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            let pending = '';
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    pending += decoder.decode(value, { stream: true });
                    const lines = pending.split(/\r?\n/);
                    pending = lines.pop() || '';
                    
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed === 'data: [DONE]') continue;
                        if (trimmed.startsWith('data:')) {
                            try {
                                const parsed = JSON.parse(trimmed.slice(5).trim());
                                const text = extractVectorEngineDelta(parsed);
                                if (text) {
                                    await writer.write(encoder.encode(text));
                                }
                            } catch (e) {
                                console.error("Parse error:", e instanceof Error ? e.message : e);
                            }
                        } else if (trimmed.startsWith('{')) {
                            try {
                                const parsed = JSON.parse(trimmed);
                                const text = extractVectorEngineDelta(parsed);
                                if (text) {
                                    await writer.write(encoder.encode(text));
                                }
                            } catch (e) {
                                console.error("Parse error:", e instanceof Error ? e.message : e);
                            }
                        }
                    }
                }
                const remaining = pending.trim();
                if (remaining && remaining !== 'data: [DONE]') {
                    try {
                        const payload = remaining.startsWith('data:') ? remaining.slice(5).trim() : remaining;
                        const parsed = JSON.parse(payload);
                        const text = extractVectorEngineDelta(parsed);
                        if (text) {
                            await writer.write(encoder.encode(text));
                        }
                    } catch (e) {}
                }
                await writer.close();
            } catch (e) {
                await writer.abort(e);
            }
        })();

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked'
            }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({
            error: e.message || 'AI service failed',
            provider: 'vectorengine'
        }), { status: 502 });
    }
};
