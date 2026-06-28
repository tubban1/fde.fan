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
  return taskKey === 'EXTRACTION' || taskKey === 'REPORT';
}

function getTextProvider(task) {
  const taskKey = normalizeTask(task);
  const taskProvider = getEnvValue(taskKey ? `${taskKey}_MODEL_PROVIDER` : '');
  if (taskProvider) return taskProvider.toLowerCase();
  if (isPromptModelTask(taskKey)) return 'vectorengine';
  return (process.env.TEXT_MODEL_PROVIDER || 'tokenrouter').toLowerCase();
}

function getTextModel(task, provider) {
  const taskKey = normalizeTask(task);
  const taskModel = getEnvValue(taskKey ? `${taskKey}_MODEL` : '');
  if (taskModel) return taskModel;
  if (isPromptModelTask(taskKey)) {
    return process.env.PROMPT_MODEL || 'gemini-3.1-flash-lite';
  }
  if (provider === 'vectorengine') {
    return process.env.VECTORENGINE_TEXT_MODEL || process.env.PROMPT_MODEL || 'gemini-3.1-flash-lite';
  }
  return process.env.TEXT_MODEL || process.env.PROMPT_MODEL || 'google/gemini-3.5-flash';
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

function getVectorEngineConfig(task) {
  const apiKey = process.env.VECTORENGINE_GEMINI_KEY || process.env.VECTORENGINE_API_KEY;
  if (!apiKey) {
    throw new Error('VECTORENGINE_GEMINI_KEY or VECTORENGINE_API_KEY is not configured');
  }

  const provider = 'vectorengine';
  return {
    apiKey,
    baseUrl: (process.env.VECTORENGINE_GEMINI_STREAM_BASE || 'https://api.vectorengine.ai/v1beta').replace(/\/$/, ''),
    chatBaseUrl: (process.env.VECTORENGINE_API_BASE || 'https://api.vectorengine.cn/v1').replace(/\/$/, ''),
    model: getTextModel(task, provider)
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

  const config = getVectorEngineConfig(task);
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

export async function streamText({ systemPrompt, userPrompt, temperature = 0.7, timeout = 70000 }) {
  const provider = getTextProvider();

  if (provider === 'tokenrouter') {
    const config = getTokenRouterConfig();
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

  const config = getVectorEngineConfig();
  const response = await axios.post(
    `${config.baseUrl}/models/${config.model}:streamGenerateContent?key=&alt=sse`,
    buildGeminiPayload({ systemPrompt, userPrompt, temperature, includeThoughts: false }),
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
