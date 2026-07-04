import crypto from 'node:crypto';
import { loadLocalEnv } from '../gaokao/lib/env.mjs';
import { withDb } from '../gaokao/lib/db.mjs';

loadLocalEnv();

const modelName = process.env.REASONING_MODEL || 'gemini-3.5-flash';
const maxMatches = Number(process.env.SCORE_ANALYSIS_MAX_MATCHES || 8);

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);
}

function extractJson(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] || text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('score analysis response did not include JSON');
  return JSON.parse(raw.slice(start, end + 1));
}

async function ensureTable(pool) {
  await pool.query(`
    create table if not exists worldcup_score_analyses (
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
}

async function callGemini(systemPrompt, userPrompt) {
  const apiKey = process.env.VECTORENGINE_GEMINI_KEY || process.env.VECTORENGINE_API_KEY;
  if (!apiKey) throw new Error('VECTORENGINE_GEMINI_KEY is not configured');

  const apiBase = (process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1').replace(/\/$/, '');
  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelName,
      temperature: Number(process.env.SCORE_ANALYSIS_TEMPERATURE || 0.35),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(Number(process.env.SCORE_ANALYSIS_TIMEOUT_MS || 90000)),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    throw new Error(raw || `score analysis request failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function getEligibleMatches(pool) {
  const result = await pool.query(`
    select
      m.id,
      m.kickoff_utc,
      ht.name_zh as home_name_zh,
      at.name_zh as away_name_zh,
      count(distinct o.id) as odds_count,
      count(distinct w.id) as weather_count
    from worldcup_matches m
    join worldcup_teams ht on ht.id = m.home_team_id
    join worldcup_teams at on at.id = m.away_team_id
    join worldcup_weather_snapshots w on w.match_id = m.id
    join worldcup_market_odds_snapshots o on o.match_id = m.id
      and o.market_key = 'h2h'
      and o.home_odds is not null
      and o.draw_odds is not null
      and o.away_odds is not null
    left join worldcup_score_analyses a on a.match_id = m.id and a.status = 'success'
    where m.status in ('scheduled', 'active')
      and a.match_id is null
    group by m.id, m.kickoff_utc, ht.name_zh, at.name_zh
    order by m.kickoff_utc
    limit $1
  `, [maxMatches]);
  return result.rows;
}

async function getContext(pool, matchId) {
  const matchRes = await pool.query(`
    select
      m.id,
      m.stage,
      m.round,
      m.kickoff_utc,
      m.home_team_id,
      m.away_team_id,
      ht.name_zh as home_name_zh,
      ht.name_en as home_name_en,
      at.name_zh as away_name_zh,
      at.name_en as away_name_en,
      v.name as venue_name,
      v.city as venue_city,
      v.country as venue_country
    from worldcup_matches m
    left join worldcup_teams ht on ht.id = m.home_team_id
    left join worldcup_teams at on at.id = m.away_team_id
    left join worldcup_venues v on v.id = m.venue_id
    where m.id = $1
  `, [matchId]);

  if (!matchRes.rows[0]) throw new Error(`Match not found: ${matchId}`);
  const match = matchRes.rows[0];

  const rankingsRes = await pool.query(`
    with ranked as (
      select team_id, ranking_type, rank, rating,
             row_number() over (partition by team_id, ranking_type order by ranking_date desc) rn
      from worldcup_team_rankings
      where team_id in ($1, $2)
    )
    select team_id, ranking_type, rank, rating
    from ranked
    where rn = 1
  `, [match.home_team_id, match.away_team_id]);

  const formRes = await pool.query(`
    with ranked as (
      select team_id, match_date, opponent_name_raw, competition, result, goals_for, goals_against, opponent_elo,
             row_number() over (partition by team_id order by match_date desc) rn
      from worldcup_team_form
      where team_id in ($1, $2)
    )
    select *
    from ranked
    where rn <= 10
    order by team_id, match_date desc
  `, [match.home_team_id, match.away_team_id]);

  const weatherRes = await pool.query(`
    select forecast_time, temperature_c, apparent_temperature_c, humidity_pct,
           precipitation_probability_pct, precipitation_mm, wind_speed_kmh, wind_gusts_kmh, weather_code
    from worldcup_weather_snapshots
    where match_id = $1
    order by snapshot_time desc
    limit 1
  `, [matchId]);

  const oddsRes = await pool.query(`
    with ranked as (
      select bookmaker_key, bookmaker_title, market_key, market_title,
             home_odds, draw_odds, away_odds, last_update,
             row_number() over (
               partition by bookmaker_key, market_key
               order by coalesce(last_update, snapshot_time) desc, snapshot_time desc
             ) rn
      from worldcup_market_odds_snapshots
      where match_id = $1
        and market_key = 'h2h'
        and home_odds is not null
        and draw_odds is not null
        and away_odds is not null
    )
    select *
    from ranked
    where rn = 1
    order by bookmaker_title
  `, [matchId]);

  const tournamentResultsRes = await pool.query(`
    select
      m.id,
      m.stage,
      m.round,
      m.kickoff_utc,
      m.home_team_id,
      m.away_team_id,
      ht.name_zh as home_name_zh,
      at.name_zh as away_name_zh,
      m.home_score,
      m.away_score,
      case
        when m.home_score > m.away_score then m.home_team_id
        when m.away_score > m.home_score then m.away_team_id
        else 'draw'
      end as result_side
    from worldcup_matches m
    left join worldcup_teams ht on ht.id = m.home_team_id
    left join worldcup_teams at on at.id = m.away_team_id
    where m.status = 'finished'
      and m.home_score is not null
      and m.away_score is not null
      and (
        m.home_team_id in ($1, $2)
        or m.away_team_id in ($1, $2)
      )
    order by m.kickoff_utc desc
    limit 12
  `, [match.home_team_id, match.away_team_id]);

  return {
    match,
    rankings: rankingsRes.rows,
    recent_form: formRes.rows,
    weather: weatherRes.rows[0] || null,
    odds: oddsRes.rows,
    tournament_results: tournamentResultsRes.rows,
  };
}

async function saveAnalysis(pool, matchId, payload) {
  await pool.query(`
    insert into worldcup_score_analyses (
      match_id, status, model, predicted_score, score_probabilities,
      summary_zh, reasoning_md, basis, input_fingerprint, error_message, updated_at
    ) values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9,$10,now())
    on conflict (match_id) do update set
      status = excluded.status,
      model = excluded.model,
      predicted_score = excluded.predicted_score,
      score_probabilities = excluded.score_probabilities,
      summary_zh = excluded.summary_zh,
      reasoning_md = excluded.reasoning_md,
      basis = excluded.basis,
      input_fingerprint = excluded.input_fingerprint,
      error_message = excluded.error_message,
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
}

function buildPrompt(context) {
  const systemPrompt = `你是世界杯预测分析师。你必须基于给定的结构化数据，输出比分概率，而不是泛泛聊天。
要求：
- 使用中文。
- 结合 Elo/FIFA 排名、近 10 场状态、本届已完赛表现、天气、赔率盘口。
- 不要声称掌握未提供的首发或伤病。
- 如果本届已完赛数据与长期实力数据矛盾，要明确说明哪一项权重更高以及原因。
- 盘口只作为市场共识补充，不要机械等同于最终概率。
- 给出 5 个最可能比分及概率，概率总和不必为 100%，但每个概率必须合理。
- 推理要比一句话更充分，必须包含主要证据、反向风险和比分路径。
- 输出必须是一个 JSON 对象，不要 markdown，不要额外文字。
JSON schema:
{
  "predicted_score": "2-1",
  "score_probabilities": [
    {"score": "2-1", "probability": 0.14, "label_zh": "主队小胜"}
  ],
  "summary_zh": "一句话结论",
  "reasoning_md": "Markdown 格式的推理依据，建议包含：结论、模型基础、本届比赛表现、盘口信号、天气影响、比分路径、风险因素。",
  "basis": {
    "main_factors": ["Elo/FIFA差距", "本届比赛表现", "市场赔率", "天气"],
    "data_quality": "complete"
  }
}`;

  return {
    systemPrompt,
    userPrompt: JSON.stringify(context, null, 2),
  };
}

async function main() {
  const apiKey = process.env.VECTORENGINE_GEMINI_KEY || process.env.VECTORENGINE_API_KEY;
  if (!apiKey) {
    console.log('[score-analysis] VECTORENGINE_GEMINI_KEY is not configured; skipping score analysis');
    return;
  }

  await withDb(async (pool) => {
    await ensureTable(pool);
    const matches = await getEligibleMatches(pool);
    console.log(`[score-analysis] eligible=${matches.length} max=${maxMatches}`);

    let success = 0;
    let failed = 0;

    for (const match of matches) {
      try {
        const context = await getContext(pool, match.id);
        if (!context.weather || !context.odds.length) {
          console.log(`[score-analysis] skip ${match.id} missing complete weather/odds`);
          continue;
        }

        const fingerprint = stableHash(context);
        const { systemPrompt, userPrompt } = buildPrompt(context);
        const raw = await callGemini(systemPrompt, userPrompt);
        const parsed = extractJson(raw);

        await saveAnalysis(pool, match.id, {
          status: 'success',
          model: modelName,
          predicted_score: parsed.predicted_score,
          score_probabilities: parsed.score_probabilities || [],
          summary_zh: parsed.summary_zh || '',
          reasoning_md: parsed.reasoning_md || '',
          basis: parsed.basis || {},
          input_fingerprint: fingerprint,
        });

        success += 1;
        console.log(`[score-analysis] ${match.id} ${match.home_name_zh} vs ${match.away_name_zh} predicted=${parsed.predicted_score}`);
      } catch (error) {
        failed += 1;
        await saveAnalysis(pool, match.id, {
          status: 'failed',
          model: modelName,
          error_message: error.message || String(error),
        }).catch(() => {});
        console.warn(`[score-analysis] ${match.id} failed: ${error.message || error}`);
      }
    }

    console.log(`[score-analysis] complete success=${success} failed=${failed}`);
  });
}

await main();
