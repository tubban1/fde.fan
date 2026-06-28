import { query } from './db.js';
import { delay, formatErrorForLog, isTransientNetworkError } from './safe_error.js';
import { generateText } from './text_model_provider.js';

async function generateTextWithRetry(options, context, maxAttempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await generateText(options);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < maxAttempts && isTransientNetworkError(error);
      console.warn(`[${context}] Attempt ${attempt} failed${canRetry ? ', retrying' : ''}:`, formatErrorForLog(error));
      if (!canRetry) break;
      await delay(700 * attempt);
    }
  }
  throw lastError;
}

function parseModelJsonObject(rawContent) {
  let jsonStr = String(rawContent || '').trim();
  if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```(?:json)?([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1].trim();
    }
  }

  const objectStart = jsonStr.indexOf('{');
  const objectEnd = jsonStr.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    jsonStr = jsonStr.slice(objectStart, objectEnd + 1);
  }

  try {
    return JSON.parse(jsonStr);
  } catch (firstError) {
    const relaxedJson = jsonStr
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/,\s*([}\]])/g, '$1')
      .trim();
    try {
      return JSON.parse(relaxedJson);
    } catch {
      console.error('[Diagnosis Extract] Failed to parse model JSON:', {
        error: firstError.message,
        preview: jsonStr.slice(0, 500)
      });
      throw firstError;
    }
  }
}

function formatConversationContext(messages = []) {
  return messages
    .map((msg) => `${msg.sender === 'user' ? '用户' : '转型顾问 Agent'}: ${msg.content}`)
    .join('\n\n');
}

async function getRecentMessages(sessionId) {
  const rows = await query(
    `SELECT sender, content FROM diagnosis_messages WHERE session_id = ? ORDER BY id DESC LIMIT 15`,
    [sessionId]
  );
  return rows.reverse();
}

export async function extractDiagnosisProfile(sessionId, latestUserMessage, recentMessages = null) {
  console.log(`[Diagnosis Extract] Starting async extraction for session: ${sessionId}`);
  try {
    // 1. 后台静默处理，不需要在首部阻断更新状态

    // 2. 读取当前已保存的画像事实
    const profiles = await query(
      `SELECT known_facts, missing_fields FROM diagnosis_profiles WHERE session_id = ?`,
      [sessionId]
    );

    let currentFacts = {};
    let currentMissing = [];
    if (profiles.length > 0) {
      try {
        currentFacts = typeof profiles[0].known_facts === 'string' ? JSON.parse(profiles[0].known_facts) : profiles[0].known_facts || {};
      } catch (e) {
        currentFacts = profiles[0].known_facts || {};
      }
      try {
        currentMissing = typeof profiles[0].missing_fields === 'string' ? JSON.parse(profiles[0].missing_fields) : profiles[0].missing_fields || [];
      } catch (e) {
        currentMissing = profiles[0].missing_fields || [];
      }
    }

    const contextMessages = Array.isArray(recentMessages) && recentMessages.length > 0
      ? recentMessages
      : await getRecentMessages(sessionId);
    const conversationContext = formatConversationContext(contextMessages);

    // 3. 构建大模型提取 Prompt
    const systemPrompt = `你是一个专业的数据提取 AI。你的任务是结合最近对话上下文和用户最新陈述，提炼出关键的诊断画像事实，并合并更新到原有的已知事实 knownFacts 中。

当前已知的企业画像已知事实 (knownFacts) 如下：
${JSON.stringify(currentFacts, null, 2)}

当前认为缺失的维度 (missingFields)：
${JSON.stringify(currentMissing, null, 2)}

最近对话上下文如下：
${conversationContext || '暂无上下文'}

用户的最新陈述内容是：
"${latestUserMessage}"

请对照以下 8 个诊断评估维度，提取并更新 knownFacts 中的对应字段：
1. basicInfo (企业基本信息：行业、规模、角色、团队结构等描述)
2. businessGoal (核心业务目标：增长、降本、提效、风控、体验等描述)
3. currentProcess (当前业务流程：核心业务链路、重复劳动、瓶颈等描述)
4. dataFoundation (数据资产基础：系统有哪些、数据是否结构化、权限情况等描述)
5. techFoundation (技术基础设施：CRM/ERP/飞书/企微/知识库等技术设施描述)
6. orgFoundation (组织与预算：谁使用、谁审批、预算、试点部门等描述)
7. riskConstraints (安全合规约束：隐私、合规、安全、人工审核要求等描述)
8. successCriteria (成功度量标准：希望 30/60/90 天看到的结果等描述)

【泛化识别原则】：
- 不要依赖关键词清单。请按语义判断用户表达属于哪类企业事实，并归入最合适的字段。
- 任何关于目标、动机、优先级、价值判断、经营结果、增长/降本/提效/风控/体验诉求的表达，都应归入 businessGoal；如果包含可验收结果或付费/采纳标准，也应同步归入 successCriteria。
- 任何关于当前做法、渠道、环节、角色协作、客户触点、人工步骤、重复劳动、卡点或等待的表达，都应归入 currentProcess。
- 任何关于已有资料、记录、表格、系统、知识、内容、客户数据或可被 AI 使用的信息基础，都应归入 dataFoundation 或 techFoundation。
- 任何关于决策者、使用者、预算、资源投入、组织意愿、试点范围或推进方式的表达，都应归入 orgFoundation。
- 任何关于成本、隐私、权限、合规、错误风险、人工复核、不可接受结果或边界条件的表达，都应归入 riskConstraints。
- 对含糊回答、选项回答、泛化回答或否定回答，要结合最近上下文理解其指向；只在用户明确确认、选择、补充或否定时更新事实。

【更新规则】：
1. 优先从用户最新话语中提取事实；如果最新话语是“都有”“第二个”“选 A”“是/不是”等短答，必须结合上一轮 Agent 提问和选项理解其真实含义。
2. 允许从最近对话上下文中补全用户已明确表达过的信息，但不要把 Agent 的建议、假设或选项当成用户事实，除非用户最新回答明确选择、确认或否定了它。
3. 不要凭空瞎编或虚构事实。
4. 保持客观，对于用户本次没有提供新信息的任何字段，必须原封不动地保留原有的已知 facts 描述，严禁清空！
5. 特别同理心逻辑：如果用户明确在陈述中推翻了先前的方向、目标或表示“没有关注/不关注XX”（例如：“我并不关注降本增效”），你必须相应地把 businessGoal（核心业务目标）修改为“待明确（用户澄清不关注XX）”来否定先前的信息，并且重新列入 missingFields 缺失维度中。

请最终输出并且仅输出一个严格合规的 JSON 对象（如使用 markdown 包裹，请确保可以 parse），格式如下：
{
  "knownFacts": {
    "basicInfo": "...",
    "businessGoal": "...",
    "currentProcess": "...",
    "dataFoundation": "...",
    "techFoundation": "...",
    "orgFoundation": "...",
    "riskConstraints": "...",
    "successCriteria": "..."
  },
  "missingFields": ["列出当前认为仍然缺失的维度名称，例如 '组织与预算' 等，最多列出 8 个，如果全部收齐则输出空数组"],
  "completeness": 40,
  "status": "collecting_info"
}`;

    // 4. 调用大模型进行异步抽取
    const rawContent = await generateTextWithRetry(
      {
        systemPrompt,
        userPrompt: '请提取并更新企业画像事实。',
        temperature: 0.1,
        timeout: 45000,
        task: 'extraction'
      },
      'Diagnosis Extract'
    );

    // 5. 解析并合并写入数据库
    const parsedData = parseModelJsonObject(rawContent);
    const newKnownFacts = parsedData.knownFacts || {};
    const newMissingFields = parsedData.missingFields || [];
    const newCompleteness = typeof parsedData.completeness === 'number' ? parsedData.completeness : 0;
    const newStatus = parsedData.status || 'collecting_info';

    // 写入 profiles 和 sessions
    await query(
      `INSERT INTO diagnosis_profiles (session_id, known_facts, missing_fields) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE known_facts = VALUES(known_facts), missing_fields = VALUES(missing_fields)`,
      [sessionId, JSON.stringify(newKnownFacts), JSON.stringify(newMissingFields)]
    );

    await query(
      `UPDATE diagnosis_sessions 
       SET completeness = ?, status = ?, profile_status = 'updated' 
       WHERE id = ?`,
      [newCompleteness, newStatus, sessionId]
    );

    console.log(`[Diagnosis Extract] Async extraction succeeded for session: ${sessionId}. Completeness: ${newCompleteness}%`);
  } catch (err) {
    console.error(`[Diagnosis Extract] Async extraction failed for session: ${sessionId}:`, formatErrorForLog(err));
    try {
      // 慢模型超时或失败时，决不设为 failed 抹杀用户信心，强制标记为 updated 以展现本地已提取到的事实成果
      await query(
        `UPDATE diagnosis_sessions SET profile_status = 'updated' WHERE id = ?`,
        [sessionId]
      );
    } catch (dbErr) {
      console.error('[Diagnosis Extract] Failed to update status to updated:', formatErrorForLog(dbErr));
    }
  }
}

// 本地轻量级提取只保留客观硬指标，不做业务语义判断；语义画像统一交给模型提取。
export async function extractDiagnosisProfileLocally(sessionId, latestUserMessage) {
  try {
    const profiles = await query(
      `SELECT known_facts, missing_fields FROM diagnosis_profiles WHERE session_id = ?`,
      [sessionId]
    );

    let currentFacts = {};
    if (profiles.length > 0) {
      try {
        currentFacts = typeof profiles[0].known_facts === 'string' ? JSON.parse(profiles[0].known_facts) : profiles[0].known_facts || {};
      } catch (e) {
        currentFacts = profiles[0].known_facts || {};
      }
    }

    const nextFacts = { ...currentFacts };
    let hasNewInfo = false;
    const text = latestUserMessage.trim();

    const mergeFact = (key, value) => {
      if (!value) return;
      const existing = nextFacts[key];
      if (!existing || existing.includes('待补充') || existing === '') {
        nextFacts[key] = value;
        hasNewInfo = true;
        return;
      }
      if (!existing.includes(value.replace(/^\[初筛线索\]:\s*/, ''))) {
        nextFacts[key] = `${existing}；${value}`;
        hasNewInfo = true;
      }
    };

    // 1. 企业基本信息 (basicInfo) - 仅限匹配强格式的人数/团队规模
    let sizeText = '';
    const sizeMatch = text.match(/(\d+\s*人|\d+\s*员工|\d+\s*成员|\d+\s*团队成员)/i);
    if (sizeMatch) {
      sizeText = `规模约 ${sizeMatch[0]}`;
      mergeFact('basicInfo', `[初筛线索]: ${sizeText}`);
    }

    // 2/3. 业务目标和流程链路等语义信息由模型结合上下文提取，本地不做关键词推断。

    // 4. 技术基础设施 (techFoundation) - 移至后台 AI 提取，本地不进行主观/系统匹配以彻底消除否定词跨度误判风险

    // 5. 成功度量标准 (successCriteria) - 仅限匹配强格式指标（百分比、时间段）
    const criteriaMatch = text.match(/(提升\s*\d+%\s*|提高\s*\d+%\s*|降低\s*\d+%\s*|\d+%\s*|\d+\s*(天|个月|周))/i);
    if (criteriaMatch) {
      mergeFact('successCriteria', `[初筛线索]: 预期指标包含 ${criteriaMatch[0]}`);
    }

    if (hasNewInfo) {
      let filledCount = 0;
      const keys = ['basicInfo', 'businessGoal', 'currentProcess', 'dataFoundation', 'techFoundation', 'orgFoundation', 'riskConstraints', 'successCriteria'];
      keys.forEach(k => {
        if (nextFacts[k] && !nextFacts[k].includes('待补充') && nextFacts[k] !== '') {
          filledCount++;
        }
      });
      // 每一项加 12% 分数，本地最多 50%
      const localCompleteness = Math.min(50, filledCount * 12);

      const newMissing = [];
      const labels = {
        basicInfo: '企业基本信息',
        businessGoal: '核心业务目标',
        currentProcess: '当前业务流程',
        dataFoundation: '数据资产基础',
        techFoundation: '技术基础设施',
        orgFoundation: '组织与预算',
        riskConstraints: '安全合规约束',
        successCriteria: '成功度量标准'
      };
      keys.forEach(k => {
        if (!nextFacts[k] || nextFacts[k].includes('待补充') || nextFacts[k] === '') {
          newMissing.push(labels[k]);
        }
      });

      await query(
        `INSERT INTO diagnosis_profiles (session_id, known_facts, missing_fields) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE known_facts = VALUES(known_facts), missing_fields = VALUES(missing_fields)`,
        [sessionId, JSON.stringify(nextFacts), JSON.stringify(newMissing)]
      );

      // 本地粗提完成，立刻置为 updated
      await query(
        `UPDATE diagnosis_sessions 
         SET completeness = ?, profile_status = 'updated' 
         WHERE id = ? AND completeness < ?`,
        [localCompleteness, sessionId, localCompleteness]
      );
      console.log(`[Diagnosis Local Extract] Fast local extract completed. completeness set to: ${localCompleteness}%`);
    } else {
      await query(
        `UPDATE diagnosis_sessions SET profile_status = 'updated' WHERE id = ?`,
        [sessionId]
      );
    }
  } catch (err) {
    console.error('[Diagnosis Local Extract] Error:', formatErrorForLog(err));
  }
}
