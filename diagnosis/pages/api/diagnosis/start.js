import { query } from '../../../lib/db';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { email, password, goal } = req.body || {};

  if (!email || !password) {
    return res.status(401).json({ error: '请先登录后再开始诊断' });
  }

  try {
    const users = await query(
      `SELECT email FROM user_credits WHERE email = ? AND password = ? LIMIT 1`,
      [email, password]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: '登录状态无效，请重新登录' });
    }

    // 生成唯一 Session ID
    const sessionId = 'diag_' + crypto.randomBytes(16).toString('hex');

    // 预设缺失收集的字段
    const missingFields = [
      '企业基本信息 (行业、规模、角色、团队结构)',
      '业务目标 (增长、降本、提效、风控、体验)',
      '当前流程 (核心业务链路、重复劳动、瓶颈)',
      '数据基础 (有哪些系统、是否结构化、权限情况)',
      '技术基础 (CRM/ERP/飞书/企微/知识库/工单系统等)',
      '组织基础 (谁使用、谁审批、预算、试点部门)',
      '风险约束 (隐私、合规、安全、人工审核要求)',
      '成功标准 (希望 30/60/90 天看到什么结果)'
    ];

    // 1. 创建 Session
    await query(
      `INSERT INTO diagnosis_sessions (id, email, status, completeness) VALUES (?, ?, ?, ?)`,
      [sessionId, email, 'collecting_info', 0]
    );

    // 2. 初始化 Profile
    await query(
      `INSERT INTO diagnosis_profiles (session_id, known_facts, missing_fields) VALUES (?, ?, ?)`,
      [sessionId, JSON.stringify({}), JSON.stringify(missingFields)]
    );

    let welcomeText = `您好，我先不让您填长表。我们先找一件最划算的事：哪里能少花人力、少丢客户，或者用一个小 AI 试点先看到效果。`;
    if (!goal || goal.includes('不确定') || goal.includes('引导')) {
      welcomeText += `
      
我会像顾问一样先听一个现象，再帮您判断它背后是增长机会、降本空间，还是管理提效路径。

先从最容易说的开始：最近团队每天最耗人、最慢、最容易出错或最影响成交的一件事是什么？`;
    } else {
      welcomeText += ` 您选的是【${goal}】。
      
我会先帮您找这个方向里最容易落地、最容易让老板觉得“这钱花得值”的小切口。

不用先讲完整背景，先说一个具体场景就行：这件事现在卡在哪里？是人手反复做、客户等太久、数据到处散，还是转化/回款被拖慢？`;
    }

    // 4. 保存问候语到消息表
    await query(
      `INSERT INTO diagnosis_messages (session_id, sender, content) VALUES (?, ?, ?)`,
      [sessionId, 'agent', welcomeText]
    );

    return res.status(200).json({
      success: true,
      sessionId,
      welcomeText,
      completeness: 0,
      knownFacts: {},
      missingFields,
      status: 'collecting_info'
    });
  } catch (error) {
    console.error('Start diagnosis session error:', error);
    return res.status(500).json({ error: '服务器内部错误，无法启动诊断' });
  }
}
