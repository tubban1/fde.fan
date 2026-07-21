const CITY_ALIASES = new Map([
  ['online', '线上'],
  ['virtual', '线上'],
  ['线上', '线上'],
]);

export function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizeTitle(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[【】「」『』《》()[\]{}.,，。:：;；!！?？|｜\-_/\\]+/g, ' ')
    .replace(/\b(ai|aigc|llm|ml)\b/g, match => match.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeOrganizationName(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

export function normalizeUrl(value, baseUrl) {
  const raw = normalizeWhitespace(value);
  if (!raw) return '';
  try {
    const url = new URL(raw, baseUrl || undefined);
    url.hash = '';
    const removable = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'spm',
      'from',
      'recId',
      'recSource',
      'searchId',
      'eventOrigin',
      'eventorigin',
      'aff',
      'qd',
    ];
    for (const key of removable) url.searchParams.delete(key);
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
      url.port = '';
    }
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return raw;
  }
}

export function normalizeCity(value, fallback = '') {
  const text = normalizeWhitespace(value || fallback);
  if (!text) return '';
  const lower = text.toLowerCase();
  for (const [key, city] of CITY_ALIASES.entries()) {
    if (lower.includes(key.toLowerCase())) return city;
  }
  return text;
}

export function inferOnlineUrl(candidate) {
  const url = normalizeUrl(candidate.online_url || candidate.onlineUrl || '');
  if (url) return url;
  const sourceUrl = normalizeUrl(candidate.source_url || candidate.sourceUrl || '');
  const venueText = `${candidate.venue || ''} ${candidate.city || ''}`.toLowerCase();
  if (venueText.includes('online') || venueText.includes('virtual') || venueText.includes('线上')) {
    return sourceUrl;
  }
  return '';
}

export function normalizeDateTime(value, timezone = 'Asia/Shanghai') {
  const raw = normalizeWhitespace(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  const cnMatch = raw.match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})日?\s*(\d{1,2})[:：](\d{2})?/);
  if (cnMatch) {
    const [, year, month, day, hour, minute = '00'] = cnMatch;
    const isoLocal = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
    if (timezone === 'Asia/Shanghai') {
      return new Date(`${isoLocal}+08:00`).toISOString();
    }
    return new Date(isoLocal).toISOString();
  }

  return null;
}

function datePartsFromIsoLike(value) {
  const match = normalizeWhitespace(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] || 0),
    minute: Number(match[5] || 0),
    second: Number(match[6] || 0),
  };
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function localDateToComparableMs(parts, timezone = 'Asia/Shanghai') {
  const isoLocal = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
  if (timezone === 'Asia/Shanghai') return new Date(`${isoLocal}+08:00`).getTime();
  return new Date(isoLocal).getTime();
}

function hasExplicitYearNearDate(text, month, day) {
  const escapedMonth = String(month);
  const escapedDay = String(day);
  const paddedMonth = pad2(month);
  const paddedDay = pad2(day);
  const patterns = [
    new RegExp(`20\\d{2}\\s*[年./-]\\s*0?${escapedMonth}\\s*(?:月|[./-])\\s*0?${escapedDay}`),
    new RegExp(`0?${escapedMonth}\\s*(?:月|[./-])\\s*0?${escapedDay}\\s*(?:日)?[^\\d]{0,8}20\\d{2}`),
    new RegExp(`20\\d{2}-${paddedMonth}-${paddedDay}`),
    new RegExp(`20\\d{2}/${paddedMonth}/${paddedDay}`),
  ];
  return patterns.some(pattern => pattern.test(text));
}

function hasYearlessMonthDay(text, month, day) {
  const normalized = normalizeWhitespace(text);
  if (!normalized || hasExplicitYearNearDate(normalized, month, day)) return false;
  const pattern = /(^|[^\d])(\d{1,2})\s*(?:月|[./-])\s*(\d{1,2})(?:\s*日)?/g;
  let match;
  while ((match = pattern.exec(normalized))) {
    const foundMonth = Number(match[2]);
    const foundDay = Number(match[3]);
    if (foundMonth === month && foundDay === day) return true;
  }
  return false;
}

