import * as cheerio from 'cheerio';
import { isLikelyEvent, normalizeEvent, normalizeUrl, normalizeWhitespace } from '../lib/normalize.mjs';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function requestHeaders(url, source = {}) {
  const parsed = new URL(url);
  const referer = normalizeWhitespace(source.raw_config?.referer || source.referer || `${parsed.origin}/`);
  return {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,image/avif,image/webp,*/*;q=0.7',
    'accept-language': source.raw_config?.accept_language || 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=0, i',
    'referer': referer,
    'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126", "Not=A?Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': referer.startsWith(parsed.origin) ? 'same-origin' : 'cross-site',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': source.raw_config?.user_agent || process.env.AI_EVENTS_USER_AGENT || DEFAULT_USER_AGENT,
  };
}

function retryableStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export class EventSourceAdapter {
  constructor(source = {}) {
    this.source = source;
  }

  async discoverUrls() {
    return [this.source.url].filter(Boolean);
  }

  async fetchDetail(url) {
    const timeoutMs = Number(process.env.AI_EVENTS_FETCH_TIMEOUT_MS || 20000);
    const retryCount = Number(this.source.raw_config?.retry_count ?? process.env.AI_EVENTS_FETCH_RETRY_COUNT ?? 2);
    const retryDelayMs = Number(this.source.raw_config?.retry_delay_ms ?? process.env.AI_EVENTS_FETCH_RETRY_DELAY_MS ?? 1200);
    let lastError;
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        const response = await fetch(url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: requestHeaders(url, this.source),
        });
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        if (!response.ok) {
          const bodyHint = normalizeWhitespace(text).slice(0, 180);
          const error = new Error(`Fetch failed ${response.status} ${response.statusText} url=${url}${bodyHint ? ` body=${bodyHint}` : ''}`);
          error.status = response.status;
          if (retryableStatus(response.status) && attempt < retryCount) {
            lastError = error;
            await sleep(retryDelayMs * (attempt + 1));
            continue;
          }
          throw error;
        }
        return { url: response.url || url, contentType, text };
      } catch (error) {
        lastError = error;
        if (attempt >= retryCount) break;
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
    throw lastError;
  }

  normalize(raw) {
    return normalizeEvent(raw, {
      source_url: this.source.url,
      organizer: this.source.organization_name,
      city: this.source.city,
    });
  }
}

export function extractJsonLdEvents(html, sourceUrl) {
  const $ = cheerio.load(html);
  const events = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items.flatMap(entry => entry['@graph'] || entry)) {
        if (!item) continue;
        const type = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (!type.some(value => String(value).toLowerCase().includes('event'))) continue;
        events.push({
          title: item.name,
          description: item.description,
          start_time: item.startDate,
          end_time: item.endDate,
          timezone: item.eventSchedule?.scheduleTimezone,
          city: item.location?.address?.addressLocality,
          venue: item.location?.name,
          organizer: item.organizer?.name,
          speakers: (item.performer || item.speaker || []).map?.(speaker => speaker.name || speaker) || [],
          price: item.offers?.price,
          registration_url: item.offers?.url || item.url || sourceUrl,
          source_url: item.url || sourceUrl,
          raw_data: item,
        });
      }
    } catch {
      // Ignore invalid JSON-LD blocks; many sites embed partially escaped tracking data.
    }
  });
  return events;
}

export function extractNextDataEvents(html, sourceUrl) {
  const $ = cheerio.load(html);
  const node = $('#__NEXT_DATA__').text();
  if (!node) return [];
  try {
    const parsed = JSON.parse(node);
    const events = [];
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (isLikelyEvent(value)) events.push({ ...value, source_url: value.url || sourceUrl });
      for (const child of Object.values(value)) visit(child);
    };
    visit(parsed);
    return events;
  } catch {
    return [];
  }
}

export function extractAnchorCandidates(html, sourceUrl) {
  const $ = cheerio.load(html);
  const candidates = [];
  $('a[href]').each((_, element) => {
    const title = normalizeWhitespace($(element).text());
    const href = normalizeUrl($(element).attr('href'), sourceUrl);
    if (!title || !href) return;
    if (!/(活动|报名|峰会|沙龙|讲座|meetup|hackathon|webinar|conference|workshop|summit)/i.test(title)) return;
    candidates.push({
      title,
      source_url: href,
      registration_url: href,
      confidence_score: 45,
    });
  });
  return candidates;
}

export function uniqueCandidates(candidates) {
  const seen = new Set();
  const unique = [];
  for (const candidate of candidates) {
    const key = `${candidate.title || candidate.name}|${candidate.source_url || candidate.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }
  return unique;
}
