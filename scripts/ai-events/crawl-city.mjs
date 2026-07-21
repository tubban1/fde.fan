import { createAdapter } from './adapters/index.mjs';
import { loadLocalEnv, withDb } from './lib/db.mjs';
import { isLikelyEvent, normalizeUrl, normalizeWhitespace, rollYearlessPastDateForward } from './lib/normalize.mjs';
import { classifySourceUrl } from './lib/source-scope.mjs';

loadLocalEnv();

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const requestedCity = arg('city');
const requestedCityKey = arg('city-key');
let cityId = '';
let cityKey = '';
let cityEn = '';
let cityDisplayName = '';
let cityAliases = [];
const limitPerSource = Number(arg('limit-per-source', process.env.AI_EVENTS_LIMIT_PER_SOURCE || 20));
const rawOnly = process.argv.includes('--raw-only') || process.env.AI_EVENTS_RAW_ONLY === '1';
const fetchCandidateDetails = process.env.AI_EVENTS_FETCH_CANDIDATE_DETAILS !== '0';
const providerModel = process.env.MODEL_NAME || '';
const providerApiKey = process.env.MODEL_API_KEY || '';
const providerApiBase = String(process.env.MODEL_API_BASE || '').replace(/\/$/, '');
const providerApiFormat = String(process.env.MODEL_API_FORMAT || 'generate_content').toLowerCase();
const modelRetryCount = Number(process.env.MODEL_RETRY_COUNT || 2);
const modelRetryDelayMs = Number(process.env.MODEL_RETRY_DELAY_MS || 5000);

function firstLatinAlias(aliases, fallback) {
  return aliases.find(value => /^[A-Za-z][A-Za-z\s-]*$/.test(String(value || ''))) || fallback;
}

async function loadCity(pool) {
  const lookup = requestedCityKey || requestedCity;
  if (!lookup) {
    throw new Error('Missing city lookup. Set --city-key or --city.');
  }
  const result = await pool.query(
    `select *
     from "aiEvents_cities"
     where is_active = true
       and (
         city_key = $1
         or display_name = $1
         or aliases ? $1
       )
     order by case when city_key = $1 then 0 when display_name = $1 then 1 else 2 end
     limit 1`,
    [lookup],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error(`City is not defined in aiEvents_cities: ${lookup}. Insert the city first, then bind sources to it.`);
  }

  cityId = row.id;
  cityKey = row.city_key;
  cityDisplayName = row.display_name;
  cityAliases = Array.isArray(row.aliases) ? row.aliases : [];
  cityEn = arg('city-en', firstLatinAlias(cityAliases, cityDisplayName));
  cityAliases = Array.from(new Set([cityDisplayName, cityEn, ...cityAliases].filter(Boolean)));
  return row;
}

async function activeSourcesForCity(pool) {
  const result = await pool.query(
    `select *
     from "aiEvents_sources"
     where city_key = $1
       and status = 'active'
       and source_kind <> 'single_event'
     order by priority desc, source_type, url`,
    [cityKey],
  );
  return result.rows.map(row => ({
    id: row.id,
    source_type: row.source_type,
    fetch_method: row.fetch_method,
    url: row.url,
    priority: row.priority,
    source_kind: row.source_kind || 'recurring_source',
    source_scope: row.source_scope || classifySourceUrl(row.url).source_scope,
    relevance_level: row.relevance_level || classifySourceUrl(row.url).relevance_level,
    raw_config: row.raw_config || {},
  }));
}

async function insertRun(pool, cityId) {
  const result = await pool.query(
    `insert into "aiEvents_crawl_runs" (city_id, city_key, city, raw_summary)
     values ($1,$2,$3,$4::jsonb)
     returning id`,
    [cityId, cityKey, cityDisplayName, JSON.stringify({ city_en: cityEn, aliases: cityAliases, provider_model: providerModel })],
  );
  return result.rows[0].id;
}

function rawTextFor(candidate) {
  return normalizeWhitespace([
    candidate.canonical_title || candidate.title,
    candidate.description,
    candidate.start_time,
    candidate.end_time,
    candidate.city,
    candidate.venue,
    candidate.organizer,
    candidate.registration_url,
    candidate.source_url,
  ].filter(Boolean).join('\n'));
}

