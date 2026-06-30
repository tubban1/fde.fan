import { query } from '../diagnosis/db.js';
import { generateText } from '../diagnosis/text_model_provider.js';

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function safeQuery(sql, values = []) {
  try {
    return await query(sql, values);
  } catch (error) {
    console.warn('[Gaokao data query skipped]', error?.message || error);
    return [];
  }
}

function inferRiskBand(rankGap) {
  if (rankGap === null || rankGap === undefined) return 'unknown';
  if (rankGap < -3000) return 'rush';
  if (rankGap <= 5000) return 'stable';
  if (rankGap <= 20000) return 'safe';
  return 'fallback';
}

export async function buildStructuredRecommendationContext(knownFacts) {
  const province = knownFacts.province;
  const examYear = parseInt(knownFacts.examYear, 10);
  const rank = parseInt(knownFacts.provinceRank, 10);
  const targetYears = [examYear - 1, examYear - 2, examYear - 3].filter(Boolean);

  const plans = province && examYear ? await safeQuery(
    `SELECT p.*, i.name AS institution_name, i.province AS institution_province, i.city AS institution_city,
            i.is_985, i.is_211, i.is_double_first_class, i.is_public
       FROM gaokao_enrollment_plans p
       LEFT JOIN gaokao_institutions i ON i.id = p.institution_id
      WHERE p.province = ? AND p.year = ?
      ORDER BY p.planned_count DESC
      LIMIT 80`,
    [province, examYear]
  ) : [];

  const admissions = province && targetYears.length ? await safeQuery(
    `SELECT a.*, i.name AS institution_name, i.province AS institution_province, i.city AS institution_city,
            i.is_985, i.is_211, i.is_double_first_class, i.is_public
       FROM gaokao_admission_records a
       LEFT JOIN gaokao_institutions i ON i.id = a.institution_id
      WHERE a.province = ? AND a.year IN (?, ?, ?)
      ORDER BY a.year DESC, a.min_rank ASC
      LIMIT 240`,
    [province, targetYears[0] || 0, targetYears[1] || 0, targetYears[2] || 0]
  ) : [];

  const byKey = new Map();
  for (const item of admissions) {
    const key = `${item.institution_id || item.institution_code || item.institution_name}:${item.major_group_code || ''}:${item.major_code || item.major_name || ''}`;
    const existing = byKey.get(key) || [];
    existing.push(item);
    byKey.set(key, existing);
  }

  const candidates = [];
  for (const group of byKey.values()) {
    const ranks = group.map(item => Number(item.min_rank)).filter(Boolean);
    if (!ranks.length) continue;
    const avgMinRank = Math.round(ranks.reduce((sum, value) => sum + value, 0) / ranks.length);
    const latest = group.sort((a, b) => Number(b.year) - Number(a.year))[0];
    const rankGap = rank ? avgMinRank - rank : null;
    candidates.push({
      institutionName: latest.institution_name || latest.institution_code,
      city: latest.institution_city,
      majorGroupCode: latest.major_group_code,
      majorName: latest.major_name,
      years: group.map(item => ({ year: item.year, minScore: item.min_score, minRank: item.min_rank, plannedCount: item.planned_count })),
      avgMinRank,
      rankGap,
      riskBand: inferRiskBand(rankGap),
      tags: {
        is985: latest.is_985,
        is211: latest.is_211,
        isDoubleFirstClass: latest.is_double_first_class,
        isPublic: latest.is_public
      }
    });
  }

  candidates.sort((a, b) => {
    const order = { rush: 1, stable: 2, safe: 3, fallback: 4, unknown: 5 };
    return (order[a.riskBand] || 9) - (order[b.riskBand] || 9) || Math.abs(a.rankGap || 0) - Math.abs(b.rankGap || 0);
  });

  return {
    dataCoverage: {
      hasCurrentPlans: plans.length > 0,
      currentPlanCount: plans.length,
      historicalAdmissionCount: admissions.length,
      years: targetYears
    },
    plans: plans.slice(0, 30),
    candidates: candidates.slice(0, 60)
  };
}

