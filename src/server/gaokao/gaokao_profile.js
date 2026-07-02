import { query } from '../diagnosis/db.js';
import { generateText } from '../diagnosis/text_model_provider.js';

export const REQUIRED_FIELDS = [
  '省份 / 高考所在地',
  '高考年份',
  '科类或选科组合',
  '总分',
  '全省位次',
  '目标偏好：城市、专业、学校优先级、风险偏好'
];

const FIELD_WEIGHTS = {
  province: 18,
  examYear: 12,
  subjectCombo: 16,
  totalScore: 12,
  provinceRank: 20,
  preferences: 22
};

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function normalizeFacts(facts = {}) {
  return {
    province: facts.province || '',
    examYear: facts.examYear || facts.year || '',
    candidateTrack: facts.candidateTrack || '',
    subjectCombo: facts.subjectCombo || '',
    totalScore: facts.totalScore || '',
    provinceRank: facts.provinceRank || '',
    subjectScores: facts.subjectScores || {},
    policyBonus: facts.policyBonus || 0,
    applicationType: facts.applicationType || '普通批',
    targetBatch: facts.targetBatch || '',
    preferences: {
      preferredCities: facts.preferences?.preferredCities || facts.preferredCities || [],
      preferredProvinces: facts.preferences?.preferredProvinces || facts.preferredProvinces || [],
      excludedRegions: facts.preferences?.excludedRegions || facts.excludedRegions || [],
      preferredMajors: facts.preferences?.preferredMajors || facts.preferredMajors || [],
      excludedMajors: facts.preferences?.excludedMajors || facts.excludedMajors || [],
      priority: facts.preferences?.priority || facts.priority || '',
      riskPreference: facts.preferences?.riskPreference || facts.riskPreference || '',
      acceptsSinoForeign: facts.preferences?.acceptsSinoForeign ?? facts.acceptsSinoForeign ?? null,
      acceptsPrivate: facts.preferences?.acceptsPrivate ?? facts.acceptsPrivate ?? null,
      acceptsAdjustment: facts.preferences?.acceptsAdjustment ?? facts.acceptsAdjustment ?? null,
      annualBudgetCny: facts.preferences?.annualBudgetCny || facts.annualBudgetCny || '',
      longTermGoals: facts.preferences?.longTermGoals || facts.longTermGoals || []
    }
  };
}

export function calculateMissingFields(facts) {
  const missing = [];
  if (!facts.province) missing.push('省份 / 高考所在地');
  if (!facts.examYear) missing.push('高考年份');
  if (!facts.subjectCombo && !facts.candidateTrack) missing.push('科类或选科组合');
  if (!facts.totalScore) missing.push('总分');
  if (!facts.provinceRank) missing.push('全省位次');
  const preferences = facts.preferences || {};
  if (
    !preferences.priority &&
    !preferences.riskPreference &&
    (preferences.preferredCities || []).length === 0 &&
    (preferences.preferredMajors || []).length === 0
  ) {
    missing.push('目标偏好：城市、专业、学校优先级、风险偏好');
  }
  return missing;
}

export function calculateCompleteness(facts) {
  let score = 0;
  if (facts.province) score += FIELD_WEIGHTS.province;
  if (facts.examYear) score += FIELD_WEIGHTS.examYear;
  if (facts.subjectCombo || facts.candidateTrack) score += FIELD_WEIGHTS.subjectCombo;
  if (facts.totalScore) score += FIELD_WEIGHTS.totalScore;
  if (facts.provinceRank) score += FIELD_WEIGHTS.provinceRank;
  const p = facts.preferences || {};
  if (p.priority || p.riskPreference || (p.preferredCities || []).length || (p.preferredMajors || []).length) {
    score += FIELD_WEIGHTS.preferences;
  }
  return Math.min(100, score);
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(item => String(item).trim()).filter(Boolean))];
}

