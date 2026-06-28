import { query } from '../db.js';
import { extractDiagnosisProfile, extractDiagnosisProfileLocally } from '../diagnosis_extract.js';
import { formatErrorForLog } from '../safe_error.js';
import { ensureDiagnosisRuntimeSchema } from '../diagnosis_schema.js';
import { extractStreamTextFromJson, streamText } from '../text_model_provider.js';

function persistAgentMessage(sessionId, content, label) {
  query(
    `INSERT INTO diagnosis_messages (session_id, sender, content) VALUES (?, ?, ?)`,
    [sessionId, 'agent', content]
  ).catch(error => {
    console.error(`[${label}]`, formatErrorForLog(error));
  });
}

function formatConversationContext(messages = []) {
  return messages.map(msg => {
    return `${msg.sender === 'user' ? '用户' : '转型顾问 Agent'}: ${msg.content}`;
  }).join('\n\n');
}

function hasRecentAgentContext(messages = []) {
  const previousAgent = [...messages].reverse().find(msg => msg.sender === 'agent');
  return Boolean(previousAgent?.content?.trim());
}

function isContextualShortAnswer(text) {
  const t = text.trim();
  return /^(都有|都要|全部|全都|都可以|第?[一二三四五六七八九十\d]+个?|选?[A-Fa-f1-6]+|有|没有|是|不是|可以|不可以|对|不对|没错|暂时没有)$/i.test(t);
}

function extractTextFromSseData(data) {
  const payload = data.trim();
  if (!payload || payload === '[DONE]') return '';
  try {
    return extractStreamTextFromJson(JSON.parse(payload));
  } catch {
    return '';
  }
}