export function rollYearlessPastDateForward(value, rawText, options = {}) {
  const parts = datePartsFromIsoLike(value);
  if (!parts) return value;
  const timezone = options.timezone || 'Asia/Shanghai';
  const now = options.now ? new Date(options.now).getTime() : Date.now();
  const originalMs = localDateToComparableMs(parts, timezone);
  if (!Number.isFinite(originalMs) || originalMs >= now) return value;
  if (!hasYearlessMonthDay(rawText, parts.month, parts.day)) return value;

  let nextYear = new Date(now).getUTCFullYear();
  let nextParts = { ...parts, year: nextYear };
  if (localDateToComparableMs(nextParts, timezone) < now) {
    nextYear += 1;
    nextParts = { ...parts, year: nextYear };
  }
  return `${nextParts.year}-${pad2(nextParts.month)}-${pad2(nextParts.day)}T${pad2(nextParts.hour)}:${pad2(nextParts.minute)}:${pad2(nextParts.second)}`;
}

export function normalizeEvent(raw, defaults = {}) {
  const title = normalizeWhitespace(raw.title || raw.name || defaults.title);
  const sourceUrl = normalizeUrl(raw.source_url || raw.sourceUrl || raw.url || defaults.source_url);
  const timezone = normalizeWhitespace(raw.timezone || defaults.timezone || 'Asia/Shanghai');
  const venue = normalizeWhitespace(raw.venue || raw.location?.name || raw.location?.address || '');
  const city = normalizeCity(raw.city || raw.location?.city || defaults.city, venue);
  const speakers = Array.isArray(raw.speakers)
    ? raw.speakers.map(normalizeWhitespace).filter(Boolean)
    : normalizeWhitespace(raw.speakers).split(/[,，、]/).map(normalizeWhitespace).filter(Boolean);

  return {
    title,
    canonical_title: title,
    normalized_title: normalizeTitle(title),
    description: normalizeWhitespace(raw.description || raw.summary || ''),
    start_time: normalizeDateTime(raw.start_time || raw.startTime || raw.startDate || raw.date, timezone),
    end_time: normalizeDateTime(raw.end_time || raw.endTime || raw.endDate, timezone),
    timezone,
    city,
    venue,
    online_url: inferOnlineUrl({ ...raw, city, venue, source_url: sourceUrl }),
    organizer: normalizeWhitespace(raw.organizer || raw.host || raw.publisher || defaults.organizer),
    speakers,
    price: normalizeWhitespace(raw.price || raw.offers?.price || ''),
    registration_deadline: normalizeDateTime(raw.registration_deadline || raw.registrationDeadline, timezone),
    registration_url: normalizeUrl(raw.registration_url || raw.registrationUrl || raw.tickets_url || sourceUrl),
    source_url: sourceUrl,
    external_event_id: normalizeWhitespace(raw.external_event_id || raw.id || raw.event_id || ''),
    confidence_score: Number(raw.confidence_score ?? raw.confidenceScore ?? 70),
    raw_data: raw,
  };
}

export function isLikelyEvent(candidate) {
  const title = normalizeWhitespace(candidate.title || candidate.name);
  if (!title) return false;
  if (candidate.start_time || candidate.startTime || candidate.startDate || candidate.date) return true;
  const text = `${title} ${candidate.description || ''}`;
  return /(活动|报名|峰会|沙龙|讲座|meetup|hackathon|webinar|conference|workshop|summit|calendar)/i.test(text);
}

export function isAiRelatedEvent(candidate) {
  const text = normalizeWhitespace([
    candidate.title,
    candidate.canonical_title,
    candidate.normalized_title,
    candidate.organizer,
    ...(Array.isArray(candidate.speakers) ? candidate.speakers : []),
  ].filter(Boolean).join(' '));
  const englishAi = /(^|[^A-Za-z])(AI|AIGC|LLM|RAG|MLOps|AIoT|Agentic|Agent|Artificial Intelligence|Machine Learning|Deep Learning|Generative AI|Claude|Copilot|ChatGPT|OpenAI|Anthropic)([^A-Za-z]|$)/i;
  const chineseAi = /(人工智能|大模型|智能体|生成式|机器学习|深度学习|向量|多模态|AI\s*编译|AI\s*应用|AI\s*开发|AI\s*创造)/i;
  return englishAi.test(text) || chineseAi.test(text);
}
