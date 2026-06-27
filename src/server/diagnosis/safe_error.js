export function formatErrorForLog(error) {
  if (!error) return { message: 'Unknown error' };

  const status = error.response?.status;
  const responseData = error.response?.data;
  const config = error.config || {};

  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    code: error.code,
    status,
    method: config.method,
    url: config.url,
    responseData: typeof responseData === 'string'
      ? responseData.slice(0, 500)
      : responseData
  };
}

export function isTransientNetworkError(error) {
  const code = error?.code;
  const status = error?.response?.status;
  const message = (error?.message || '').toLowerCase();

  return (
    ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE'].includes(code) ||
    [408, 429, 500, 502, 503, 504].includes(status) ||
    message.includes('socket disconnected') ||
    message.includes('timeout') ||
    message.includes('network')
  );
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
