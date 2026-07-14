import { query } from '../db.js';
import { initDiagnosisTables } from '../diagnosis_init.js';
import crypto from 'crypto';
import { authenticateUser } from '../../diagnosis-auth/authenticate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { email, password, goal } = req.body || {};

  if (!email || !password) {
    return res.status(401).json({ error: '请先登录后再开始诊断' });
  }

  try {
    await initDiagnosisTables();

    const auth = await authenticateUser(email, password);
    if (!auth.ok) {
      return res.status(401).json({ error: '登录状态无效，请重新登录' });
    }

    // 生成唯一 Session ID
    const sessionId = 'diag_' + crypto.randomBytes(16).toString('hex');

    // 预设缺失收集的字段
    const missingFields = [
      '企业背景 (行业、规模、客户类型、团队结构)',
      '目标结果 (增长、降本、提效、风控、体验)',
      '优先场景 (最想先解决的 AI/Agent 场景)',
      '流程痛点 (当前做法、卡点、重复劳动、影响)',
      '数据准备度 (表格、文档、客户记录、知识库、数据质量)',
      '系统对接条件 (CRM/ERP/飞书/企微/网站/API/权限)',
      '决策与资源 (拍板人、使用人、预算、试点范围、时间窗口)',
      '风险与验收 (隐私、合规、人工复核、成功指标)'
    ];

    // 1. 创建 Session
    await query(
      `INSERT INTO diagnosis_sessions (id, email, status, completeness) VALUES (?, ?, ?, ?)`,
      [sessionId, auth.email, 'collecting_info', 0]
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