function stripHtml(value) {
  return normalizeWhitespace(String(value || '').replace(/<[^>]+>/g, ' '));
}

function pageTitle(detail) {
  return stripHtml(String(detail.text || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
}

function isGenericActionTitle(value) {
  return /^(立即报名|我要报名|报名|查看详情|活动详情|更多|more|register)$/i.test(normalizeWhitespace(value));
}

function pageFallbackCandidate({ source, detail }) {
  const text = normalizeWhitespace(String(detail.text || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
  const configuredTitle = source.raw_config?.note || '';
  const title = isGenericActionTitle(configuredTitle) ? pageTitle(detail) : configuredTitle || pageTitle(detail) || source.url;
  return {
    title,
    canonical_title: title,
    description: text.slice(0, 4000),
    source_url: detail.url || source.url,
    registration_url: detail.url || source.url,
    city: cityDisplayName,
    confidence_score: 35,
    raw_data: { fallback: true, source_url: source.url },
  };
}

function hasExplicitDate(candidate) {
  return Boolean(candidate.start_time || candidate.startTime || candidate.startDate || candidate.date);
}

function hasSourceSpecificEventUrl(source, candidate) {
  const url = normalizeUrl(candidate.source_url || candidate.registration_url || '');
  if (!url) return false;
  if (source.source_type === 'tencent_cloud_salon_list') return /\/developer\/salon\/salon-\d+/i.test(url);
  if (source.source_type === 'volcengine_activities') return /\/activities\/\d+/i.test(url);
  if (source.source_type === 'lianpu_city') return /\/event\//i.test(url);
  if (source.source_type === 'eventbrite_city_search') return /\/e\//i.test(url);
  if (source.source_type === 'meetup_city_search') return /\/events\//i.test(url);
  if (source.source_type === 'segmentfault_events') return /\/e\//i.test(url);
  if (source.source_type === 'huodongxing_city') return /huodongxing\.com\/event\/\d+/i.test(url);
  return false;
}

function sourceRequiresEventUrl(source) {
  return [
    'tencent_cloud_salon_list',
    'volcengine_activities',
    'lianpu_city',
    'eventbrite_city_search',
    'meetup_city_search',
    'segmentfault_events',
    'huodongxing_city',
  ].includes(source.source_type);
}

function isUsefulCrawlCandidate(candidate, source) {
  const hasEventUrl = hasSourceSpecificEventUrl(source, candidate);
  const title = normalizeWhitespace(candidate.canonical_title || candidate.title || candidate.name);
  if (sourceRequiresEventUrl(source)) return hasEventUrl && title.length >= 4;
  if (!isLikelyEvent(candidate)) return false;
  if (hasEventUrl) return true;
  if (!title) return false;
  if (hasExplicitDate(candidate)) return true;
  if (title.length < 6) return false;
  return !/^(报名中|报名截止|更多活动|活动详情|活动推荐|沙龙|技术沙龙|线下沙龙|开发者社区技术沙龙|发现科技好活动|conferences|classes\s*&\s*workshops|\d+\.\s*workshops)$/i.test(title);
}

async function candidatesForSource({ adapter, source, detail }) {
  const parsedCandidates = (await adapter.parse(detail)).filter(candidate => isUsefulCrawlCandidate(candidate, source));
  if (source.fetch_method !== 'html_detail') {
    return parsedCandidates;
  }

  return [pageFallbackCandidate({ source, detail })];
}

function candidateLimitForSource(source) {
  const configured = Number(source.raw_config?.limit_per_source || 0);
  if (configured > 0) return configured;
  if (source.source_type === 'huodongxing_city' || String(source.url || '').includes('huodongxing.com')) {
    return Math.max(limitPerSource, Number(process.env.AI_EVENTS_HUODONGXING_LIMIT_PER_SOURCE || 60));
  }
  if (source.source_type === 'eventbrite_city_search' || String(source.url || '').includes('eventbrite.')) {
    return Math.max(limitPerSource, Number(process.env.AI_EVENTS_EVENTBRITE_LIMIT_PER_SOURCE || 60));
  }
  if (source.source_type === 'meetup_city_search' || String(source.url || '').includes('meetup.com')) {
    return Math.max(limitPerSource, Number(process.env.AI_EVENTS_MEETUP_LIMIT_PER_SOURCE || 60));
  }
  if (source.source_type === 'segmentfault_events' || String(source.url || '').includes('segmentfault.com')) {
    return Math.max(limitPerSource, Number(process.env.AI_EVENTS_SEGMENTFAULT_LIMIT_PER_SOURCE || 40));
  }
  if (String(source.url || '').includes('lu.ma') || String(source.url || '').includes('luma.com')) {
    return Math.max(limitPerSource, Number(process.env.AI_EVENTS_LUMA_LIMIT_PER_SOURCE || 80));
  }
  return limitPerSource;
}

async function enrichCandidate({ adapter, source, listDetail, candidate }) {
  if (!fetchCandidateDetails || source.fetch_method === 'html_detail') {
    return { detail: listDetail, candidate };
  }

  const candidateUrl = normalizeUrl(candidate.source_url || candidate.registration_url || '', listDetail.url);
  if (!candidateUrl || candidateUrl === normalizeUrl(source.url)) {
    return { detail: listDetail, candidate };
  }

  try {
    const detail = await adapter.fetchDetail(candidateUrl);
    const fallback = pageFallbackCandidate({
      source: {
        ...source,
        url: candidateUrl,
        raw_config: {
          ...(source.raw_config || {}),
          note: candidate.canonical_title || candidate.title || candidateUrl,
        },
      },
      detail,
    });
    const candidateTitle = candidate.canonical_title || candidate.title || '';
    const title = isGenericActionTitle(candidateTitle) ? fallback.title : candidateTitle || fallback.title;
    return {
      detail,
      candidate: {
        ...fallback,
        ...candidate,
        title,
        canonical_title: title,
        description: normalizeWhitespace([candidate.description, fallback.description].filter(Boolean).join(' ')).slice(0, 4000),
        source_url: candidateUrl,
        registration_url: candidate.registration_url || candidateUrl,
      },
    };
  } catch (error) {
    return {
      detail: listDetail,
      candidate: {
        ...candidate,
        raw_data: {
          ...(candidate.raw_data || {}),
          detail_fetch_error: error.message || String(error),
        },
      },
    };
  }
}

async function upsertRaw(pool, { runId, sourceId, cityId, source, fetchedUrl, detail, candidate }) {
  const sourceUrl = normalizeUrl(candidate.source_url || candidate.registration_url || source.url, detail.url);
  const result = await pool.query(
    `insert into "aiEvents_raw"
      (crawl_run_id, source_id, city_id, city_key, city, source_type, source_url, source_url_normalized, fetched_url,
       content_type, raw_title, raw_text, raw_payload, processing_status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,'pending')
     on conflict (source_url_normalized, city) do update set
       crawl_run_id = excluded.crawl_run_id,
       source_id = excluded.source_id,
       city_id = excluded.city_id,
       city_key = excluded.city_key,
       fetched_url = excluded.fetched_url,
       content_type = excluded.content_type,
       raw_title = excluded.raw_title,
       raw_text = excluded.raw_text,
       raw_payload = excluded.raw_payload,
       processing_status = 'pending',
       processing_error = null,
       fetched_at = now()
     returning id`,
    [
      runId,
      sourceId,
      cityId,
      cityKey,
      cityDisplayName,
      source.source_type,
      sourceUrl,
      normalizeUrl(sourceUrl),
      fetchedUrl,
      detail.contentType || null,
      candidate.canonical_title || candidate.title || null,
      rawTextFor(candidate),
      JSON.stringify({ candidate, source, city_key: cityKey, city_aliases: cityAliases, fetched_url: fetchedUrl, source_scope: source.source_scope, relevance_level: source.relevance_level }),
    ],
  );
  return result.rows[0].id;
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    const object = trimmed.match(/\{[\s\S]*\}/)?.[0];
    if (object) return JSON.parse(object);
    throw new Error('Model response did not contain JSON');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateContentUrl() {
  const modelPath = `${encodeURIComponent(providerModel)}:generateContent`;
  return providerApiBase.endsWith('/models')
    ? `${providerApiBase}/${modelPath}`
    : `${providerApiBase}/models/${modelPath}`;
}

function chatCompletionsUrl() {
  return `${providerApiBase}/chat/completions`;
}

function extractModelText(payload) {
  const chatText = payload?.choices?.[0]?.message?.content || '';
  if (chatText) return chatText;
  return payload?.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('') || '';
}

async function requestModelJson(prompt) {
  if (providerApiFormat === 'chat_completions') {
    const response = await fetch(chatCompletionsUrl(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${providerApiKey}`,
      },
      body: JSON.stringify({
        model: providerModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(Number(process.env.MODEL_TIMEOUT_MS || 30000)),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Provider request failed ${response.status}: ${body.slice(0, 500)}`);
    }
    return response.json();
  }

  const response = await fetch(generateContentUrl(), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': providerApiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        topP: 1,
        thinkingConfig: {
          includeThoughts: false,
          thinkingBudget: Number(process.env.MODEL_THINKING_BUDGET || 8192),
        },
      },
    }),
    signal: AbortSignal.timeout(Number(process.env.MODEL_TIMEOUT_MS || 30000)),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Provider request failed ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json();
}

async function normalizeWithProvider(raw) {
  if (!providerApiKey || !providerApiBase || !providerModel) {
    throw new Error('Missing MODEL_API_KEY, MODEL_API_BASE, or MODEL_NAME.');
  }
  const crawlDate = new Date().toISOString().slice(0, 10);
  const sourceScope = raw.source_scope || raw.raw_payload?.source_scope || 'unknown';
  const relevanceLevel = raw.relevance_level || raw.raw_payload?.relevance_level || 'unknown';
  const prompt = `你是中文 AI 活动数据库的数据清洗器。请把原始抓取内容归一化为中文字段。
只返回紧凑 JSON，不要 markdown。Schema:
{
  "is_event": boolean,
  "is_ai_related": boolean,
  "title": string,
  "description": string,
  "start_time": string|null,
  "end_time": string|null,
  "timezone": string,
  "city": string|null,
  "venue": string|null,
  "address": string|null,
  "online_url": string|null,
  "organizer": string|null,
  "speakers": string[],
  "tags": string[],
  "price": string|null,
  "event_url": string|null,
  "confidence_score": number
}
规则:
- 输出语言必须是简体中文。title、description、tags、venue、organizer 尽量翻译成中文；品牌名、人名、产品名可以保留原文。
- 当前抓取日期是 ${crawlDate}。如果原始内容只有“8.14”“8月14日”这类无年份日期，必须推断为当前日期之后最近一次出现的日期，不要使用过去年份。
- 来源范围 source_scope=${sourceScope}，相关性 relevance_level=${relevanceLevel}。
- source_scope=city_ai 表示入口已同时按城市和 AI 过滤，但仍需确认它是真实活动。
- source_scope=city_tech 或 city_only 表示入口不是明确 AI 过滤；必须从标题/正文/主办方中看到 AI、大模型、Agent、AIGC、机器学习、云原生 AI 等明确证据，才能设置 is_ai_related=true。
- source_scope=ai_global 表示入口是 AI/科技主题但没有城市过滤；必须从内容中确认目标城市、可接受别名或纯线上，否则设置 is_event=false。
- 目标城市是 ${cityDisplayName}；可接受别名是 ${cityAliases.join(', ')}。
- 如果活动明确是纯线上，city 使用 "线上"。
- 如果活动不在目标城市/别名，也不是纯线上，请设置 is_event=false。
- 不要把其他城市写入 city 字段；city 只能是 "${cityDisplayName}" 或 "线上" 或 null。
- 保留 source/event URL。
- tags 必须是 3 到 8 个简短中文搜索/过滤标签，例如主题、形式、技术、行业、人群。
- 时间已知时必须使用 ISO 8601。
- 如果它不是真实活动，或不是 AI 相关活动，设置 is_event/is_ai_related false。

原始数据:
${JSON.stringify(raw, null, 2).slice(0, 12000)}`;

  let lastError;
  for (let attempt = 0; attempt <= modelRetryCount; attempt += 1) {
    try {
      const payload = await requestModelJson(prompt);
      const text = extractModelText(payload);
      return extractJson(text);
    } catch (error) {
      lastError = error;
      if (!isTransientModelError(error) || attempt >= modelRetryCount) break;
      await sleep(modelRetryDelayMs * (attempt + 1));
    }
  }
  throw lastError;
}

function normalizeTags(value) {
  const tags = Array.isArray(value) ? value : String(value || '').split(/[,，、]/);
  return Array.from(new Set(tags
    .map(tag => normalizeWhitespace(tag).replace(/^#/, ''))
    .filter(tag => tag.length >= 2 && tag.length <= 30)))
    .slice(0, 12);
}

function isOnlineCity(value) {
  const text = normalizeWhitespace(value).toLowerCase();
  return text === '线上' || text === 'online' || text === 'virtual' || text === 'remote';
}

function isAcceptedCity(value) {
  const text = normalizeWhitespace(value);
  if (!text) return true;
  if (isOnlineCity(text)) return true;
  const lower = text.toLowerCase();
  return cityAliases.some(alias => {
    const normalizedAlias = normalizeWhitespace(alias).toLowerCase();
    return normalizedAlias && (lower === normalizedAlias || lower.includes(normalizedAlias));
  });
}

function eventCityFor(normalized) {
  return isOnlineCity(normalized.city) ? '线上' : cityDisplayName;
}

function normalizeConfidence(value) {
  const score = Number(value || 0);
  if (!Number.isFinite(score)) return 0;
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

function normalizeEventDateFields(raw, normalized) {
  const rawText = normalizeWhitespace([
    raw.raw_title,
    raw.raw_text,
    JSON.stringify(raw.raw_payload || {}),
  ].filter(Boolean).join('\n'));
  return {
    ...normalized,
    start_time: rollYearlessPastDateForward(normalized.start_time, rawText, { timezone: normalized.timezone || 'Asia/Shanghai' }),
    end_time: rollYearlessPastDateForward(normalized.end_time, rawText, { timezone: normalized.timezone || 'Asia/Shanghai' }),
  };
}

async function upsertEvent(pool, raw, normalized) {
  normalized = normalizeEventDateFields(raw, normalized);
  const isUseful = normalized.is_event && normalized.is_ai_related && normalized.title && normalized.start_time;
  if (!isUseful) {
    await pool.query(
      `update "aiEvents_raw"
       set processing_status = 'ignored', processing_error = $2
       where id = $1`,
      [raw.id, 'Model classified item as not a dated AI event'],
    );
    return false;
  }
  if (!isAcceptedCity(normalized.city)) {
    await pool.query(
      `update "aiEvents_raw"
       set processing_status = 'ignored', processing_error = $2
       where id = $1`,
      [raw.id, `Model city mismatch: ${normalizeWhitespace(normalized.city)}`],
    );
    return false;
  }

  const sourceUrl = normalizeUrl(normalized.event_url || raw.source_url);
  const result = await pool.query(
    `insert into "aiEvents_events"
      (raw_id, city_id, city_key, city, title, description, start_time, end_time, timezone, venue, address, online_url,
       organizer, speakers, tags, price, source_url, source_url_normalized, event_url, confidence_score,
       status, provider_model, normalized_payload)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'draft',$21,$22::jsonb)
     on conflict (source_url_normalized) do update set
       raw_id = excluded.raw_id,
       city_id = excluded.city_id,
       city_key = excluded.city_key,
       city = excluded.city,
       title = excluded.title,
       description = excluded.description,
       start_time = excluded.start_time,
       end_time = excluded.end_time,
       timezone = excluded.timezone,
       venue = excluded.venue,
       address = excluded.address,
       online_url = excluded.online_url,
       organizer = excluded.organizer,
       speakers = excluded.speakers,
       tags = excluded.tags,
       price = excluded.price,
       event_url = excluded.event_url,
       confidence_score = excluded.confidence_score,
       provider_model = excluded.provider_model,
       normalized_payload = excluded.normalized_payload,
       updated_at = now()
     returning id`,
    [
      raw.id,
      raw.city_id || null,
      raw.city_key || cityKey,
      eventCityFor(normalized),
      normalized.title,
      normalized.description || null,
      normalized.start_time || null,
      normalized.end_time || null,
      normalized.timezone || 'Asia/Shanghai',
      normalized.venue || null,
      normalized.address || null,
      normalized.online_url || null,
      normalized.organizer || null,
      Array.isArray(normalized.speakers) ? normalized.speakers : [],
      normalizeTags(normalized.tags),
      normalized.price || null,
      raw.source_url,
      normalizeUrl(raw.source_url),
      sourceUrl,
      normalizeConfidence(normalized.confidence_score),
      providerModel,
      JSON.stringify({ ...normalized, city: eventCityFor(normalized), city_key: raw.city_key || cityKey }),
    ],
  );
  await pool.query(`update "aiEvents_raw" set processing_status = 'processed', processing_error = null where id = $1`, [raw.id]);
  return Boolean(result.rows[0]?.id);
}

function isTransientModelError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return /\b429\b|rate limit|too many requests|timeout|temporar|saturated|overload|upstream load|try again later/.test(message);
}

function summarizeProviderError(message) {
  const text = String(message || '');
  const status = text.match(/Provider request failed\s+(\d+)/)?.[1] || '';
  const jsonText = text.match(/\{[\s\S]*\}$/)?.[0] || '';
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      return {
        status: status || null,
        code: parsed.error?.code || null,
        type: parsed.error?.type || null,
        message: String(parsed.error?.message || '').slice(0, 240) || text.slice(0, 240),
      };
    } catch {
      // Fall through to compact text below.
    }
  }
  return {
    status: status || null,
    code: null,
    type: null,
    message: text.slice(0, 240),
  };
}

async function processPendingRaw(pool, runId) {
  const { rows } = await pool.query(
    `select *
     from "aiEvents_raw"
     where crawl_run_id = $1
       and processing_status = 'pending'
     order by fetched_at asc`,
    [runId],
  );
  let normalizedCount = 0;
  let modelFailedCount = 0;
  let modelDeferredCount = 0;
  const modelErrors = [];
  for (const raw of rows) {
    try {
      const normalized = await normalizeWithProvider({
        city: cityDisplayName,
        city_key: cityKey,
        city_aliases: cityAliases,
        source_type: raw.source_type,
        source_url: raw.source_url,
        raw_title: raw.raw_title,
        raw_text: raw.raw_text,
        raw_payload: raw.raw_payload,
        source_scope: raw.raw_payload?.source_scope,
        relevance_level: raw.raw_payload?.relevance_level,
      });
      if (await upsertEvent(pool, raw, normalized)) normalizedCount += 1;
    } catch (error) {
      const message = error.message || String(error);
      modelErrors.push({
        raw_id: raw.id,
        source_url: raw.source_url,
        error: message.slice(0, 500),
        summary: summarizeProviderError(message),
      });
      if (isTransientModelError(error)) {
        modelDeferredCount = rows.length - normalizedCount - modelFailedCount;
        await pool.query(
          `update "aiEvents_raw" set processing_error = $2 where id = $1`,
          [raw.id, message],
        );
        break;
      }
      modelFailedCount += 1;
      await pool.query(
        `update "aiEvents_raw" set processing_status = 'failed', processing_error = $2 where id = $1`,
        [raw.id, message],
      );
    }
  }
  return { normalizedCount, modelFailedCount, modelDeferredCount, modelErrors };
}

await withDb(async pool => {
  await loadCity(pool);
  const runId = await insertRun(pool, cityId);
  let sourcesChecked = 0;
  let rawItemsFound = 0;
  const sourceFailures = [];
  try {
    const sources = await activeSourcesForCity(pool);
    for (const source of sources) {
      const sourceId = source.id;
      try {
        const adapter = createAdapter({
          ...source,
          city: cityDisplayName,
          city_key: cityKey,
          city_en: cityEn,
          organization_name: source.source_type,
        });
        const discoveredUrls = Array.from(new Set((await adapter.discoverUrls()).filter(Boolean)));
        const sourceCandidateLimit = candidateLimitForSource(source);
        let sourceCandidateCount = 0;
        const seenCandidateUrls = new Set();
        for (const discoveredUrl of discoveredUrls) {
          if (sourceCandidateCount >= sourceCandidateLimit) break;
          const detail = await adapter.fetchDetail(discoveredUrl);
          sourcesChecked += 1;
          const candidates = await candidatesForSource({ adapter, source, detail });
          if (candidates.length === 0) break;
          for (const candidate of candidates) {
            if (sourceCandidateCount >= sourceCandidateLimit) break;
            const candidateUrl = normalizeUrl(candidate.source_url || candidate.registration_url || '');
            if (candidateUrl && seenCandidateUrls.has(candidateUrl)) continue;
            if (candidateUrl) seenCandidateUrls.add(candidateUrl);
            const enriched = await enrichCandidate({ adapter, source, listDetail: detail, candidate });
            await upsertRaw(pool, {
              runId,
              sourceId,
              cityId,
              source,
              fetchedUrl: enriched.detail.url || discoveredUrl,
              detail: enriched.detail,
              candidate: enriched.candidate,
            });
            sourceCandidateCount += 1;
            rawItemsFound += 1;
          }
        }
        await pool.query(
          `update "aiEvents_sources"
           set last_success_at = now(), last_checked_at = now(), consecutive_failures = 0, updated_at = now()
           where id = $1`,
          [sourceId],
        );
      } catch (sourceError) {
        sourcesChecked += 1;
        const message = sourceError.message || String(sourceError);
        sourceFailures.push({ source_type: source.source_type, url: source.url, error: message });
        await pool.query(
          `update "aiEvents_sources"
           set last_checked_at = now(),
               consecutive_failures = consecutive_failures + 1,
               status = case when consecutive_failures + 1 >= 5 then 'needs_review' else status end,
               raw_config = jsonb_set(raw_config, '{last_error}', to_jsonb($2::text), true),
               updated_at = now()
           where id = $1`,
          [sourceId, message],
        );
      }
    }

    const normalization = rawOnly
      ? { normalizedCount: 0, modelFailedCount: 0, modelDeferredCount: 0, modelErrors: [] }
      : await processPendingRaw(pool, runId);
    await pool.query(
      `update "aiEvents_crawl_runs"
       set status = 'succeeded', finished_at = now(), sources_checked = $2,
           raw_items_found = $3, events_normalized = $4,
           raw_summary = raw_summary || $5::jsonb
       where id = $1`,
      [
        runId,
        sourcesChecked,
        rawItemsFound,
        normalization.normalizedCount,
        JSON.stringify({
          source_failures: sourceFailures,
          model_failed_count: normalization.modelFailedCount,
          model_deferred_count: normalization.modelDeferredCount,
          model_errors: normalization.modelErrors,
        }),
      ],
    );
    console.log(JSON.stringify({
      ok: true,
      run_id: runId,
      city: cityDisplayName,
      city_key: cityKey,
      raw_only: rawOnly,
      model_api_format: providerApiFormat,
      sources_checked: sourcesChecked,
      raw_items_found: rawItemsFound,
      events_normalized: normalization.normalizedCount,
      source_failures: sourceFailures.length,
      model_failed_count: normalization.modelFailedCount,
      model_deferred_count: normalization.modelDeferredCount,
      model_errors: normalization.modelErrors.length,
      model_error_summaries: normalization.modelErrors.map(error => error.summary).slice(0, 3),
      source_failure_summaries: sourceFailures.map(error => ({
        source_type: error.source_type,
        error: String(error.error || '').slice(0, 240),
      })).slice(0, 3),
    }, null, 2));
  } catch (error) {
    await pool.query(
      `update "aiEvents_crawl_runs"
       set status = 'failed', finished_at = now(), sources_checked = $2,
           raw_items_found = $3, error_message = $4
       where id = $1`,
      [runId, sourcesChecked, rawItemsFound, error.message || String(error)],
    );
    console.error(JSON.stringify({ ok: false, run_id: runId, city: cityDisplayName, city_key: cityKey, sources_checked: sourcesChecked, raw_items_found: rawItemsFound, error: error.message || String(error) }, null, 2));
    process.exitCode = 1;
  }
});
