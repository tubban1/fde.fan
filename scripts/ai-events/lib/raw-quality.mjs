import { normalizeWhitespace } from './normalize.mjs';

const genericTitlePattern = /^(报名中|立即报名|报名截止|更多活动|活动详情|活动推荐|沙龙|技术沙龙|线下沙龙|开发者社区技术沙龙|发现科技好活动|conferences|classes\s*&\s*workshops|\d+\.\s*workshops)$/i;
const staleDetailSourcePattern = /_detail$/i;

function dateFromExplicitText(text) {
  const normalized = normalizeWhitespace(text);
  const patterns = [
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/,
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/,
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const [, year, month, day] = match;
    const date = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

export function rawCandidateDate(row) {
  const candidate = row.raw_payload?.candidate || {};
  const values = [
    candidate.end_time,
    candidate.endTime,
    candidate.endDate,
    candidate.start_time,
    candidate.startTime,
    candidate.startDate,
    candidate.date,
  ];
  for (const value of values) {
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return dateFromExplicitText(`${row.raw_title || ''}\n${row.raw_text || ''}`);
}

export function classifyIgnorableRaw(row, options = {}) {
  const today = options.today || new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const title = normalizeWhitespace(row.raw_title);
  if (!title) {
    return { ignore: true, reason: 'missing_raw_title' };
  }
  if (genericTitlePattern.test(title)) {
    return { ignore: true, reason: 'generic_or_navigation_title' };
  }
  if (staleDetailSourcePattern.test(normalizeWhitespace(row.source_type))) {
    return { ignore: true, reason: 'stale_detail_source_type' };
  }
  const date = rawCandidateDate(row);
  if (date && date < today) {
    return {
      ignore: true,
      reason: 'explicit_date_before_today',
      detected_date: date.toISOString().slice(0, 10),
    };
  }
  return { ignore: false, reason: '' };
}

export function compactRawQualityRow(row, reason, extra = {}) {
  return {
    id: row.id,
    city_key: row.city_key,
    city: row.city,
    source_type: row.source_type,
    processing_status: row.processing_status,
    fetched_at: row.fetched_at,
    reason,
    title: normalizeWhitespace(row.raw_title).slice(0, 160),
    source_url: row.source_url,
    ...extra,
  };
}
