import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadLocalEnv } from './lib/env.mjs';
import { upsertSource, withDb } from './lib/db.mjs';

loadLocalEnv();

function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ensp;/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&ldquo;|&#8220;/g, '“')
    .replace(/&rdquo;|&#8221;/g, '”')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function readSnippet(filePath, startNeedle, endNeedle = '', windowSize = 1400) {
  if (!fs.existsSync(filePath)) return '';
  const ext = filePath.split('.').pop()?.toLowerCase();
  let text = '';
  if (['doc', 'docx', 'rtf'].includes(ext || '')) {
    try {
      text = execFileSync('textutil', ['-convert', 'txt', '-stdout', filePath], {
        encoding: 'utf8',
        maxBuffer: 80 * 1024 * 1024
      });
    } catch {
      text = fs.readFileSync(filePath, 'utf8');
    }
  } else {
    text = htmlToText(fs.readFileSync(filePath, 'utf8'));
  }
  const start = text.indexOf(startNeedle);
  if (start < 0) return text.slice(0, windowSize);
  if (endNeedle) {
    const end = text.indexOf(endNeedle, start + startNeedle.length);
    if (end > start) return text.slice(start, end).trim();
  }
  return text.slice(Math.max(0, start - 150), start + windowSize).trim();
}

const records = [
  {
    province: '山东',
    year: 2026,
    batch: '普通类常规批',
    candidate_track: '综合改革',
    volunteer_mode: '专业（专业类）+学校平行志愿',
    volunteer_count: 96,
    majors_per_volunteer: 1,
    has_major_adjustment: false,
    sourcePath: 'data/gaokao/raw/山东/2026/shandong-2026-volunteer-faq.doc',
    sourceTitle: '山东省普通高校招生志愿填报百问百答（2026版）',
    publisher: '山东省教育招生考试院',
    batch_settings: {
      exam_mode: '3+3',
      batches: ['普通类提前批', '普通类常规批'],
      common_batch_rounds: 3,
      first_round: '普通类一段线上考生填报本科志愿',
      second_round: '普通类二段线上未被录取考生填报本、专科志愿',
      third_round: '普通类二段线上未被录取考生填报剩余本、专科志愿'
    },
    filing_rules: {
      unit: '1个“专业（专业类）+学校”为1个志愿',
      principle: '实行以“专业（专业类）+学校”为单位的平行志愿模式，按照分数优先、遵循志愿原则投档。',
      common_batch_count: '普通类常规批安排3次志愿填报，每次填报志愿数量不超过96个。',
      one_round: '每次平行志愿实行一轮投档，考生只有一次投档机会。'
    },
    withdrawal_rules: {
      has_withdrawal_risk: true,
      no_major_adjustment: true,
      reasons: ['体检不符合', '单科成绩不符合', '外语语种不符合', '外语口试不符合', '招生章程其他要求不符合'],
      note: '“专业（专业类）+学校”模式不存在专业服从调剂；被投档专业退档后，不再参与后面志愿投档。'
    },
    subject_rules: {
      must_meet_subject_requirement: true,
      note: '选考科目要求分为1科、2科、3科或不提科目要求；选择2科或3科的专业要求考生必须同时选考规定科目。'
    },
    special_type_rules: {
      included_in_96: ['高校专项计划', '地方专项计划', '文物全科人才', '高职院校专项计划', '公费专科医学生', '3+2对口贯通分段培养']
    }
  },
  {
    province: '江苏',
    year: 2026,
    batch: '本科批次',
    candidate_track: '物理/历史等科目类',
    volunteer_mode: '院校专业组平行志愿',
    volunteer_count: 40,
    majors_per_volunteer: 6,
    has_major_adjustment: true,
    sourcePath: 'data/gaokao/raw/unknown/2026/cc3c37e2348c1d9f.html',
    sourceTitle: '江苏：省教育考试院部署2026年高考志愿填报工作',
    publisher: '江苏招生考试',
    batch_settings: {
      batches: ['本科提前批次', '本科批次', '专科批次'],
      schedule: {
        first_stage: '6月28日至7月2日17:00：填报本科院校专业组志愿',
        second_stage: '7月27日至7月28日17:00：填报专科院校专业组志愿',
        supplemental: '8月8日9:00至15:00：专科补录志愿'
      }
    },
    filing_rules: {
      unit: '院校专业组',
      principle: '普通类各批次实行平行志愿；考生须在选择性考试科目符合院校专业组选考科目要求的前提下填报。',
      early_batch_count: 20,
      specialty_group_extra: '特殊类型志愿设置1个院校志愿，包括6个专业志愿和1个专业服从调剂志愿。'
    },
    withdrawal_rules: {
      has_withdrawal_risk: true,
      reasons: ['不符合选考科目要求', '不符合招生章程要求', '体检或单科等限制不符合']
    },
    subject_rules: {
      must_meet_subject_requirement: true,
      note: '院校专业组是志愿填报基本单位，须符合报考院校专业组选考科目要求。'
    }
  },
  {
    province: '广东',
    year: 2026,
    batch: '普通类本科批次',
    candidate_track: '物理/历史',
    volunteer_mode: '院校专业组志愿',
    volunteer_count: null,
    majors_per_volunteer: null,
    has_major_adjustment: true,
    sourcePath: 'data/gaokao/raw/广东/2026/51118747b911e461.html',
    sourceTitle: '广东省招生委员会办公室关于做好2026年普通高校招生志愿填报工作的通知',
    publisher: '广东省教育考试院',
    batch_settings: {
      batches: ['提前批次', '本科批次', '专科批次'],
      schedule: {
        first_period: '6月28日9:00—6月29日16:00：仅填报需政审、体检、面试的提前批本科相关院校专业组志愿和提前批专科定向培养军士院校专业组志愿',
        second_period: '6月29日19:00—7月4日16:00：除第一时段外的其他所有批次、科类院校专业组志愿'
      }
    },
    filing_rules: {
      unit: '院校专业组',
      principle: '按当年招生工作通知执行平行志愿、顺序志愿投档录取模式；投档录取以考生网上最终确认志愿为依据。',
      plan_reference: '考生可查询广东省2026年普通高考志愿填报辅助系统中的在粤招生计划、往年录取分数和投档最低排位。'
    },
    withdrawal_rules: {
      has_withdrawal_risk: true,
      reasons: ['身体条件不符合', '招生章程专业录取规则不符合', '专业特殊要求不符合'],
      note: '正文要求考生对照体检要求和高校招生章程，避免投档后被高校退档。'
    },
    subject_rules: {
      must_meet_subject_requirement: true,
      note: '普通高中应届考生计入高考总成绩的3门选择性考试科目对应合格性考试科目成绩均须合格，方可投档。'
    }
  },
  {
    province: '上海',
    year: 2026,
    batch: '本科阶段',
    candidate_track: '综合改革',
    volunteer_mode: '院校专业组志愿',
    volunteer_count: null,
    majors_per_volunteer: null,
    has_major_adjustment: null,
    sourcePath: 'data/gaokao/raw/上海/2026/90ac0ed2655b2ae8.html',
    sourceTitle: '上海市2026年普通高校招生本科阶段志愿填报特别提醒',
    publisher: '上海市教育考试院',
    batch_settings: {
      batches: ['综合评价批次', '零志愿批次', '提前批次', '艺体类甲批次', '地方农村专项计划批次', '特殊类型招生', '普通批次'],
      schedule: {
        undergraduate: '7月1日—7月2日，每天8:00—17:00：本科阶段志愿填报'
      }
    },
    filing_rules: {
      principle: '本科艺体类乙批次志愿填报在本科艺体类甲批次录取结束后进行；本科普通批次征求志愿填报在本科普通批次录取结束后进行。',
      plan_reference: '2026年上海市普通高等学校招生专业目录用于了解在沪招生院校、专业及招生计划。'
    },
    withdrawal_rules: {
      has_withdrawal_risk: true,
      reasons: ['不符合招生章程', '不符合专业目录或体检等限制']
    },
    subject_rules: {
      must_meet_subject_requirement: true,
      note: '按上海市普通高校招生专业目录和高校招生章程执行。'
    }
  },
  {
    province: '云南',
    year: 2026,
    batch: '普通类本科批',
    candidate_track: '物理/历史',
    volunteer_mode: '院校专业组平行志愿',
    volunteer_count: 40,
    majors_per_volunteer: 10,
    has_major_adjustment: true,
    sourcePath: 'data/gaokao/raw/unknown/2026/db4563850c046e2c.html',
    sourceTitle: '云南省2026年高考志愿填报百问百答',
    publisher: '云南省招生考试院',
    batch_settings: {
      exam_mode: '3+1+2',
      batches: ['普通类提前本科批', '普通类本科批', '普通类提前高职专科批', '普通类高职专科批']
    },
    filing_rules: {
      unit: '院校专业组',
      principle: '普通类本科批可填报40个院校专业组志愿；每个院校专业组设10个专业志愿和1个专业服从院校调剂标志。',
      extra_groups: '符合国家专项计划、地方专项计划、高校专项计划、少数民族预科班条件的考生可按规则增加相应院校专业组志愿。'
    },
    withdrawal_rules: {
      has_withdrawal_risk: true,
      reasons: ['不符合招生章程', '体检结论不符合', '专业要求不符合', '不服从调剂导致退档风险']
    },
    subject_rules: {
      must_meet_subject_requirement: true,
      note: '按院校专业组选科要求填报。'
    }
  },
  {
    province: '河北',
    year: 2026,
    batch: '普通类本科批',
    candidate_track: '物理/历史',
    volunteer_mode: '专业（类）+学校平行志愿',
    volunteer_count: 96,
    majors_per_volunteer: 1,
    has_major_adjustment: false,
    sourcePath: 'data/gaokao/raw/河北/2026/e15b41eb3af1d8de.html',
    sourceTitle: '2026年河北省普通高考志愿填报须知',
    publisher: '河北省教育考试院',
    batch_settings: {
      batches: ['本科提前批A段', '本科提前批B段', '本科提前批C段', '本科批', '专科提前批', '专科批'],
      schedule: {
        early_military: '6月26日10时至6月27日10时：本科提前批A段军队院校志愿、专科提前批定向培养军士院校志愿',
        undergraduate: '6月28日9时至7月2日17时：本科提前批（含A/B/C段，A段军队院校志愿除外）、本科批、对口本科批',
        vocational: '7月29日12时至8月1日17时：专科提前批（定向培养军士除外）、专科批、对口专科批',
        undergraduate_collection_1: '7月24日12时至7月26日17时：本科批第一次志愿征集',
        undergraduate_collection_2: '7月29日12时至8月1日17时：本科批第二次志愿征集'
      }
    },
    filing_rules: {
      unit: '1个“专业（类）+学校”为1个志愿',
      principle: '本科批实行以“专业（类）+学校”为单位的平行志愿模式，设1次集中填报志愿和2次征集志愿，每次最多可填报96个志愿。',
      early_batch_b: '本科提前批B段实行“专业（类）+学校”平行志愿，每次最多可填报96个志愿。'
    },
    withdrawal_rules: {
      has_withdrawal_risk: true,
      reasons: ['体检不符合', '语种不符合', '单科成绩不符合', '招生章程其他限制不符合'],
      note: '专业（类）+学校模式没有同一院校内专业调剂，但仍需核对专业限制。'
    },
    subject_rules: {
      must_meet_subject_requirement: true,
      note: '按专业（类）选科要求填报。'
    }
  },
  {
    province: '辽宁',
    year: 2026,
    batch: '普通类本科批',
    candidate_track: '物理/历史学科类',
    volunteer_mode: '专业+学校平行志愿',
    volunteer_count: 112,
    majors_per_volunteer: 1,
    has_major_adjustment: false,
    sourcePath: 'data/gaokao/raw/辽宁/2026/283f9d2bb2d82f44.htm',
    sourceTitle: '辽宁省2026年普通高校招生志愿填报及招生录取问答',
    publisher: '辽宁招生考试之窗',
    batch_settings: {
      batches: ['本科提前批', '本科批', '高职（专科）提前批', '高职（专科）批'],
      plan_publication: '招生计划在网报志愿系统和《辽宁招生考试》杂志公布；更正信息在网报系统“考生须知”和辽宁招生考试之窗公布。'
    },
    filing_rules: {
      unit: '1个“专业+学校”为1个志愿',
      principle: '专业平行志愿按照“分数优先、遵循志愿、一轮投档”原则投档。',
      undergraduate_count: '普通类本科批由“专业+学校”志愿组成，共112个志愿。'
    },
    withdrawal_rules: {
      has_withdrawal_risk: true,
      no_major_adjustment: true,
      reasons: ['身体条件不符合', '语种不符合', '单科成绩不符合', '招生章程其他限制不符合'],
      note: '“专业+学校”模式取消专业调剂，不存在因不服从专业调剂而退档，但不符合招生章程仍可能退档。'
    },
    subject_rules: {
      must_meet_subject_requirement: true,
      note: '普通类按历史学科类、物理学科类分别填报；考生须关注每个专业的选科要求。'
    }
  }
];

