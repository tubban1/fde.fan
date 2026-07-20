import { createAdapter } from './adapters/index.mjs';
import { loadLocalEnv, withDb } from './lib/db.mjs';
import { isLikelyEvent, normalizeUrl, normalizeWhitespace } from './lib/normalize.mjs';

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
     order by priority desc, source_type, url`,
    [cityKey],
  );
  return result.rows.map(row => ({
    id: row.id,
    source_type: row.source_type,
    fetch_method: row.fetch_method,
    url: row.url,
    priority: row.priority,
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
  if (!isLikelyEvent(candidate)) return false;
  const hasEventUrl = hasSourceSpecificEventUrl(source, candidate);
  if (sourceRequiresEventUrl(source)) return hasEventUrl;
  if (hasEventUrl) return true;
  const title = normalizeWhitespace(candidate.canonical_title || candidate.title || candidate.name);
  if (!title) return false;
  if (hasExplicitDate(candidate)) return true;
  if (title.length < 6) return false;
  return !/^(报名中|报名截止|更多活动|活动详情|活动推荐|沙龙|技术沙龙|线下沙龙|开发者社区技术沙龙|发现科技好活动|conferences|classes\s*&\s*workshops|\d+\.\s*workshops)$/i.test(title);
}

async function candidatesForSource({ adapter, source, detail }) {
  const parsedCandidates = (await adapter.parse(detail)).filter(candidate => isUsefulCrawlCandidate(candidate, source));
  if (source.fetch_method !== 'html_detail') {
    return parsedCandidates.slice(0, limitPerSource);
  }

  return [pageFallbackCandidate({ source, detail })];
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
      JSON.stringify({ candidate, source, city_key: cityKey, city_aliases: cityAliases, fetched_url: fetchedUrl }),
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

async function normalizeWithProvider(raw) {
  if (!providerApiKey || !providerApiBase || !providerModel) {
    throw new Error('Missing MODEL_API_KEY, MODEL_API_BASE, or MODEL_NAME.');
  }
  const prompt = `You normalize raw event crawl data for a Chinese AI events database.
Return ONLY compact JSON, no markdown. Schema:
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
  "price": string|null,
  "event_url": string|null,
  "confidence_score": number
}
Rules:
- Target city is ${cityDisplayName}; accepted aliases are ${cityAliases.join(', ')}. Use "线上" for clearly online events.
- Keep source/event URL if present.
- ISO 8601 timestamps are required when a time is known.
- If it is not a real event or not AI-related, set is_event/is_ai_related false.

Raw item:
${JSON.stringify(raw, null, 2).slice(0, 12000)}`;

  const response = await fetch(
    `${providerApiBase}/models/${encodeURIComponent(providerModel)}:generateContent?key=${encodeURIComponent(providerApiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(Number(process.env.MODEL_TIMEOUT_MS || 30000)),
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Provider request failed ${response.status}: ${body.slice(0, 500)}`);
  }
  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
  return extractJson(text);
}

async function upsertEvent(pool, raw, normalized) {
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

  const sourceUrl = normalizeUrl(normalized.event_url || raw.source_url);
  const result = await pool.query(
    `insert into "aiEvents_events"
      (raw_id, city_id, city_key, city, title, description, start_time, end_time, timezone, venue, address, online_url,
       organizer, speakers, price, source_url, source_url_normalized, event_url, confidence_score,
       status, provider_model, normalized_payload)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'draft',$20,$21::jsonb)
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
      normalized.city || raw.city || cityDisplayName,
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
      normalized.price || null,
      raw.source_url,
      normalizeUrl(raw.source_url),
      sourceUrl,
      Number(normalized.confidence_score || 0),
      providerModel,
      JSON.stringify({ ...normalized, city_key: raw.city_key || cityKey }),
    ],
  );
  await pool.query(`update "aiEvents_raw" set processing_status = 'processed', processing_error = null where id = $1`, [raw.id]);
  return Boolean(result.rows[0]?.id);
}

function isTransientModelError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return /\b429\b|rate limit|too many requests|timeout|temporar|saturated|overload|upstream load|try again later/.test(message);
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
      });
      if (await upsertEvent(pool, raw, normalized)) normalizedCount += 1;
    } catch (error) {
      const message = error.message || String(error);
      modelErrors.push({ raw_id: raw.id, source_url: raw.source_url, error: message.slice(0, 500) });
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
        const detail = await adapter.fetchDetail(source.url);
        sourcesChecked += 1;
        const candidates = await candidatesForSource({ adapter, source, detail });
        for (const candidate of candidates) {
          const enriched = await enrichCandidate({ adapter, source, listDetail: detail, candidate });
          await upsertRaw(pool, {
            runId,
            sourceId,
            cityId,
            source,
            fetchedUrl: enriched.detail.url || source.url,
            detail: enriched.detail,
            candidate: enriched.candidate,
          });
          rawItemsFound += 1;
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
      sources_checked: sourcesChecked,
      raw_items_found: rawItemsFound,
      events_normalized: normalization.normalizedCount,
      source_failures: sourceFailures.length,
      model_failed_count: normalization.modelFailedCount,
      model_deferred_count: normalization.modelDeferredCount,
      model_errors: normalization.modelErrors.length,
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
