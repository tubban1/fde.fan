import { query } from '../diagnosis/db.js';

async function countRows(sql, values = []) {
  try {
    const rows = await query(sql, values);
    return Number(rows?.[0]?.count || 0);
  } catch (error) {
    console.warn('[Gaokao coverage query skipped]', error?.message || error);
    return 0;
  }
}

export async function getGaokaoDataCoverage({ province, year }) {
  const targetYear = Number(year);
  const historyYears = [targetYear - 1, targetYear - 2, targetYear - 3].filter(Boolean);

  const [
    currentPlanCount,
    historicalAdmissionCount,
    institutionCount,
    majorCount,
    provinceRuleCount,
    sourceDocumentCount,
    scoreRankSegmentCount
  ] = await Promise.all([
    province && targetYear
      ? countRows(`select count(*)::int as count from gaokao_enrollment_plans where province = ? and year = ?`, [province, targetYear])
      : 0,
    province && historyYears.length
      ? countRows(
        `select count(*)::int as count from gaokao_admission_records where province = ? and year in (?, ?, ?)`,
        [province, historyYears[0] || 0, historyYears[1] || 0, historyYears[2] || 0]
      )
      : 0,
    countRows(`select count(*)::int as count from gaokao_institutions`),
    countRows(`select count(*)::int as count from gaokao_majors`),
    province && targetYear
      ? countRows(`select count(*)::int as count from gaokao_province_rules where province = ? and year = ?`, [province, targetYear])
      : 0,
    province
      ? countRows(`select count(*)::int as count from gaokao_source_documents where province = ? or province is null`, [province])
      : countRows(`select count(*)::int as count from gaokao_source_documents`),
    province && targetYear
      ? countRows(`select count(*)::int as count from gaokao_score_rank_segments where province = ? and year = ?`, [province, targetYear])
      : 0
  ]);

  const missing = [];
  if (!currentPlanCount) missing.push(`${province || '目标省份'} ${targetYear || '目标年份'} 当年招生计划`);
  if (!historicalAdmissionCount) missing.push(`${province || '目标省份'} ${historyYears.join('/')} 历年录取最低分与最低位次`);
  if (!provinceRuleCount) missing.push(`${province || '目标省份'} ${targetYear || '目标年份'} 志愿填报规则`);
  if (!institutionCount) missing.push('全国院校基础信息');
  if (!majorCount) missing.push('专业目录与专业标签');
  if (!scoreRankSegmentCount) missing.push(`${province || '目标省份'} ${targetYear || '目标年份'} 一分一段表`);

  return {
    province,
    year: targetYear || null,
    historyYears,
    counts: {
      currentPlanCount,
      historicalAdmissionCount,
      institutionCount,
      majorCount,
      provinceRuleCount,
      sourceDocumentCount,
      scoreRankSegmentCount
    },
    sufficientForProbability: currentPlanCount > 0 && historicalAdmissionCount > 0,
    missing
  };
}