await withDb(async pool => {
  let count = 0;
  for (const record of records) {
    const sourceId = await upsertSource(pool, {
      source_type: 'official_policy',
      province: record.province,
      year: record.year,
      title: record.sourceTitle,
      publisher: record.publisher,
      parse_status: 'parsed',
      raw_data: {
        local_path: record.sourcePath,
        source_kind: 'public_rule_page'
      }
    });

    const rawSnippets = {
      local_path: record.sourcePath,
      rule: readSnippet(record.sourcePath, record.batch),
      timing: readSnippet(record.sourcePath, '填报时间') || readSnippet(record.sourcePath, '正式填报'),
      withdrawal: readSnippet(record.sourcePath, '退档') || readSnippet(record.sourcePath, '招生章程')
    };

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
        record.province,
        record.year,
        record.batch,
        record.candidate_track,
        record.volunteer_mode,
        record.volunteer_count,
        record.majors_per_volunteer,
        record.has_major_adjustment,
        JSON.stringify(record.batch_settings),
        JSON.stringify(record.filing_rules),
        JSON.stringify(record.withdrawal_rules),
        JSON.stringify(record.subject_rules),
        JSON.stringify(record.special_type_rules || {}),
        sourceId,
        JSON.stringify(rawSnippets)
      ]
    );
    count++;
  }

  console.log(`Upserted ${count} public province rule record(s).`);
});
