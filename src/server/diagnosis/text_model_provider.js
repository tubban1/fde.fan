import axios from 'axios';
import https from 'https';

function getEnvValue(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return '';
}

function normalizeTask(task) {
  return String(task || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function isPromptModelTask(taskKey) {
  return taskKey === 'EXTRACTION' || taskKey === 'REPORT' || taskKey === 'AGENT_DEMO';
}

function isOpenAiCompatible(provider) {
  const p = String(provider || '').toLowerCase();
  return p === 'vectorengine' || p === 'openai' || p === 'custom' || p === 'tourmaster';
}

function getTextProvider(task) {
  const taskKey = normalizeTask(task);
  const taskProvider = getEnvValue(taskKey ? `${taskKey}_MODEL_PROVIDER` : '');
  if (taskProvider) return taskProvider.toLowerCase();

  const explicitProvider = process.env.TEXT_MODEL_PROVIDER;
  if (explicitProvider) return explicitProvider.toLowerCase();

  // 如果配置了 OpenAI 或第三方 Base URL / Key，自动优先走 OpenAI 兼容协议
  if (
    process.env.OPENAI_API_BASE ||
    process.env.OPENAI_API_KEY ||
    (process.env.VECTORENGINE_API_BASE && !process.env.VECTORENGINE_API_BASE.includes('api.vectorengine.cn'))
  ) {
    return 'openai';
  }

  if (isPromptModelTask(taskKey)) return 'vectorengine';
  return (process.env.TEXT_MODEL_PROVIDER || (process.env.TOKENROUTER_API_KEY ? 'tokenrouter' : 'openai')).toLowerCase();
}

function getTextModel(task, provider) {
  const taskKey = normalizeTask(task);
  const taskModel = getEnvValue(taskKey ? `${taskKey}_MODEL` : '');
  if (taskModel) return taskModel;

  if (isOpenAiCompatible(provider)) {
    return (
      process.env.OPENAI_MODEL ||
      process.env.TEXT_MODEL ||
      process.env.PROMPT_MODEL ||
      process.env.VECTORENGINE_TEXT_MODEL ||
      'gpt-4o-mini'
    );
  }

  if (isPromptModelTask(taskKey)) {
    return process.env.PROMPT_MODEL || 'gemini-3.1-flash-lite';
  }
  return process.env.TEXT_MODEL || process.env.PROMPT_MODEL || 'google/gemini-3.5-flash';
}

function logModelSelection(task, provider, model, url = '') {
  const taskLabel = task || 'chat';
  const urlPart = url ? ` url=${url}` : '';
  console.log(`[Diagnosis Model] task=${taskLabel} provider=${provider}${urlPart} model=${model}`);
}

function getTokenRouterConfig(task) {
  const apiKey = process.env.TOKENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('TOKENROUTER_API_KEY is not configured');
  }

  const provider = 'tokenrouter';
  return {
    apiKey,
    baseUrl: (process.env.TOKENROUTER_API_BASE || 'https://api.tokenrouter.com/v1beta/models').replace(/\/$/, ''),
    model: getTextModel(task, provider)
  };
}

function getVectorEngineConfig(task, explicitProvider = 'openai') {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.CUSTOM_API_KEY ||
    process.env.TOURMASTER_API_KEY ||
    process.env.VECTORENGINE_API_KEY ||
    process.env.VECTORENGINE_GPT_KEY ||
    process.env.VECTORENGINE_GEMINI_KEY;

  if (!apiKey) {
    throw new Error('Model API Key is not configured (checked OPENAI_API_KEY, VECTORENGINE_API_KEY, CUSTOM_API_KEY)');
  }

  const chatBaseUrl = (
    process.env.OPENAI_API_BASE ||
    process.env.CUSTOM_API_BASE ||
    process.env.VECTORENGINE_API_BASE ||
    'https://api.openai.com/v1'
  ).replace(/\/$/, '');

  return {
    apiKey,
    baseUrl: (process.env.VECTORENGINE_GEMINI_STREAM_BASE || 'https://api.vectorengine.ai/v1beta').replace(/\/$/, ''),
    chatBaseUrl,
    model: getTextModel(task, explicitProvider)
  };
}

function buildGeminiPayload({ systemPrompt, userPrompt, temperature = 0.7, includeThoughts = false }) {
  return {
    ...(systemPrompt ? {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    } : {}),
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature,
      topP: 1,
      thinkingConfig: {
        includeThoughts,
        thinkingBudget: parseInt(process.env.GEMINI_THINKING_BUDGET || '8192', 10)
      }
    }
  };
}

export function extractGeminiText(data) {
  return (data?.candidates || [])
    .flatMap(candidate => candidate.content?.parts || [])
    .filter(part => !part.thought && typeof part.text === 'string')
    .map(part => part.text)
    .join('');
}

export function extractStreamTextFromJson(data) {
  const openAiText = data?.choices?.[0]?.delta?.content || '';
  if (openAiText) return openAiText;
  return extractGeminiText(data);
}

export async function generateText({ systemPrompt, userPrompt, temperature = 0.7, timeout = 90000, task }) {
  const provider = getTextProvider(task);

  if (provider === 'tokenrouter') {
    const config = getTokenRouterConfig(task);
    logModelSelection(task, provider, config.model, config.baseUrl);
    const response = await axios.post(
      `${config.baseUrl}/${config.model}:generateContent`,
      buildGeminiPayload({ systemPrompt, userPrompt, temperature, includeThoughts: false }),
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey
        },
        timeout,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      }
    );
    return extractGeminiText(response.data);
  }

  const config = getVectorEngineConfig(task, provider);
  logModelSelection(task, provider, config.model, config.chatBaseUrl);
  const response = await axios.post(
    `${config.chatBaseUrl}/chat/completions`,
    {
      model: config.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt }
      ],
      temperature
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    }
  );
  return response.data?.choices?.[0]?.message?.content || '';
}

export async function streamText({ systemPrompt, userPrompt, temperature = 0.7, timeout = 70000, task }) {
  const provider = getTextProvider(task);

  if (provider === 'tokenrouter') {
    const config = getTokenRouterConfig(task);
    logModelSelection(task || 'chat_stream', provider, config.model, config.baseUrl);
    const response = await axios.post(
      `${config.baseUrl}/${config.model}:streamGenerateContent?alt=sse`,
      buildGeminiPayload({ systemPrompt, userPrompt, temperature, includeThoughts: false }),
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey
        },
        timeout,
        responseType: 'stream',
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      }
    );
    return response.data;
  }

  const config = getVectorEngineConfig(task, provider);
  logModelSelection(task || 'chat_stream', provider, config.model, config.chatBaseUrl);
  const response = await axios.post(
    `${config.chatBaseUrl}/chat/completions`,
    {
      model: config.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: userPrompt }
      ],
      temperature,
      stream: true
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      timeout,
      responseType: 'stream',
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    }
  );
  return response.data;
}
