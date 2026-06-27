import { query } from '../db.js';
import { formatErrorForLog } from '../safe_error.js';
import { ensureDiagnosisRuntimeSchema } from '../diagnosis_schema.js';
import { generateText } from '../text_model_provider.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { sessionId, email, password, force } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({ error: '缺少会话 ID' });
  }
  if (!email || !password) {
    return res.status(401).json({ error: '请先登录后生成诊断报告' });
  }

  try {
    const users = await query(
      `SELECT email FROM user_credits WHERE email = ? AND password = ? LIMIT 1`,
      [email, password]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: '登录状态无效，请重新登录' });
    }

    await ensureDiagnosisRuntimeSchema();

    // 1. 获取当前会话状态，检查完整度是否达标
    const sessions = await query(
      `SELECT completeness, status FROM diagnosis_sessions WHERE id = ? AND email = ? AND COALESCE(is_hidden, FALSE) = FALSE`,
      [sessionId, email]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ error: '该会话不存在' });
    }

    const currentSession = sessions[0];
    if (currentSession.completeness < 50) {
      // 仅限非生产环境（NODE_ENV !== 'production'）下配合 force: true 参数用于开发调试
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const allowBypass = isDevelopment && force === true;
      if (!allowBypass) {
        return res.status(400).json({ 
          error: `当前信息完整度仅为 ${currentSession.completeness}%，不足 50%，请继续与 AI 顾问沟通以补充必要信息。` 
        });
      }
    }

    // 2. 获取当前画像已知事实
    const profiles = await query(`SELECT known_facts FROM diagnosis_profiles WHERE session_id = ?`, [sessionId]);
    if (profiles.length === 0) {
      return res.status(404).json({ error: '该会话没有找到对应的画像数据' });
    }

    let knownFacts = {};
    try {
      knownFacts = typeof profiles[0].known_facts === 'string' ? JSON.parse(profiles[0].known_facts) : profiles[0].known_facts || {};
    } catch (e) {
      knownFacts = profiles[0].known_facts || {};
    }

    // 搜索/工具调用预留层（当前为第一阶段 MVP，定义抽象接口占位）
    const researchIndustryCases = (industry, goal) => {
      console.log(`[Research Tool Placeholder] Researching cases for ${industry} aiming for ${goal}`);
      return `针对${industry}行业的AI最佳实践案例库`;
    };
    
    const compareTools = (useCase) => {
      console.log(`[Tool Compare Placeholder] Comparing tools for ${useCase}`);
      return `适合${useCase}的低代码/Agent平台比对数据`;
    };

    // 触发预留工具层记录日志
    researchIndustryCases(knownFacts.basicInfo || '未知行业', knownFacts.businessGoal || '未设定目标');

    const promptUserContent = `
以下是基于我们之前的访谈，整理出的企业画像事实数据：
${JSON.stringify(knownFacts, null, 2)}

请基于上述已确定的企业事实数据，进行深度诊断，输出一份专业的“企业 AI 增长转型诊断报告”。
你必须输出并且仅输出一个合法的 JSON 对象，不要包含其他解释性文字或 markdown 块。如果你使用了 \`\`\`json \`\`\` 包装，请确保它内容是合法的且可被解析的 JSON。

输出的 JSON 格式必须是：
{
  "summary": "针对该企业转型现状、瓶颈的全局评估和成熟度分析摘要（中文，150-200字）",
  "maturityScore": 55, // 0 到 100 的整数，表示 AI 转型成熟度评分。评分标准：10-30(起步期，信息化不足)，31-60(探索期，单点尝试)，61-80(应用期，流程融入)，81-100(智能期，全链路AI协同)。
  "painPoints": [
    "提炼出企业核心业务流程中的 2-3 个核心痛点描述"
  ],
  "opportunityMap": [
    {
      "title": "场景名称（例如：飞书工单智能分发系统）",
      "value": "价值评估（高/中/低）",
      "complexity": "落地复杂度（高/中/低）",
      "priority": "优先级（P0/P1/P2）"
    }
    // 给出 3 到 5 个最值得落地的 AI 应用场景
  ],
  "recommendedAgents": [
    {
      "name": "智能体/Agent名称",
      "description": "该智能体在工作流中扮演的角色、输入、处理逻辑与输出",
      "integration": "需要与现有系统（如 CRM、飞书、数据库等）如何集成对接"
    }
  ],
  "roadmap30_60_90": {
    "day30": "30天落地计划（聚焦小范围试点、数据整理与接口调试，提供具体可执行步骤）",
    "day60": "60天落地计划（聚焦核心 Agent 开发、流程对接与灰度运行）",
    "day90": "90天落地计划（全面上线、成效度量与全员推广）"
  },
  "risks": [
    "潜在的风险与合规约束描述（如数据安全、合规审查、员工抵触等）"
  ],
  "dataRequirements": [
    "要实现上述智能体，企业需要准备和整理哪些数据、开放什么系统 API（如 CRM 的 Webhook）"
  ],
  "nextActions": [
    "针对这套路线图，适合下一步与转型专家探讨的 2-3 个深入问题"
  ]
}
`;

    const systemPrompt = `你是一位资深的企业 AI 增长转型诊断专家、顶级 IT 咨询顾问和 AI 架构师。你需要根据用户提供的企业基本信息、当前流程痛点以及技术/数据底座，输出高水准、切实可行的企业 AI 增长转型诊断报告。请确保返回的内容详实、落地且格式为严格的 JSON。`;

    const rawContent = await generateText({
      systemPrompt,
      userPrompt: promptUserContent,
      temperature: 0.3,
      timeout: 90000
    });

    // 解析 JSON
    let reportObj = null;
    try {
      reportObj = JSON.parse(rawContent.trim());
    } catch (e) {
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) || rawContent.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          reportObj = JSON.parse(jsonMatch[1].trim());
        } catch (e2) {
          // 匹配失败
        }
      }
    }

    // fallback 策略
    if (!reportObj) {
      console.warn('Failed to parse AI report as JSON. Raw:', rawContent);
      reportObj = {
        summary: "根据您的访谈，我们为您梳理了诊断建议。因为格式化模块略有波动，这是 AI 生成的摘要：\n" + rawContent.substring(0, 300) + "...",
        maturityScore: 50,
        painPoints: ["流程流转效率有待优化"],
        opportunityMap: [{ title: "工作流自动化", value: "中", complexity: "中", priority: "P1" }],
        recommendedAgents: [{ name: "通用效率 Agent", description: "辅助进行流程整合", integration: "飞书集成" }],
        roadmap30_60_90: { day30: "梳理系统 API", day60: "灰度上线", day90: "全面推广" },
        risks: ["合规与数据安全"],
        dataRequirements: ["历史流程日志文档"],
        nextActions: ["具体系统的接口标准评估"]
      };
    }

    // 3. 将诊断报告保存进数据库
    await query(
      `INSERT INTO diagnosis_reports (
        session_id, summary, maturity_score, pain_points, opportunity_map,
        recommended_agents, roadmap_30_60_90, risks, data_requirements, next_actions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        summary = VALUES(summary),
        maturity_score = VALUES(maturity_score),
        pain_points = VALUES(pain_points),
        opportunity_map = VALUES(opportunity_map),
        recommended_agents = VALUES(recommended_agents),
        roadmap_30_60_90 = VALUES(roadmap_30_60_90),
        risks = VALUES(risks),
        data_requirements = VALUES(data_requirements),
        next_actions = VALUES(next_actions)`,
      [
        sessionId,
        reportObj.summary || '',
        parseInt(reportObj.maturityScore) || 0,
        JSON.stringify(reportObj.painPoints || []),
        JSON.stringify(reportObj.opportunityMap || []),
        JSON.stringify(reportObj.recommendedAgents || []),
        JSON.stringify(reportObj.roadmap30_60_90 || {}),
        JSON.stringify(reportObj.risks || []),
        JSON.stringify(reportObj.dataRequirements || []),
        JSON.stringify(reportObj.nextActions || [])
      ]
    );

    // 4. 更新 Session 状态为 'report_ready'
    await query(
      `UPDATE diagnosis_sessions SET status = 'report_ready' WHERE id = ?`,
      [sessionId]
    );

    // 5. 插入一条系统提示消息到消息表，通知用户报告已经出炉
    const reportNotifyText = `🎉 您的企业 AI 增长转型诊断报告已经生成完毕！您可以通过右侧的“诊断报告”面板查看多维度分析与 30/60/90 天落地路线图。如果后续还有任何补充信息，也欢迎继续发送，您可以随时重新生成最新的报告。`;
    await query(
      `INSERT INTO diagnosis_messages (session_id, sender, content) VALUES (?, ?, ?)`,
      [sessionId, 'agent', reportNotifyText]
    );

    return res.status(200).json({
      success: true,
      report: reportObj
    });
  } catch (error) {
    console.error('Generate diagnosis report API error:', formatErrorForLog(error));
    return res.status(500).json({ error: '生成报告失败，请稍后重试' });
  }
}
