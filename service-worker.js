const APP_VERSION = '2.0.1';
const CACHE_NAME = `nenwa-cache-${APP_VERSION}`;
const OFFLINE_URL = 'offline.html';

const urlsToCache = [
  './',
  './index.html',
  OFFLINE_URL,
  './NENWA.png',
  
  // 食谱页面
  './oyakodon.HTML',
  './tendon.HTML',
  './gyuudon.HTML',
  './katsudon.HTML',
  './yakisoba.HTML',
  './yakiudon.HTML',
  './kakeudon.HTML',
  './tacorice.HTML',
  './makunouchibentou.HTML',
  './noriben.HTML',
  
  // CDN 资源
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://code.jquery.com/jquery-3.6.0.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/fotorama/4.6.4/fotorama.css',
  'https://cdnjs.cloudflare.com/ajax/libs/fotorama/4.6.4/fotorama.js',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/main.min.css',
  'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/main.min.js',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Exo+2:wght@300;500&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] 缓存核心资源');
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('[ServiceWorker] 部分资源缓存失败:', err);
        });
      })
      .then(() => {
        console.log('[ServiceWorker] 跳过等待阶段');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('fetch', event => {
  // 忽略非GET请求和chrome-extension请求
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // 处理API请求和文档请求的不同策略
  if (event.request.url.includes('/api/')) {
    // API请求：网络优先，失败则返回缓存
    event.respondWith(
      fetch(event.request)
        .then(response => cacheApiResponse(event.request, response))
        .catch(() => caches.match(event.request))
    );
  } else {
    // 静态资源：缓存优先，网络回退
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // 返回缓存或获取网络资源
          return cachedResponse || fetchAndCache(event.request);
        })
        .catch(() => {
          // 如果请求HTML文档失败，返回离线页面
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match(OFFLINE_URL);
          }
        })
    );
  }
});

function fetchAndCache(request) {
  return fetch(request)
    .then(response => {
      // 检查响应是否有效
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }

      // 克隆响应以缓存
      const responseToCache = response.clone();
      caches.open(CACHE_NAME)
        .then(cache => cache.put(request, responseToCache))
        .catch(err => console.warn('[ServiceWorker] 缓存写入失败:', err));

      return response;
    })
    .catch(err => {
      console.warn('[ServiceWorker] 网络请求失败:', err);
      throw err; // 继续抛出错误以便外层捕获
    });
}

function cacheApiResponse(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') {
    return response;
  }

  // 只缓存成功的API响应
  const responseToCache = response.clone();
  caches.open(CACHE_NAME)
    .then(cache => cache.put(request, responseToCache))
    .catch(err => console.warn('[ServiceWorker] API缓存失败:', err));

  return response;
}

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[ServiceWorker] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[ServiceWorker] 已激活并清理旧缓存');
      return self.clients.claim();
    })
  );
});

// 监听消息事件 (可用于更新UI)
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});