const buildId = new URL(self.location.href).searchParams.get('v') || 'local';
const VERSION = `subtitle-ladder-shell-${buildId}`;
const SHELL = ['/', '/index.html', '/?demo=1', '/demo/', '/demo/index.html', '/new/', '/practice/', '/unlimited/', '/privacy/', '/terms/', '/manifest.webmanifest', '/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/hero-listening-landscape-768.webp', '/hero-listening-landscape-1280.webp', '/social-card.webp', '/offline.html', '/offline.css', '/404.html', '/404.css', '/robots.txt', '/sitemap.xml'];

function freshPath(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}__sw_build=${encodeURIComponent(buildId)}`;
}

async function cacheFresh(cache, path) {
  const response = await fetch(new Request(freshPath(path), { cache: 'reload' }));
  if (!response.ok) throw new Error(`Could not cache ${path}`);
  await cache.put(path, response.clone());
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then(async (cache) => {
    await Promise.all(SHELL.map((path) => cacheFresh(cache, path)));
    const html = await (await cache.match('/index.html')).text();
    const builtAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]);
    await Promise.all(builtAssets.map((path) => cacheFresh(cache, path)));
  }));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('subtitle-ladder-') && key !== VERSION).map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  const request = event.request;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
      return response;
    }).catch(async () => (await caches.match(request, { ignoreVary: true })) || (await caches.match('/offline.html'))));
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: false, ignoreVary: true }).then((cached) => cached || fetch(request).then(async (response) => {
    if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
    return response;
  })));
});