export async function generateRecommendationReport(knownFacts) {
  const structured = await buildStructuredRecommendationContext(knownFacts);
  const hasEnoughData = structured.dataCoverage.hasCurrentPlans && structured.dataCoverage.historicalAdmissionCount > 0;

  const prompt = `
考生画像：
${JSON.stringify(knownFacts, null, 2)}

数据库检索到的结构化数据：
${JSON.stringify(structured, null, 2)}

请生成高考志愿智能体推荐报告。必须只输出合法 JSON，不要 markdown。不要编造数据库中没有的院校专业；如果数据不足，要明确提示缺哪些数据，并给出下一步采集清单。

JSON 格式：
{
  "summary": "总体判断",
  "dataQuality": {
    "level": "sufficient/partial/insufficient",
    "notes": []
  },
  "strategy": {
    "riskPreference": "aggressive/balanced/conservative",
    "rushStableSafeRatio": "例如 3:4:3",
    "mainTradeoff": "学校/专业/城市/就业之间的权衡"
  },
  "recommendations": [
    {
      "order": 1,
      "riskBand": "冲/稳/保/垫",
      "institution": "学校",
      "majorGroup": "专业组",
      "major": "专业",
      "probabilityRange": "50%-65%",
      "reason": "推荐理由",
      "risks": ["调剂风险", "退档风险"],
      "alternatives": []
    }
  ],
  "parentVersion": "给家长看的解释",
  "studentVersion": "给考生看的解释",
  "nextDataNeeded": []
}`;

  let report;
  try {
    const raw = await generateText({
      systemPrompt: '你是谨慎的高考志愿填报智能体。你必须基于结构化数据推理，不得编造录取概率和院校专业。',
      userPrompt: prompt,
      temperature: 0.2,
      timeout: 90000,
      task: 'report'
    });
    const jsonText = raw.match(/```json\s*([\s\S]*?)```/)?.[1] || raw.match(/```\s*([\s\S]*?)```/)?.[1] || raw;
    report = JSON.parse(jsonText.trim());
  } catch (error) {
    report = {
      summary: hasEnoughData
        ? '已根据当前画像和数据库记录生成候选范围，但模型报告格式化失败，建议重新生成一次。'
        : '当前已完成考生画像采集，但数据库中缺少该省份当年招生计划或近三年录取位次。为保障推荐精确度，系统已触发风控拦截。您可以通过运营控制台或前端上传该省一分一段表/投档线（支持PDF/Excel/CSV），系统将由 AI 结构化引擎自动解析落库并即刻激活志愿推荐功能。',
      dataQuality: {
        level: hasEnoughData ? 'partial' : 'insufficient',
        notes: [
          `当年招生计划记录：${structured.dataCoverage.currentPlanCount}`,
          `历史录取记录：${structured.dataCoverage.historicalAdmissionCount}`,
          `数据激活指引：请将该省投档线导出为 CSV/Excel，运行 import-csv.mjs 或上传至全国解析管道即可。`
        ]
      },
      strategy: {
        riskPreference: knownFacts.preferences?.riskPreference || 'balanced',
        rushStableSafeRatio: knownFacts.preferences?.riskPreference === 'aggressive' ? '4:4:2' : knownFacts.preferences?.riskPreference === 'conservative' ? '2:4:4' : '3:4:3',
        mainTradeoff: knownFacts.preferences?.priority || '待补充'
      },
      recommendations: structured.candidates.slice(0, 12).map((item, index) => ({
        order: index + 1,
        riskBand: { rush: '冲', stable: '稳', safe: '保', fallback: '垫' }[item.riskBand] || '待定',
        institution: item.institutionName,
        majorGroup: item.majorGroupCode || '',
        major: item.majorName || '',
        probabilityRange: item.riskBand === 'rush' ? '30%-50%' : item.riskBand === 'stable' ? '50%-75%' : item.riskBand === 'safe' ? '75%-90%' : '待评估',
        reason: `近年平均最低位次约 ${item.avgMinRank}，与考生位次差 ${item.rankGap}。`,
        risks: ['需核对当年招生计划、选科要求、体检/语种/单科限制。'],
        alternatives: []
      })),
      parentVersion: '家长您好，目前系统数据库中暂缺该省份的数据，为了孩子的志愿安全，我们没有生成盲目推荐。您可以将孩子学校发的报考指南 Excel/PDF 导入系统，系统会在 10 秒内自动解析出全套位次推荐表。',
      studentVersion: '同学你好，你的省排名已识别，但该省数据尚未激活。你可以通过上传你所在省份的一分一段表与高校投档线文件，让 AI 帮你做一键结构化转换，完成该省的数据共建！',
      nextDataNeeded: hasEnoughData ? [] : ['该省当年招生计划', '近 3 年专业录取最低位次/一分一段表', '省份志愿填报模式/选科限制规则']
    };
  }

  return { report, structured };
}

export function normalizeStoredReport(value) {
  return parseJson(value, null);
}
