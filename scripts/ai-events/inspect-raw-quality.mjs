import { loadLocalEnv, withDb } from './lib/db.mjs';
import { normalizeWhitespace } from './lib/normalize.mjs';

loadLocalEnv();

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || fallback;
}

const status = arg('status', process.env.AI_EVENTS_RAW_INSPECT_STATUS || 'pending');
const limit = Number(arg('limit', process.env.AI_EVENTS_RAW_INSPECT_LIMIT || 50));
const oldPendingDays = Number(arg('old-days', process.env.AI_EVENTS_RAW_INSPECT_OLD_DAYS || 7));
const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

const eventPattern = /(活动|报名|峰会|沙龙|讲座|训练营|公开课|分享|共学|工作坊|大会|直播|meetup|hackathon|webinar|conference|workshop|summit|salon|event|training|bootcamp)/i;
const aiPattern = /(^|[^A-Za-z])(AI|AIGC|LLM|RAG|MLOps|AIoT|Agentic|Agent|Artificial Intelligence|Machine Learning|Deep Learning|Generative AI|Claude|Copilot|ChatGPT|OpenAI|Anthropic)([^A-Za-z]|$)|(人工智能|大模型|智能体|生成式|机器学习|深度学习|多模态|向量|AI\s*应用|AI\s*开发)/i;
const genericTitlePattern = /^(报名中|报名截止|更多活动|活动详情|活动推荐|沙龙|技术沙龙|线下沙龙|开发者社区技术沙龙|发现科技好活动|conferences|classes\s*&\s*workshops|\d+\.\s*workshops)$/i;

function compactRow(row, reason, extra = {}) {
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

function candidateDate(row) {
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

function rowText(row) {
  return normalizeWhitespace([
    row.raw_title,
    row.raw_text,
    row.raw_payload?.candidate?.description,
    row.raw_payload?.candidate?.organizer,
  ].filter(Boolean).join(' '));
}

await withDb(async pool => {
  const values = [];
  const filters = [];
  if (status !== 'all') {
    values.push(status);
    filters.push(`processing_status = $${values.length}`);
  }
  const whereSql = filters.length ? `where ${filters.join(' and ')}` : '';
  const { rows } = await pool.query(
    `select id, city_key, city, source_type, source_url, raw_title, raw_text, raw_payload,
            processing_status, processing_error, fetched_at
     from "aiEvents_raw"
     ${whereSql}
     order by fetched_at asc
     limit 2000`,
    values,
  );

  const expired = [];
  const missingTitle = [];
  const weakEvent = [];
  const weakAi = [];
  const genericTitle = [];
  const oldPending = [];
  const oldMs = oldPendingDays * 24 * 60 * 60 * 1000;

  for (const row of rows) {
    const text = rowText(row);
    const title = normalizeWhitespace(row.raw_title);
    const date = candidateDate(row);
    if (date && date < today) {
      expired.push(compactRow(row, 'explicit_date_before_today', { detected_date: date.toISOString().slice(0, 10) }));
    }
    if (!title) {
      missingTitle.push(compactRow(row, 'missing_raw_title'));
    } else if (genericTitlePattern.test(title)) {
      genericTitle.push(compactRow(row, 'generic_or_navigation_title'));
    }
    if (!eventPattern.test(text)) {
      weakEvent.push(compactRow(row, 'no_clear_event_keyword'));
    }
    if (!aiPattern.test(text)) {
      weakAi.push(compactRow(row, 'no_clear_ai_keyword'));
    }
    const fetched = new Date(row.fetched_at).getTime();
    if (row.processing_status === 'pending' && Number.isFinite(fetched) && Date.now() - fetched > oldMs) {
      oldPending.push(compactRow(row, `pending_older_than_${oldPendingDays}_days`));
    }
  }

  console.log(JSON.stringify({
    ok: true,
    read_only: true,
    inspected_status: status,
    inspected_rows: rows.length,
    today: today.toISOString().slice(0, 10),
    counts: {
      expired: expired.length,
      missing_title: missingTitle.length,
      generic_title: genericTitle.length,
      weak_event: weakEvent.length,
      weak_ai: weakAi.length,
      old_pending: oldPending.length,
    },
    expired: expired.slice(0, limit),
    missing_title: missingTitle.slice(0, limit),
    generic_title: genericTitle.slice(0, limit),
    weak_event: weakEvent.slice(0, limit),
    weak_ai: weakAi.slice(0, limit),
    old_pending: oldPending.slice(0, limit),
  }, null, 2));
});
