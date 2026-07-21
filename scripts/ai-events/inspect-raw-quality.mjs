import { loadLocalEnv, withDb } from './lib/db.mjs';
import { normalizeWhitespace } from './lib/normalize.mjs';
import { classifyIgnorableRaw, compactRawQualityRow, rawCandidateDate } from './lib/raw-quality.mjs';

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
  const autoIgnorable = [];
  const oldPending = [];
  const oldMs = oldPendingDays * 24 * 60 * 60 * 1000;

  for (const row of rows) {
    const text = rowText(row);
    const title = normalizeWhitespace(row.raw_title);
    const date = rawCandidateDate(row);
    const ignorable = classifyIgnorableRaw(row, { today });
    if (ignorable.ignore) {
      autoIgnorable.push(compactRawQualityRow(row, ignorable.reason, ignorable.detected_date ? { detected_date: ignorable.detected_date } : {}));
    }
    if (date && date < today) {
      expired.push(compactRawQualityRow(row, 'explicit_date_before_today', { detected_date: date.toISOString().slice(0, 10) }));
    }
    if (!title) {
      missingTitle.push(compactRawQualityRow(row, 'missing_raw_title'));
    } else if (ignorable.reason === 'generic_or_navigation_title') {
      genericTitle.push(compactRawQualityRow(row, 'generic_or_navigation_title'));
    }
    if (!eventPattern.test(text)) {
      weakEvent.push(compactRawQualityRow(row, 'no_clear_event_keyword'));
    }
    if (!aiPattern.test(text)) {
      weakAi.push(compactRawQualityRow(row, 'no_clear_ai_keyword'));
    }
    const fetched = new Date(row.fetched_at).getTime();
    if (row.processing_status === 'pending' && Number.isFinite(fetched) && Date.now() - fetched > oldMs) {
      oldPending.push(compactRawQualityRow(row, `pending_older_than_${oldPendingDays}_days`));
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
      auto_ignorable: autoIgnorable.length,
      old_pending: oldPending.length,
    },
    auto_ignorable: autoIgnorable.slice(0, limit),
    expired: expired.slice(0, limit),
    missing_title: missingTitle.slice(0, limit),
    generic_title: genericTitle.slice(0, limit),
    weak_event: weakEvent.slice(0, limit),
    weak_ai: weakAi.slice(0, limit),
    old_pending: oldPending.slice(0, limit),
  }, null, 2));
});
