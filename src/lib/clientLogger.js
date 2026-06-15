const LOG_KEY = 'projectory_error_log';
const MAX_ENTRIES = 20;

export function captureChunkError(error, chunkUrl) {
  const entry = {
    ts: Date.now(),
    url: chunkUrl || null,
    name: error.name || null,
    message: error.message || String(error),
    stack: error.stack || null,
    ua: navigator.userAgent,
    pathname: location.pathname + location.search,
  };

  try {
    const log = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    log.unshift(entry);
    if (log.length > MAX_ENTRIES) log.length = MAX_ENTRIES;
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {}

  console.error('[ChunkLoadError]', entry);
}

export function getErrorLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearErrorLog() {
  try {
    localStorage.removeItem(LOG_KEY);
  } catch {}
}
