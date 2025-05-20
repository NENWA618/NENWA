// ========================
// Service Worker 核心配置
// ========================
const APP_VERSION = '1.0.0'; // 每次更新应用时修改此版本号
const CACHE_NAMES = {
  static: `nenwa-static-${APP_VERSION}`,
  api: `nenwa-api-${APP_VERSION}`,
  runtime: 'nenwa-runtime'
};

// 预缓存的核心静态资源
const PRECACHE_URLS = [
  './',
  './index.html',
  './main.css',
  './main.js',
  './budget.js',
  './quantum-worker.js',
  './NENWA.png',
];

// ========================
// 安装阶段：预缓存核心资源
// ========================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        console.log('[SW] 正在预缓存核心资源');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] 安装完成，跳过等待');
        return self.skipWaiting(); // 立即激活新SW
      })
      .catch((err) => {
        console.error('[SW] 预缓存失败:', err);
      })
  );
});

// ========================
// 激活阶段：清理旧缓存
// ========================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 删除不属于当前版本的缓存
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log('[SW] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] 已清理旧缓存，接管所有客户端');
      return self.clients.claim();
    })
  );
});

// ========================
// 拦截请求：智能缓存策略
// ========================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求和浏览器扩展请求
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // 策略1：静态资源 - 缓存优先
  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirst(request, CACHE_NAMES.static)
    );
    return;
  }

  // 策略2：API请求 - 网络优先，失败时用缓存
  if (isApiRequest(url)) {
    event.respondWith(
      networkFirst(request, CACHE_NAMES.api)
    );
    return;
  }

  // 策略3：HTML页面 - 网络优先，离线回退
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      networkFirst(request, CACHE_NAMES.runtime)
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // 默认策略：网络优先
  event.respondWith(fetch(request));
});

// ========================
// 后台同步：数据同步
// ========================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[SW] 后台同步触发');
    event.waitUntil(
      syncPendingData()
        .then(() => console.log('[SW] 同步成功'))
        .catch((err) => console.error('[SW] 同步失败:', err))
    );
  }
});

// ========================
// 工具函数
// ========================

/**
 * 静态资源判断（CSS/JS/图片等）
 */
function isStaticAsset(url) {
  // 只缓存本站资源
  return url.origin === self.location.origin && url.pathname.match(/\.(css|js|png|jpg|svg|woff2)$/i);
}

/**
 * API请求判断
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * 缓存优先策略
 */
function cacheFirst(request, cacheName) {
  return caches.match(request)
    .then((cached) => {
      // 返回缓存或在后台更新
      return cached || fetchAndCache(request, cacheName);
    });
}

/**
 * 网络优先策略
 */
function networkFirst(request, cacheName) {
  return fetch(request)
    .then((response) => {
      // 缓存有效响应
      if (response.ok) {
        const clone = response.clone();
        caches.open(cacheName)
          .then((cache) => cache.put(request, clone))
          .catch((err) => console.error('[SW] 缓存写入失败:', err));
      }
      return response;
    })
    .catch(() => {
      // 网络失败时回退到缓存
      return caches.match(request);
    });
}

/**
 * 获取并缓存请求
 */
function fetchAndCache(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (!response.ok) throw new Error('响应无效');
      const clone = response.clone();
      caches.open(cacheName)
        .then((cache) => cache.put(request, clone));
      return response;
    })
    .catch((err) => {
      console.error('[SW] 获取失败:', err);
      throw err;
    });
}

/**
 * 同步待处理数据（示例）
 */
function syncPendingData() {
  // 实际项目中从IndexedDB读取待同步数据
  const pendingItems = []; 
  return Promise.all(
    pendingItems.map((item) =>
      fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(item)
      })
    )
  );
}