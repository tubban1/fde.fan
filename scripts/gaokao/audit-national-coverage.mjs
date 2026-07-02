import { loadLocalEnv } from './lib/env.mjs';
import { withDb } from './lib/db.mjs';

loadLocalEnv();

const provinces = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆'
];

function getArg(name, fallback = '') {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const year = Number(getArg('year', '2026'));
const historyYears = [year - 1, year - 2, year - 3];

await withDb(async pool => {
  const rows = [];
  for (const province of provinces) {
    const [
      sources,
      rules,
      plans,
      admissions,
      scoreRanks,
      subjectRules
    ] = await Promise.all([
      pool.query('select count(*)::int as count from gaokao_source_documents where province = $1', [province]),
      pool.query('select count(*)::int as count from gaokao_province_rules where province = $1 and year = $2', [province, year]),
      pool.query('select count(*)::int as count from gaokao_enrollment_plans where province = $1 and year = $2', [province, year]),
      pool.query(
        'select count(*)::int as count from gaokao_admission_records where province = $1 and year = any($2::int[]) and min_score is not null and min_rank is not null',
        [province, historyYears]
      ),
      pool.query('select count(*)::int as count from gaokao_score_rank_segments where province = $1 and year = $2', [province, year]),
      pool.query('select count(*)::int as count from gaokao_subject_requirement_rules where province = $1 and year = $2', [province, year])
    ]);

    const missing = [];
    if (!rules.rows[0].count) missing.push('规则');
    if (!plans.rows[0].count) missing.push('招生计划');
    if (!admissions.rows[0].count) missing.push('3年录取');
    if (!scoreRanks.rows[0].count) missing.push('一分一段');
    if (!subjectRules.rows[0].count) missing.push('选科要求');

    rows.push({
      province,
      sources: sources.rows[0].count,
      rules: rules.rows[0].count,
      plans: plans.rows[0].count,
      admissions: admissions.rows[0].count,
      scoreRanks: scoreRanks.rows[0].count,
      subjectRules: subjectRules.rows[0].count,
      status: missing.length ? `缺：${missing.join('、')}` : '完整'
    });
  }

  console.table(rows);
});
