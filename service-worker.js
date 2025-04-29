const APP_VERSION = '2.0.2';
const CACHE_NAME = `nenwa-cache-${APP_VERSION}`;
const OFFLINE_URL = 'offline.html';
const API_CACHE_NAME = `nenwa-api-cache-${APP_VERSION}`;

const urlsToCache = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/NENWA.png',
  '/styles/main.css',
  '/scripts/main.js',
  // 食谱页面
  '/oyakodon.HTML',
  '/tendon.HTML',
  // ...其他常用页面...
  // CDN 资源
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://code.jquery.com/jquery-3.6.0.min.js',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/main.min.css',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/main.min.js'
];

// 安装阶段：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching core files');
        return cache.addAll(urlsToCache).catch((err) => {
          console.warn('[ServiceWorker] Cache addAll failed:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 静态资源：缓存优先
  if (url.pathname.match(/\.(css|js|png|svg|html)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then((cached) => cached || fetchAndCache(event.request))
    );
  }
  // API 请求：网络优先
  else if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => cacheApiResponse(event.request, res))
        .catch(() => caches.match(event.request))
    );
  }
  // HTML 页面：网络优先，离线回退
  else if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(OFFLINE_URL))
    );
  }
});

// 后台同步（示例）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[ServiceWorker] Background sync triggered');
    event.waitUntil(syncPendingData());
  }
});

// --- 工具函数 ---
async function fetchAndCache(request) {
  const res = await fetch(request);
  if (!res || res.status !== 200) return res;

  const cache = await caches.open(CACHE_NAME);
  cache.put(request, res.clone());
  return res;
}

async function cacheApiResponse(request, response) {
  if (!response || !response.ok) return response;

  const cache = await caches.open(API_CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

async function syncPendingData() {
  // 这里实现同步逻辑（如 IndexedDB 中的待同步数据）
  console.log('[ServiceWorker] Syncing pending data...');
}