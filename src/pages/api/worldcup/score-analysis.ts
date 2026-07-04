import type { APIRoute } from 'astro';
// @ts-ignore
import pg from 'pg';
import crypto from 'node:crypto';

export const prerender = false;

const getEnv = (name: string) => process.env[name] || import.meta.env[name] || '';

const modelName = () => getEnv('REASONING_MODEL') || 'gemini-3.5-flash';

const ensureTable = async (client: any) => {
    await client.query(`
        CREATE TABLE IF NOT EXISTS worldcup_score_analyses (
            match_id text primary key references worldcup_matches(id),
            status text not null,
            model text,
            predicted_score text,
            score_probabilities jsonb not null default '[]'::jsonb,
            summary_zh text,
            reasoning_md text,
            basis jsonb not null default '{}'::jsonb,
            input_fingerprint text,
            error_message text,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
        )
    `);
};

const stableHash = (value: unknown) =>
    crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);

const extractJson = (text: string) => {
    const fenced = text.match(/```json\s*([\s\S]*?)```/i);
    const raw = fenced?.[1] || text;
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end < start) throw new Error('Gemini response did not include JSON');
    return JSON.parse(raw.slice(start, end + 1));
};

const callGemini = async (systemPrompt: string, userPrompt: string) => {
    const apiKey = getEnv('VECTORENGINE_GEMINI_KEY') || getEnv('VECTORENGINE_API_KEY');
    if (!apiKey) throw new Error('VECTORENGINE_GEMINI_KEY is not configured');

    const apiBase = (getEnv('VECTORENGINE_API_BASE') || 'https://api.vectorengine.cn/v1').replace(/\/$/, '');
    const response = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: modelName(),
            temperature: 0.35,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        }),
        signal: AbortSignal.timeout(90000),
    });

    if (!response.ok) {
        const raw = await response.text().catch(() => '');
        throw new Error(raw || `Gemini request failed: ${response.status}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
};

const getContext = async (client: any, matchId: string) => {
    const matchRes = await client.query(`
        SELECT
            m.id,
            m.stage,
            m.round,
            m.kickoff_utc,
            m.home_team_id,
            m.away_team_id,
            ht.name_zh AS home_name_zh,
            ht.name_en AS home_name_en,
            at.name_zh AS away_name_zh,
            at.name_en AS away_name_en,
            v.name AS venue_name,
            v.city AS venue_city,
            v.country AS venue_country
        FROM worldcup_matches m
        LEFT JOIN worldcup_teams ht ON ht.id = m.home_team_id
        LEFT JOIN worldcup_teams at ON at.id = m.away_team_id
        LEFT JOIN worldcup_venues v ON v.id = m.venue_id
        WHERE m.id = $1
    `, [matchId]);

    if (!matchRes.rows[0]) throw new Error('Match not found');
    const match = matchRes.rows[0];

    const rankingsRes = await client.query(`
        WITH ranked AS (
            SELECT team_id, ranking_type, rank, rating,
                   ROW_NUMBER() OVER (PARTITION BY team_id, ranking_type ORDER BY ranking_date DESC) rn
            FROM worldcup_team_rankings
            WHERE team_id IN ($1, $2)
        )
        SELECT team_id, ranking_type, rank, rating
        FROM ranked
        WHERE rn = 1
    `, [match.home_team_id, match.away_team_id]);

    const formRes = await client.query(`
        WITH ranked AS (
            SELECT team_id, match_date, opponent_name_raw, competition, result, goals_for, goals_against, opponent_elo,
                   ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY match_date DESC) rn
            FROM worldcup_team_form
            WHERE team_id IN ($1, $2)
        )
        SELECT *
        FROM ranked
        WHERE rn <= 10
        ORDER BY team_id, match_date DESC
    `, [match.home_team_id, match.away_team_id]);

    const weatherRes = await client.query(`
        SELECT forecast_time, temperature_c, apparent_temperature_c, humidity_pct,
               precipitation_probability_pct, precipitation_mm, wind_speed_kmh, wind_gusts_kmh, weather_code
        FROM worldcup_weather_snapshots
        WHERE match_id = $1
        ORDER BY snapshot_time DESC
        LIMIT 1
    `, [matchId]);

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
    `, [matchId]);

    return {
        match,
        rankings: rankingsRes.rows,
        form: formRes.rows,
        weather: weatherRes.rows[0] || null,
        odds: oddsRes.rows,
    };
};