export function extractFactsLocally(text, previousFacts = {}) {
  const facts = normalizeFacts(previousFacts);
  const content = String(text || '');

  const provinceMatch = content.match(/(北京|天津|上海|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾|内蒙古|广西|西藏|宁夏|新疆)/);
  if (provinceMatch) facts.province = provinceMatch[1];

  const yearMatch = content.match(/(20\d{2})\s*年?/);
  if (yearMatch) facts.examYear = parseInt(yearMatch[1], 10);

  const rankMatch = content.match(/(?:位次|排名|排位|全省)\D{0,8}(\d{2,7})/);
  if (rankMatch) facts.provinceRank = parseInt(rankMatch[1], 10);

  const scoreMatch = content.match(/(?:总分|考了|分数|高考)\D{0,8}(\d{3})\s*分?/);
  if (scoreMatch) facts.totalScore = parseInt(scoreMatch[1], 10);
  if (!facts.totalScore) {
    const standaloneScoreMatch = content.match(/(?:^|[，,。\s])(\d{3})\s*分/);
    if (standaloneScoreMatch) facts.totalScore = parseInt(standaloneScoreMatch[1], 10);
  }

  const subjectMatch = content.match(/(物化生|物化地|物化政|物生地|物生政|物地政|史政地|史政生|史化生|物理类|历史类|理科|文科|综合改革)/);
  if (subjectMatch) facts.subjectCombo = subjectMatch[1];

  if (/提前批/.test(content)) facts.applicationType = '提前批';
  if (/专项/.test(content)) facts.applicationType = '专项计划';
  if (/艺体|艺术|体育/.test(content)) facts.applicationType = '艺体类';
  if (/中外合作/.test(content)) facts.preferences.acceptsSinoForeign = !/不接受|不考虑|排斥/.test(content);
  if (/民办/.test(content)) facts.preferences.acceptsPrivate = !/不接受|不考虑|排斥/.test(content);
  if (/调剂/.test(content)) facts.preferences.acceptsAdjustment = !/不接受|不服从|排斥/.test(content);

  const budgetMatch = content.match(/(?:预算|学费|一年)\D{0,8}(\d{1,2})\s*万/);
  if (budgetMatch) facts.preferences.annualBudgetCny = parseInt(budgetMatch[1], 10) * 10000;

  const riskMatch = content.match(/(冲名校|激进|稳妥|保守|稳一点|不想滑档|可以冲|冲稳保)/);
  if (riskMatch) {
    const value = riskMatch[1];
    facts.preferences.riskPreference = /冲名校|激进|可以冲/.test(value) ? 'aggressive' : /保守|不想滑档|稳妥|稳一点/.test(value) ? 'conservative' : 'balanced';
  }

  const cityMatches = [...content.matchAll(/(北京|上海|广州|深圳|杭州|南京|苏州|成都|重庆|武汉|西安|天津|青岛|厦门|长沙|郑州|合肥|福州|济南|大连|宁波)/g)].map(match => match[1]);
  facts.preferences.preferredCities = unique([...(facts.preferences.preferredCities || []), ...cityMatches]);

  const majorMatches = [...content.matchAll(/(计算机|软件工程|人工智能|电子信息|自动化|电气|临床医学|口腔医学|金融|会计|法学|师范|汉语言|新闻|经济|数学|物理|化学|生物|机械|土木|建筑|护理|药学|数据科学)/g)].map(match => match[1]);
  facts.preferences.preferredMajors = unique([...(facts.preferences.preferredMajors || []), ...majorMatches]);

  if (/学校优先|名校优先|看重学校/.test(content)) facts.preferences.priority = 'school';
  if (/专业优先|看重专业/.test(content)) facts.preferences.priority = 'major';
  if (/城市优先|看重城市/.test(content)) facts.preferences.priority = 'city';
  if (/就业优先|好就业/.test(content)) facts.preferences.priority = 'employment';

  return facts;
}

export async function loadProfile(sessionId) {
  const rows = await query(`SELECT known_facts, missing_fields FROM gaokao_profiles WHERE session_id = ?`, [sessionId]);
  if (!rows.length) return { knownFacts: {}, missingFields: REQUIRED_FIELDS };
  const knownFacts = normalizeFacts(parseJson(rows[0].known_facts, {}));
  const missingFields = parseJson(rows[0].missing_fields, calculateMissingFields(knownFacts));
  return { knownFacts, missingFields };
}

export async function saveProfile(sessionId, facts) {
  const knownFacts = normalizeFacts(facts);
  const missingFields = calculateMissingFields(knownFacts);
  const completeness = calculateCompleteness(knownFacts);
  await query(
    `UPDATE gaokao_profiles SET known_facts = ?, missing_fields = ? WHERE session_id = ?`,
    [JSON.stringify(knownFacts), JSON.stringify(missingFields), sessionId]
  );
  await query(
    `UPDATE gaokao_sessions SET completeness = ?, profile_status = 'updated' WHERE id = ?`,
    [completeness, sessionId]
  );
  return { knownFacts, missingFields, completeness };
}

export async function extractAndSaveProfile(sessionId, latestMessage, historyMessages = []) {
  const { knownFacts } = await loadProfile(sessionId);
  let nextFacts = extractFactsLocally(latestMessage, knownFacts);

  try {
    const prompt = `
已有高考志愿画像：
${JSON.stringify(nextFacts, null, 2)}

最近对话：
${historyMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}

请从对话中抽取或修正高考志愿填报画像。只输出 JSON，不要 markdown。
字段结构：
{
  "province": "省份",
  "examYear": 2026,
  "candidateTrack": "物理类/历史类/理科/文科/综合改革",
  "subjectCombo": "物化生等",
  "totalScore": 650,
  "provinceRank": 12345,
  "subjectScores": {},
  "policyBonus": 0,
  "applicationType": "普通批/提前批/专项计划/艺体类/中外合作",
  "targetBatch": "本科普通批等",
  "preferences": {
    "preferredCities": [],
    "preferredProvinces": [],
    "excludedRegions": [],
    "preferredMajors": [],
    "excludedMajors": [],
    "priority": "school/major/city/employment",
    "riskPreference": "aggressive/balanced/conservative",
    "acceptsSinoForeign": null,
    "acceptsPrivate": null,
    "acceptsAdjustment": null,
    "annualBudgetCny": "",
    "longTermGoals": []
  }
}`;

    const raw = await generateText({
      systemPrompt: '你是高考志愿填报画像抽取器，只能输出合法 JSON。',
      userPrompt: prompt,
      temperature: 0.1,
      timeout: 45000,
      task: 'extraction'
    });
    const jsonText = raw.match(/```json\s*([\s\S]*?)```/)?.[1] || raw.match(/```\s*([\s\S]*?)```/)?.[1] || raw;
    const modelFacts = JSON.parse(jsonText.trim());
    nextFacts = normalizeFacts({ ...nextFacts, ...modelFacts, preferences: { ...nextFacts.preferences, ...(modelFacts.preferences || {}) } });
  } catch (error) {
    console.warn('[Gaokao profile extraction fallback]', error?.message || error);
  }

  return saveProfile(sessionId, nextFacts);
}
