import { query } from '../../../lib/db';
import { extractDiagnosisProfile, extractDiagnosisProfileLocally } from '../../../lib/diagnosis_extract';
import { formatErrorForLog } from '../../../lib/safe_error';
import { ensureDiagnosisRuntimeSchema } from '../../../lib/diagnosis_schema';
import { extractStreamTextFromJson, streamText } from '../../../lib/text_model_provider';

function runAfterResponse(res, task) {
  res.on('finish', () => {
    task().catch((error) => {
      console.error('[Diagnosis Background Task Error]:', formatErrorForLog(error));
    });
  });
}

function handleStreamLine(line, res, replyRef) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.includes('[DONE]')) {
    return;
  }
  if (trimmed.startsWith('data:')) {
    try {
      const dataStr = trimmed.slice(5).trim();
      const json = JSON.parse(dataStr);
      const content = extractStreamTextFromJson(json);

      if (content) {
        replyRef.value += content;
        res.write(content);
      }
    } catch (e) {
      console.warn('[Chat Stream Parse Warning]:', formatErrorForLog(e));
    }
  }
}

function persistAgentMessage(sessionId, content, label) {
  query(
    `INSERT INTO diagnosis_messages (session_id, sender, content) VALUES (?, ?, ?)`,
    [sessionId, 'agent', content]
  ).catch(error => {
    console.error(`[${label}]`, formatErrorForLog(error));
  });
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

    // 3. 过滤纯提问、短语或闲聊，避免不必要的画像提取
    const shouldExtract = (text) => {
      if (!text) return false;
      const t = text.trim();
      if (t.length < 5) return false;
      if (/^(你好|您好|在吗|在么|谢谢|感谢|hello|hi|👋)$/i.test(t)) return false;
      if (
        t.includes('？') || 
        t.includes('?') || 
        /^(还需要|还要|需要哪些|哪些信息|是什么|怎么做|如何|为什么|啥|什么)/.test(t) ||
        /(什么信息|哪些信息|还要提供什么|还需要提供什么)/.test(t)
      ) return false;
      return true;
    };

    if (shouldExtract(message)) {
      // 同步发起本地快速粗提取，秒级回馈完整度跳变！
      await extractDiagnosisProfileLocally(sessionId, message);
      // 立刻触发后台异步慢提取任务，不等 AI 对话回复！
      runAfterResponse(res, () => extractDiagnosisProfile(sessionId, message));
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

    // 6. 读取最近的对话消息作为 AI 对话的上下文 (最多拉取 15 条)
    const historyMessages = await query(
      `SELECT sender, content FROM diagnosis_messages WHERE session_id = ? ORDER BY id ASC LIMIT 15`,
      [sessionId]
    );

    // 构造快速对话的 Prompt
    const conversationContext = historyMessages.map(msg => {
      return `${msg.sender === 'user' ? '用户' : '转型顾问 Agent'}: ${msg.content}`;
    }).join('\n\n');

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

    let stream;
    try {
      stream = await streamText({
        systemPrompt,
        userPrompt: promptUserContent,
        temperature: 0.6,
        timeout: 70000
      });
    } catch (apiErr) {
      console.error('[Chat API Request Error]:', formatErrorForLog(apiErr));
      await safeEndWithFallback('');
      return;
    }

    let hasReceivedData = false;
    let fullReply = '';
    const replyRef = { value: '' };

    // 首字等待提示：不结束请求，只告诉前端仍在等模型真实返回
    const timeoutTimer = setTimeout(() => {
      if (!hasReceivedData) {
        console.warn('[Chat Stream Waiting] No chunk received within 12s, still waiting for model response');
      }
    }, 12000);

    let buffer = '';
    let idleTimer = null;
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!res.writableEnded) {
          console.warn('[Chat Stream Idle Timeout] No chunk received after stream started, triggering fallback');
          if (stream) {
            stream.destroy(new Error('idle timeout'));
          }
        }
      }, 30000);
    };
    resetIdleTimer();

    stream.on('data', chunk => {
      hasReceivedData = true;
      clearTimeout(timeoutTimer);
      resetIdleTimer();

      buffer += chunk.toString();
      let boundary = buffer.lastIndexOf('\n');
      if (boundary === -1) {
        // 说明没有完整的换行符，全部属于阶段残余包，继续缓存
        return;
      }

      const completeData = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 1);

      const lines = completeData.split('\n');
      for (const line of lines) {
        handleStreamLine(line, res, replyRef);
      }
      fullReply = replyRef.value;
    });

    stream.on('end', async () => {
      clearTimeout(timeoutTimer);
      if (idleTimer) clearTimeout(idleTimer);
      if (hardTimeoutTimer) clearTimeout(hardTimeoutTimer);
      if (buffer.trim()) {
        handleStreamLine(buffer, res, replyRef);
        fullReply = replyRef.value;
        buffer = '';
      }
      res.end();
      if (fullReply.trim()) {
        persistAgentMessage(sessionId, fullReply, 'Chat Save Error');
      }
    });

    stream.on('error', async (err) => {
      clearTimeout(timeoutTimer);
      if (idleTimer) clearTimeout(idleTimer);
      console.error('[Chat Stream Event Error]:', formatErrorForLog(err));
      await safeEndWithFallback(fullReply);
    });

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
