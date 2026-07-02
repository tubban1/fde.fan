import fs from 'node:fs';
import path from 'node:path';
import { loadLocalEnv } from './lib/env.mjs';
import { upsertSource, withDb } from './lib/db.mjs';

loadLocalEnv();

const YEAR = 2026;
const PROVINCE = '浙江';
const RAW_DIR = path.join('data', 'gaokao', 'raw', PROVINCE, String(YEAR));
const FAQ_PATH = path.join(RAW_DIR, '6747f2e29a1b7a58.html');
const NOTICE_PATH = path.join(RAW_DIR, '454c9dfe4b205564.html');

function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;|&#8220;/g, '“')
    .replace(/&rdquo;|&#8221;/g, '”')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return htmlToText(fs.readFileSync(filePath, 'utf8'));
}

function snippet(text, startNeedle, endNeedle = '', windowSize = 900) {
  const start = text.indexOf(startNeedle);
  if (start < 0) return '';
  if (endNeedle) {
    const end = text.indexOf(endNeedle, start + startNeedle.length);
    if (end > start) return text.slice(start, end).trim();
  }
  return text.slice(Math.max(0, start - 100), start + windowSize).trim();
}

async function findExistingSource(pool, localPath) {
  const result = await pool.query(
    `select id
       from gaokao_source_documents
      where province = $1
        and year = $2
        and (raw_data->>'local_path' = $3 or raw_data->>'path' = $3)
      order by fetched_at desc
      limit 1`,
    [PROVINCE, YEAR, localPath]
  );
  return result.rows[0]?.id || null;
}

async function getSourceId(pool) {
  const existing = await findExistingSource(pool, FAQ_PATH);
  if (existing) return existing;
  return upsertSource(pool, {
    source_type: 'official_policy',
    province: PROVINCE,
    year: YEAR,
    title: '浙江省2026年高考招生志愿填报百问百答',
    publisher: '浙江省教育考试院',
    parse_status: 'parsed',
    raw_data: {
      local_path: FAQ_PATH,
      companion_paths: [NOTICE_PATH].filter(filePath => fs.existsSync(filePath))
    }
  });
}

