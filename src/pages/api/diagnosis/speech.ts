import type { APIRoute } from "astro";

const VOICE_BASE_URL = (process.env.VECTORENGINE_VOICE_BASE || "https://api.vectorengine.ai/v1").replace(/\/$/, "");
const MAX_TTS_CHARS = 3000;

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const apiKey = process.env.VECTORENGINE_VOICE_KEY;
  const model = process.env.TTS_MODEL || "gpt-4o-mini-tts";
  const voice = process.env.TTS_VOICE || "alloy";

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "VECTORENGINE_VOICE_KEY is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const body = await request.json().catch(() => ({}));
  const input = String(body?.text || body?.input || "").trim();

  if (!input) {
    return new Response(JSON.stringify({ error: "缺少朗读文本" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const upstream = await fetch(`${VOICE_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: input.slice(0, MAX_TTS_CHARS),
      voice,
    }),
  });

  if (!upstream.ok) {
    const raw = await upstream.text();
    return new Response(JSON.stringify({ error: "语音合成失败", detail: raw.slice(0, 500) }), {
      status: upstream.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
};
