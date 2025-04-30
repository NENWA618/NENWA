const APP_VERSION = '2.0.5'; // 更新版本号
const CACHE_NAME = `nenwa-cache-${APP_VERSION}`;
const OFFLINE_URL = 'offline.html';
const API_CACHE_NAME = `nenwa-api-cache-${APP_VERSION}`;
const RUNTIME_CACHE = 'runtime-cache';

// 预缓存的核心资源
const urlsToCache = [
  '/',
  '/index.html',
  OFFLINE_URL,
  '/NENWA.png',
  '/styles/main.css',
  '/scripts/main.js',

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
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })))
          .catch((err) => {
            console.warn('[ServiceWorker] Cache addAll failed:', err);
            throw err;
          });
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  const expectedCaches = [CACHE_NAME, API_CACHE_NAME, RUNTIME_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!expectedCaches.includes(cacheName)) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求和chrome-extension等特殊协议
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // 特殊处理日历相关请求 - 网络优先并更新缓存
  if (url.pathname.includes('calendar') || url.searchParams.has('calendar')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 验证响应有效后缓存
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 处理API请求
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 只缓存成功的API响应
          if (response.ok) {
            return cacheApiResponse(request, response);
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 处理HTML文档请求
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 验证响应有效后缓存
          if (response.ok) {
            return fetchAndCache(request, RUNTIME_CACHE);
          }
          throw new Error('Network response was not ok');
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // 处理静态资源（扩展名匹配）
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|gif|webp|ico|json|woff2?)$/i)) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          // 立即返回缓存并后台更新
          const fetchPromise = fetchAndCache(request, RUNTIME_CACHE);
          return cached || fetchPromise;
        })
    );
    return;
  }

  // 默认网络优先策略
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// 后台同步（示例）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[ServiceWorker] Background sync triggered');
    event.waitUntil(
      syncPendingData()
        .catch((err) => {
          console.error('[ServiceWorker] Sync failed:', err);
          throw err;
        })
    );
  }
});

// --- 工具函数 ---
async function fetchAndCache(request, cacheName = CACHE_NAME) {
  try {
    const response = await fetch(request);
    if (!response || !response.ok) return response;

    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    return response;
  } catch (err) {
    console.error('[ServiceWorker] Fetch and cache failed:', err);
    throw err;
  }
}

async function cacheApiResponse(request, response) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    await cache.put(request, response.clone());
    return response;
  } catch (err) {
    console.error('[ServiceWorker] API cache failed:', err);
    return response; // 即使缓存失败也返回原始响应
  }
}

async function syncPendingData() {
  console.log('[ServiceWorker] Syncing pending data...');
  // 这里实现同步逻辑（如 IndexedDB 中的待同步数据）
  // 返回一个Promise
  return Promise.resolve();
}