const saveAnalysis = async (client: any, matchId: string, payload: any) => {
    await client.query(`
        INSERT INTO worldcup_score_analyses (
            match_id, status, model, predicted_score, score_probabilities,
            summary_zh, reasoning_md, basis, input_fingerprint, error_message, updated_at
        ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10,now())
        ON CONFLICT (match_id) DO UPDATE SET
            status = EXCLUDED.status,
            model = EXCLUDED.model,
            predicted_score = EXCLUDED.predicted_score,
            score_probabilities = EXCLUDED.score_probabilities,
            summary_zh = EXCLUDED.summary_zh,
            reasoning_md = EXCLUDED.reasoning_md,
            basis = EXCLUDED.basis,
            input_fingerprint = EXCLUDED.input_fingerprint,
            error_message = EXCLUDED.error_message,
            updated_at = now()
    `, [
        matchId,
        payload.status,
        payload.model || null,
        payload.predicted_score || null,
        JSON.stringify(payload.score_probabilities || []),
        payload.summary_zh || null,
        payload.reasoning_md || null,
        JSON.stringify(payload.basis || {}),
        payload.input_fingerprint || null,
        payload.error_message || null,
    ]);
};

export const POST: APIRoute = async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const matchId = body.match_id;
    const baseline = body.baseline || null;
    const shouldGenerate = body.generate === true;

    if (!matchId) {
        return new Response(JSON.stringify({ error: 'Missing match_id' }), { status: 400 });
    }

    const client = new pg.Client({
        connectionString: getEnv('SUPABASE_DB_URL'),
        ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    try {
        await ensureTable(client);

        const cached = await client.query(`
            SELECT match_id, status, model, predicted_score, score_probabilities,
                   summary_zh, reasoning_md, basis, updated_at, error_message
            FROM worldcup_score_analyses
            WHERE match_id = $1 AND status = 'success'
            LIMIT 1
        `, [matchId]);

        if (cached.rows[0]) {
            return new Response(JSON.stringify({
                source: 'cache',
                analysis: cached.rows[0],
            }), { headers: { 'Content-Type': 'application/json' } });
        }

        if (!shouldGenerate) {
            return new Response(JSON.stringify({
                source: 'unavailable',
                reason: 'analysis_not_cached',
            }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }

        const context = await getContext(client, matchId);
        const oddsComplete = context.odds.length > 0;
        const weatherComplete = Boolean(context.weather);

        if (!oddsComplete || !weatherComplete) {
            return new Response(JSON.stringify({
                source: 'unavailable',
                reason: !oddsComplete && !weatherComplete ? 'missing_weather_and_odds' : (!oddsComplete ? 'missing_odds' : 'missing_weather'),
                odds_count: context.odds.length,
                has_weather: weatherComplete,
            }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }

        const fingerprint = stableHash({ context, baseline });

        const systemPrompt = `你是世界杯预测分析师。你必须基于给定的结构化数据，输出比分概率，而不是泛泛聊天。
要求：
- 使用中文。
- 结合 Elo/FIFA 排名、近 10 场状态、胜平负概率、天气、赔率盘口。
- 不要声称掌握未提供的首发或伤病。
- 给出 5 个最可能比分及概率，概率总和不必为 100%，但每个概率必须合理。
- 输出必须是一个 JSON 对象，不要 markdown，不要额外文字。
JSON schema:
{
  "predicted_score": "2-1",
  "score_probabilities": [
    {"score": "2-1", "probability": 0.14, "label_zh": "主队小胜"}
  ],
  "summary_zh": "一句话结论",
  "reasoning_md": "Markdown 格式的推理依据，包含：模型基础、盘口信号、天气影响、风险因素",
  "basis": {
    "main_factors": ["Elo优势", "市场赔率", "天气"],
    "data_quality": "complete"
  }
}`;

        const userPrompt = JSON.stringify({
            match: context.match,
            baseline,
            rankings: context.rankings,
            recent_form: context.form,
            weather: context.weather,
            odds: context.odds,
        }, null, 2);

        const raw = await callGemini(systemPrompt, userPrompt);
        const parsed = extractJson(raw);

        const analysis = {
            status: 'success',
            model: modelName(),
            predicted_score: parsed.predicted_score,
            score_probabilities: parsed.score_probabilities || [],
            summary_zh: parsed.summary_zh || '',
            reasoning_md: parsed.reasoning_md || '',
            basis: parsed.basis || {},
            input_fingerprint: fingerprint,
        };

        await saveAnalysis(client, matchId, analysis);

        return new Response(JSON.stringify({
            source: 'gemini',
            analysis,
        }), { headers: { 'Content-Type': 'application/json' } });
    } catch (error: any) {
        await saveAnalysis(client, matchId, {
            status: 'failed',
            model: modelName(),
            error_message: error.message || String(error),
        }).catch(() => {});

        return new Response(JSON.stringify({
            error: error.message || 'score analysis failed',
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    } finally {
        await client.end();
    }
};