async function pipeModelStreamToResponse(modelStream, res) {
  let pending = '';
  let accumulated = '';

  const consumeLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let text = '';
    if (trimmed.startsWith('data:')) {
      text = extractTextFromSseData(trimmed.slice(5));
    } else if (trimmed.startsWith('{')) {
      text = extractTextFromSseData(trimmed);
    }

    if (!text) return;
    accumulated += text;
    if (!res.writableEnded) {
      res.write(text);
    }
  };

  for await (const chunk of modelStream) {
    pending += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) {
      consumeLine(line);
    }
  }

  if (pending.trim()) {
    consumeLine(pending);
  }

  return accumulated;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  const { sessionId, message, email, password } = req.body || {};

  if (!sessionId || !message || message.trim() === '') {
    return res.status(400).json({ error: '缺少会话 ID 或消息内容' });
  }
  if (!email || !password) {
    return res.status(401).json({ error: '请先登录后继续诊断' });
  }

  // 立即开始流式响应，保证毫秒级 TTFB 反馈
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  });

  let hardTimeoutTimer = null;
  const safeEndWithFallback = async (text) => {
    if (hardTimeoutTimer) clearTimeout(hardTimeoutTimer);
    if (!res.writableEnded) {
      handleFallback(res, sessionId, text || '');
    }
  };

  hardTimeoutTimer = setTimeout(() => {
    safeEndWithFallback('')
      .catch(error => console.error('[Chat Hard Timeout Fallback Error]:', formatErrorForLog(error)));
  }, 90000);

  try {
    // 1. 获取当前会话状态，判断是否存在
    const users = await query(
      `SELECT email FROM user_credits WHERE email = ? AND password = ? LIMIT 1`,
      [email, password]
    );
    if (users.length === 0) {
      res.write("登录状态无效，请重新登录。");
      return res.end();
    }

    await ensureDiagnosisRuntimeSchema();

    const sessions = await query(`SELECT * FROM diagnosis_sessions WHERE id = ? AND email = ? AND COALESCE(is_hidden, FALSE) = FALSE`, [sessionId, email]);
    if (sessions.length === 0) {
      res.write("抱歉，未能找到该诊断会话。请刷新重试。");
      return res.end();
    }

    // 2. 将用户消息写入消息表
    await query(
      `INSERT INTO diagnosis_messages (session_id, sender, content) VALUES (?, ?, ?)`,
      [sessionId, 'user', message]
    );

    // 3. 读取最近的对话消息，上下文同时供画像提取和 AI 对话使用
    const historyRows = await query(
      `SELECT sender, content FROM diagnosis_messages WHERE session_id = ? ORDER BY id DESC LIMIT 15`,
      [sessionId]
    );
    const historyMessages = historyRows.reverse();

    // 3. 过滤纯提问、短语或闲聊，避免不必要的画像提取
    const shouldExtract = (text, messages) => {
      if (!text) return false;
      const t = text.trim();
      if (/^(你好|您好|在吗|在么|谢谢|感谢|hello|hi|👋)$/i.test(t)) return false;
      if (t.length < 5) {
        return isContextualShortAnswer(t) && hasRecentAgentContext(messages);
      }
      if (
        t.includes('？') || 
        t.includes('?') || 
        /^(还需要|还要|需要哪些|哪些信息|是什么|怎么做|如何|为什么|啥|什么)/.test(t) ||
        /(什么信息|哪些信息|还要提供什么|还需要提供什么)/.test(t)
      ) return false;
      return true;
    };

    let extractionPromise = null;
    if (shouldExtract(message, historyMessages)) {
      // 同步发起本地快速粗提取，秒级回馈完整度跳变！
      await extractDiagnosisProfileLocally(sessionId, message);
      // 立刻触发模型提取，与聊天回复并行；响应结束前会等待它落库，避免 Serverless 截断后台任务。
      extractionPromise = extractDiagnosisProfile(sessionId, message, historyMessages)
        .catch((error) => {
          console.error('[Diagnosis Extraction Task Error]:', formatErrorForLog(error));
        });
    }

    // 5. 读取当前已保存的画像事实作为上下文
    const profiles = await query(`SELECT known_facts FROM diagnosis_profiles WHERE session_id = ?`, [sessionId]);
    let currentFacts = {};
    if (profiles.length > 0) {
      try {
        currentFacts = typeof profiles[0].known_facts === 'string' ? JSON.parse(profiles[0].known_facts) : profiles[0].known_facts || {};
      } catch (e) {
        currentFacts = profiles[0].known_facts || {};
      }
    }

    // 构造快速对话的 Prompt
    const conversationContext = formatConversationContext(historyMessages);

    const promptUserContent = `
当前已整理的企业画像事实 (knownFacts):
${JSON.stringify(currentFacts, null, 2)}

当前的对话历史记录:
${conversationContext}

请基于最新的对话历史，先给出一个简短商业判断，再提出一个低负担追问，帮助企业把模糊问题变成可落地的 AI 增长转型路径。
`;

    const systemPrompt = `你是一位面向企业老板和业务负责人的企业 AI 增长转型诊断顾问。你的目标不是让用户填问卷，而是用多轮轻量对话，帮企业找出最值得先做的增长、降本、提效或避坑路径，并最终沉淀为 30/60/90 天企业 AI 增长转型诊断报告。

【回复原则】：
1. 每次回复先给一个明确判断，例如“这更像报价效率问题”“这里可能有客户转化机会”“这个不适合先做 AI，先补数据更划算”。
2. 不要连续抛出一串问题。每轮最多问 1 个主问题，必要时给 2~4 个选项让用户容易回答。
3. 多使用老板能理解的收益语言：少花多少人力、少等多久、少漏多少客户、先试哪个小切口。
4. 不要假装已经知道用户没有提供的信息。可以提出假设，但要明确说“我先假设一下”，并邀请用户纠正。
5. 如果用户否认先前方向或表示困惑，先承认理解偏差，再重新定位真正目标。
6. 请直接输出中文对话文本，严禁返回 JSON，也不要用 markdown 代码块。`;

    let accumulatedReply = '';
    try {
      const modelStream = await streamText({
        systemPrompt,
        userPrompt: promptUserContent,
        temperature: 0.6,
        timeout: 70000
      });

      accumulatedReply = await pipeModelStreamToResponse(modelStream, res);
      if (extractionPromise) {
        await extractionPromise;
      }
      if (hardTimeoutTimer) clearTimeout(hardTimeoutTimer);
      if (accumulatedReply?.trim()) {
        res.end();
        persistAgentMessage(sessionId, accumulatedReply, 'Chat Save Error');
        return;
      }
      await safeEndWithFallback('');
      return;
    } catch (apiErr) {
      console.error('[Chat Stream API Error]:', formatErrorForLog(apiErr));
      if (extractionPromise) {
        await extractionPromise;
      }
      await safeEndWithFallback(accumulatedReply);
      return;
    }

  } catch (error) {
    console.error('Diagnosis chat API error:', formatErrorForLog(error));
    try {
      await safeEndWithFallback('');
    } catch (fallbackErr) {
      console.error('Failed to execute fallback:', formatErrorForLog(fallbackErr));
      if (!res.writableEnded) {
        res.end();
      }
    }
  }
}

// 统一超时与异常兜底回复函数
async function handleFallback(res, sessionId, currentAccumulated) {
  const fallbackReply = "模型这次没有在可接受时间内完成返回。已记录当前场景，后台画像会继续整理；您可以稍后重试，或继续补充更多业务细节。";
  
  const responseText = currentAccumulated.includes(fallbackReply)
    ? currentAccumulated
    : `${currentAccumulated}\n\n[提示] ${fallbackReply}`;

  const remaining = responseText.slice(currentAccumulated.length);
  if (remaining) {
    res.write(remaining);
  }

  res.end();
  persistAgentMessage(sessionId, responseText, 'Chat Persist Fallback Error');
}