function buildRules(sourceId, faqText, noticeText) {
  const sourcePaths = [FAQ_PATH, NOTICE_PATH].filter(filePath => fs.existsSync(filePath));
  const commonSchedule = {
    first_round: '6月29日8:30—6月30日17:30：普通类提前录取院校志愿、普通类第一段平行志愿等填报',
    remaining_plan_release: '7月24日上午：公布普通类、艺术类、体育类剩余计划',
    second_round: '7月26日8:30—7月27日17:30：普通类第二段平行志愿等填报',
    collection_plan_release: '8月2日上午：公布普通类、艺术类、体育类征求计划',
    collection_round: '8月3日8:30—17:30：普通类、艺术类、体育类征求志愿填报'
  };

  const planSnippet = snippet(faqText, '各院校在浙江招生计划何时公布', '3．高校招生章程');
  const subjectSnippet = snippet(faqText, '17．高考招生志愿填报对选考科目有什么要求', '18．考生位次是什么');
  const parallelSnippet = snippet(faqText, '39 ． 普通类平行志愿怎样设置', '45． 一段线上的考生');
  const riskSnippet = snippet(faqText, '20．什么是专业平行志愿', '24 ． 什么是征求志愿');
  const earlySnippet = snippet(faqText, '32．普通类提前录取志愿怎样设置', '39 ． 普通类平行志愿怎样设置');
  const noticeSchedule = snippet(noticeText, '各类别、各段志愿填报时间如下', '四、志愿填报方法');

  return [
    {
      province: PROVINCE,
      year: YEAR,
      batch: '普通类平行录取',
      candidate_track: '综合改革',
      volunteer_mode: '专业平行志愿',
      volunteer_count: 80,
      majors_per_volunteer: 1,
      has_major_adjustment: false,
      batch_settings: {
        stages: ['第一段平行志愿', '第二段平行志愿', '征求志愿'],
        schedule: commonSchedule,
        plan_publication: '当年招生计划通过书面与网络公布；第二段、征求志愿的剩余计划仅通过浙江省教育考试院网站公布。',
        online_plan_query: '浙江省高校招生考试信息管理系统(2026年招生计划查询)要求考生登录查询。'
      },
      filing_rules: {
        filing_ratio: '1:1',
        unit: '1所高校的1个专业（类）为1个独立志愿单位',
        principle: '分数优先、遵循志愿；以考生符合志愿选考科目范围为前提，按高考总分和位次投档。',
        same_score_order: '高考总分相同时，依据位次、志愿顺序投档；全部相同者一并投档。',
        attempts_per_round: 1,
        no_retrieval_after_filed: true
      },
      withdrawal_rules: {
        has_withdrawal_risk: true,
        no_major_adjustment: true,
        reasons: ['体检不符合', '单科成绩不符合', '外语语种不符合', '英语口试不符合', '学考等级不符合', '综合素质评价不符合', '高校招生章程其他限制'],
        effect: '一旦被投档后退档，本轮其他专业平行志愿不能再投，只能参加剩余计划的下一轮志愿填报和投档。'
      },
      subject_rules: {
        must_meet_subject_requirement: true,
        note: '考生选考科目须符合拟报专业（类）的选考科目范围；提前录取专业调剂也须以符合专业选考科目要求为前提。'
      },
      special_type_rules: {
        compatible_special_types: ['高校专项计划', '地方专项计划', '高水平运动队', '艺术类', '体育类', '单独考试招生'],
        collection_volunteer: '视缺额计划情况组织征求志愿。'
      },
      source_id: sourceId,
      raw_data: {
        source_paths: sourcePaths,
        snippets: {
          plan: planSnippet,
          subject: subjectSnippet,
          parallel: parallelSnippet,
          withdrawal: riskSnippet,
          notice_schedule: noticeSchedule
        }
      }
    },
    {
      province: PROVINCE,
      year: YEAR,
      batch: '普通类提前录取',
      candidate_track: '综合改革',
      volunteer_mode: '传统志愿',
      volunteer_count: null,
      majors_per_volunteer: null,
      has_major_adjustment: true,
      batch_settings: {
        stages: ['提前第一段', '提前第二段'],
        schedule: {
          main_round: commonSchedule.first_round
        },
        includes: ['军队院校', '公安院校', '定向招生', '三位一体招生', '公费师范生', '定向培养军士', '飞行学员等经批准提前录取院校专业']
      },
      filing_rules: {
        principle: '传统志愿投档，志愿优先；提前录取一段投档录取完成后，再进行高校专项计划、高水平运动队、地方专项计划投档录取。',
        cultural_score_requirement: '提前录取院校（专业）可参考浙江普通类分段线，在第二段线上提出最低文化成绩要求。'
      },
      withdrawal_rules: {
        has_withdrawal_risk: true,
        reasons: ['体检不符合', '政审或面试不符合', '单科成绩不符合', '外语语种不符合', '专业调剂后不符合选考科目要求', '高校招生章程其他限制'],
        effect: '已被提前录取的考生不再参加后续志愿投档和录取；未录取不影响后续志愿投档和录取。'
      },
      subject_rules: {
        must_meet_subject_requirement: true,
        note: '提前录取院校进行专业调剂时，须以考生符合专业选考科目要求为前提。'
      },
      special_type_rules: {
        includes_special_admissions: true,
        note: '普通类提前录取与部分艺术类、体育类批次存在兼报限制，应按当年志愿通知执行。'
      },
      source_id: sourceId,
      raw_data: {
        source_paths: sourcePaths,
        snippets: {
          early: earlySnippet,
          notice_schedule: noticeSchedule
        }
      }
    }
  ];
}

await withDb(async pool => {
  const faqText = readText(FAQ_PATH);
  const noticeText = readText(NOTICE_PATH);

  if (!faqText) {
    throw new Error(`Missing required Zhejiang FAQ source: ${FAQ_PATH}`);
  }

  const sourceId = await getSourceId(pool);
  const rules = buildRules(sourceId, faqText, noticeText);

  for (const rule of rules) {
    await pool.query(
      `insert into gaokao_province_rules
        (province, year, batch, candidate_track, volunteer_mode, volunteer_count, majors_per_volunteer,
         has_major_adjustment, batch_settings, filing_rules, withdrawal_rules, subject_rules,
         special_type_rules, source_id, raw_data)
       values
        ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15::jsonb)
       on conflict (province, year, batch, candidate_track) do update
         set volunteer_mode = excluded.volunteer_mode,
             volunteer_count = excluded.volunteer_count,
             majors_per_volunteer = excluded.majors_per_volunteer,
             has_major_adjustment = excluded.has_major_adjustment,
             batch_settings = excluded.batch_settings,
             filing_rules = excluded.filing_rules,
             withdrawal_rules = excluded.withdrawal_rules,
             subject_rules = excluded.subject_rules,
             special_type_rules = excluded.special_type_rules,
             source_id = excluded.source_id,
             raw_data = excluded.raw_data,
             updated_at = now()`,
      [
        rule.province,
        rule.year,
        rule.batch,
        rule.candidate_track,
        rule.volunteer_mode,
        rule.volunteer_count,
        rule.majors_per_volunteer,
        rule.has_major_adjustment,
        JSON.stringify(rule.batch_settings),
        JSON.stringify(rule.filing_rules),
        JSON.stringify(rule.withdrawal_rules),
        JSON.stringify(rule.subject_rules),
        JSON.stringify(rule.special_type_rules),
        rule.source_id,
        JSON.stringify(rule.raw_data)
      ]
    );
  }

  console.log(`Upserted ${rules.length} Zhejiang ${YEAR} province rule record(s).`);
});
