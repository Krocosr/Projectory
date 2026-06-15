const CACHE = 'projectory-v1';
const API_CACHE = 'projectory-api-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => {
        if (k !== CACHE && k !== API_CACHE) return caches.delete(k);
      }))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
  } else if (url.pathname.startsWith('/_next/static/') && url.pathname.match(/\.(js|css)$/)) {
    // ponytail: no-cache for chunks — cache-first would serve stale after deploy
    event.respondWith(networkFirst(event.request));
  } else {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    const cache = await caches.open(API_CACHE);
    cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(null, { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'BACKUP_NOW') {
    event.waitUntil(performBackup().then(() => {
      event.source?.postMessage({ type: 'BACKUP_DONE' });
    }));
  }
});

async function performBackup() {
  try {
    const res = await fetch('/api/projects');
    const data = await res.json();
    const cache = await caches.open('projectory-backup');
    cache.put('/backup/latest', new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', 'Date': new Date().toISOString() }
    }));
  } catch {}
}
