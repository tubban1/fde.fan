import type { APIRoute } from 'astro';

const DEFAULT_PREDICT_API_URL = 'https://wihaha-worldcup-api.hf.space';

function getPredictApiUrl() {
  const rawUrl =
    import.meta.env.PREDICT_API_URL ||
    import.meta.env.PUBLIC_PREDICT_API_URL ||
    process.env.PREDICT_API_URL ||
    process.env.PUBLIC_PREDICT_API_URL ||
    DEFAULT_PREDICT_API_URL;

  const url = String(rawUrl).trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(`Invalid prediction API URL: "${url}". It must start with http:// or https://.`);
  }
  return url;
}

export const GET: APIRoute = async () => {
  try {
    const apiUrl = getPredictApiUrl();
    const response = await fetch(`${apiUrl}/api/predict`, {
      signal: AbortSignal.timeout(Number(import.meta.env.PREDICT_API_TIMEOUT_MS || 30000)),
      headers: {
        accept: 'application/json',
      },
    });

    const text = await response.text();
    if (!response.ok) {
      return new Response(JSON.stringify({
        error: 'prediction_api_error',
        status: response.status,
        detail: text.slice(0, 500),
      }), {
        status: 502,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(text, {
      status: 200,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'prediction_api_unreachable',
      detail: error?.message || String(error),
    }), {
      status: 504,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }
};
