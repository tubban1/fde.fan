import { query } from '../../diagnosis/db.js';
import { extractStreamTextFromJson, streamText } from '../../diagnosis/text_model_provider.js';
import { initGaokaoTables } from '../gaokao_init.js';
import { extractAndSaveProfile, extractFactsLocally, loadProfile, saveProfile } from '../gaokao_profile.js';

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
    if (trimmed.startsWith('data:')) text = extractTextFromSseData(trimmed.slice(5));
    else if (trimmed.startsWith('{')) text = extractTextFromSseData(trimmed);
    if (!text) return;
    accumulated += text;
    if (!res.writableEnded) res.write(text);
  };
  for await (const chunk of modelStream) {
    pending += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || '';
    for (const line of lines) consumeLine(line);
  }
  if (pending.trim()) consumeLine(pending);
  return accumulated;
}

function formatConversation(messages = []) {
  return messages.map(msg => `${msg.sender === 'user' ? '考生/家长' : '高考志愿智能体'}: ${msg.content}`).join('\n\n');
}

function fallbackReply(missingFields) {
  if (missingFields.length) {
    return `我先记下了。现在还差：${missingFields.join('、')}。\n\n你可以继续直接补一句，例如“位次 18000，想去杭州南京，计算机优先，风险稳一点”。`;
  }
  return '核心信息已经够做第一版判断了。你可以点击“生成志愿建议”，我会先检查数据库里的当年招生计划和近年录取位次，再给出冲稳保建议；如果数据不足，我会明确告诉你缺什么。';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: '方法不允许' });
  const { sessionId, message, email, password } = req.body || {};
  if (!sessionId || !message?.trim()) return res.status(400).json({ error: '缺少会话 ID 或消息内容' });
  if (!email || !password) return res.status(401).json({ error: '请先登录' });

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive'
  });

  try {
    await initGaokaoTables();
    const users = await query(`SELECT email FROM user_credits WHERE email = ? AND password = ? LIMIT 1`, [email, password]);
    if (!users.length) {
      res.write('登录状态无效，请重新登录。');
      return res.end();
    }
    const sessions = await query(`SELECT id FROM gaokao_sessions WHERE id = ? AND email = ? AND COALESCE(is_hidden, FALSE) = FALSE`, [sessionId, email]);
    if (!sessions.length) {
      res.write('没有找到这个高考志愿会话，请刷新重试。');
      return res.end();
    }

    await query(`INSERT INTO gaokao_messages (session_id, sender, content) VALUES (?, ?, ?)`, [sessionId, 'user', message]);
    await query(`UPDATE gaokao_sessions SET profile_status = 'updating' WHERE id = ?`, [sessionId]);

    const historyRows = await query(`SELECT sender, content FROM gaokao_messages WHERE session_id = ? ORDER BY id DESC LIMIT 16`, [sessionId]);
    const historyMessages = historyRows.reverse();
    const { knownFacts } = await loadProfile(sessionId);
    const quickFacts = extractFactsLocally(message, knownFacts);
    const quickProfile = await saveProfile(sessionId, quickFacts);
    const extractionPromise = extractAndSaveProfile(sessionId, message, historyMessages).catch(error => {
      console.warn('[Gaokao extraction]', error?.message || error);
      return quickProfile;
    });

    const systemPrompt = `你是高考志愿填报智能体，面向中国高考考生和家长。你的职责是轻量访谈、结构化补齐画像、解释填报规则和风险。
原则：
1. 不要假装已有数据库中没有的数据。
2. 每轮最多问 1 个主问题，必要时给 2-4 个可选方向。
3. 强调位次、当年计划、近年专业录取位次、选科限制和省份规则。
4. 信息不全时先补关键字段；信息足够时提示可以生成志愿建议。
5. 直接输出中文，不要 JSON。`;

    const userPrompt = `
当前已整理画像：
${JSON.stringify(quickProfile.knownFacts, null, 2)}

缺失字段：
${JSON.stringify(quickProfile.missingFields, null, 2)}

最近对话：
${formatConversation(historyMessages)}

请回复用户。`;

    let accumulated = '';
    try {
      const modelStream = await streamText({ systemPrompt, userPrompt, temperature: 0.45, timeout: 70000 });
      accumulated = await pipeModelStreamToResponse(modelStream, res);
    } catch (error) {
      accumulated = fallbackReply(quickProfile.missingFields);
      res.write(accumulated);
    }

    await extractionPromise;
    if (accumulated.trim()) {
      await query(`INSERT INTO gaokao_messages (session_id, sender, content) VALUES (?, ?, ?)`, [sessionId, 'agent', accumulated]);
    }
    res.end();
  } catch (error) {
    console.error('[Gaokao chat]', error);
    if (!res.writableEnded) {
      res.write('这次回复遇到一点问题，但你刚才的信息我会尽量保留。请稍后再试。');
      res.end();
    }
  }
}
