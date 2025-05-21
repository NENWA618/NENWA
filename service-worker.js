// ========================
// Service Worker 增强版 v2.0
// ========================
const APP_VERSION = '2.0.0';
const CACHE_NAMES = {
  static: `nenwa-static-v${APP_VERSION}`,
  api: `nenwa-api-v${APP_VERSION}`,
  runtime: 'nenwa-runtime',
  offline: 'nenwa-offline'
};

// 预缓存的核心静态资源
const PRECACHE_URLS = [
  './',
  './index.html',
  './main.css',
  './main.js',
  './budget.js',
  './quantum-worker.js',
  './offline.html',
  './NENWA.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// 需要动态缓存的资源类型
const DYNAMIC_CACHE_TYPES = [
  'image',
  'font',
  'script',
  'style'
];

// 最大动态缓存数量
const MAX_DYNAMIC_CACHE = 50;

// ========================
// 安装阶段：预缓存核心资源
// ========================
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // 预缓存核心静态资源
      caches.open(CACHE_NAMES.static)
        .then(cache => {
          console.log('[SW] 正在预缓存核心资源');
          return cache.addAll(PRECACHE_URLS);
        }),
      
      // 预缓存离线页面
      caches.open(CACHE_NAMES.offline)
        .then(cache => cache.add('./offline.html'))
    ])
    .then(() => {
      console.log('[SW] 预缓存完成，立即激活');
      return self.skipWaiting();
    })
    .catch(err => {
      console.error('[SW] 安装失败:', err);
    })
  );
});

// ========================
// 激活阶段：清理旧缓存
// ========================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 删除旧版本缓存
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            console.log('[SW] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] 激活完成，接管客户端');
      return self.clients.claim();
    })
    .then(() => {
      // 清理过期的动态缓存
      return cleanupOldCaches();
    })
  );
});

// ========================
// 拦截请求：智能缓存策略
// ========================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求和非HTTP请求
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 开发工具请求跳过
  if (url.href.includes('chrome-extension')) {
    return;
  }

  // 处理同源请求
  if (url.origin === self.location.origin) {
    // HTML页面：网络优先，离线回退
    if (request.headers.get('accept').includes('text/html')) {
      event.respondWith(
        fetch(request)
          .then(response => {
            // 更新缓存
            updateCache(request, response.clone(), CACHE_NAMES.runtime);
            return response;
          })
          .catch(() => {
            return caches.match('./offline.html')
              .then(offlinePage => offlinePage || showOfflineFallback());
          })
      );
      return;
    }

    // 静态资源：缓存优先
    if (isStaticAsset(url)) {
      event.respondWith(
        cacheFirst(request, CACHE_NAMES.static)
      );
      return;
    }
  }

  // API请求：网络优先，缓存回退
  if (isApiRequest(url)) {
    event.respondWith(
      networkFirst(request, CACHE_NAMES.api)
    );
    return;
  }

  // 其他资源：尝试缓存
  if (shouldCache(request)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 动态缓存
          cacheDynamic(request, response.clone());
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
  }
});

// ========================
// 后台同步：增强数据同步
// ========================
self.addEventListener('sync', (event) => {
  console.log(`[SW] 后台同步事件: ${event.tag}`);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      syncPendingData()
        .then(() => {
          console.log('[SW] 数据同步成功');
          return showNotification('数据同步完成');
        })
        .catch(err => {
          console.error('[SW] 同步失败:', err);
          return showNotification('同步失败，请检查网络');
        })
    );
  }
});

// ========================
// 推送通知处理
// ========================
self.addEventListener('push', (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'NENWA通知';
  
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '有新消息',
      icon: './icons/icon-192x192.png',
      badge: './icons/badge.png',
      data: payload.url
    })
  );
});

// ========================
// 通知点击处理
// ========================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

// ========================
// 工具函数
// ========================

/**
 * 静态资源判断
 */
function isStaticAsset(url) {
  return url.origin === self.location.origin && 
         /\.(css|js|json|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/i.test(url.pathname);
}

/**
 * API请求判断
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * 是否应该缓存该请求
 */
function shouldCache(request) {
  const url = new URL(request.url);
  return DYNAMIC_CACHE_TYPES.some(type => request.headers.get('accept').includes(type)) &&
         url.origin === self.location.origin;
}

/**
 * 缓存优先策略
 */
function cacheFirst(request, cacheName) {
  return caches.match(request)
    .then(cached => {
      // 后台更新缓存
      if (navigator.onLine) {
        fetch(request)
          .then(response => updateCache(request, response.clone(), cacheName))
          .catch(() => {});
      }
      return cached || fetch(request);
    });
}

/**
 * 网络优先策略
 */
function networkFirst(request, cacheName) {
  return fetch(request)
    .then(response => {
      updateCache(request, response.clone(), cacheName);
      return response;
    })
    .catch(() => {
      return caches.match(request)
        .then(cached => cached || Promise.reject('No cache available'));
    });
}

/**
 * 更新缓存
 */
function updateCache(request, response, cacheName) {
  if (response.ok) {
    return caches.open(cacheName)
      .then(cache => cache.put(request, response))
      .catch(err => console.error('[SW] 缓存更新失败:', err));
  }
}

/**
 * 动态缓存资源
 */
function cacheDynamic(request, response) {
  if (response.ok) {
    caches.open(CACHE_NAMES.runtime)
      .then(cache => {
        cache.put(request, response);
        return cache.keys();
      })
      .then(keys => {
        // 控制缓存数量
        if (keys.length > MAX_DYNAMIC_CACHE) {
          cache.delete(keys[0]);
        }
      })
      .catch(err => console.error('[SW] 动态缓存失败:', err));
  }
}

/**
 * 清理旧缓存
 */
function cleanupOldCaches() {
  return caches.open(CACHE_NAMES.runtime)
    .then(cache => cache.keys())
    .then(keys => {
      if (keys.length > MAX_DYNAMIC_CACHE) {
        return Promise.all(
          keys.slice(0, keys.length - MAX_DYNAMIC_CACHE)
            .map(key => caches.delete(key))
        );
      }
    });
}

/**
 * 显示离线回退页面
 */
function showOfflineFallback() {
  return new Response(
    '<h1>离线模式</h1><p>当前处于离线状态，请检查网络连接</p>',
    { headers: { 'Content-Type': 'text/html' } }
  );
}

/**
 * 同步待处理数据
 */
function syncPendingData() {
  return getPendingData()
    .then(items => {
      return Promise.all(
        items.map(item => 
          fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          })
          .then(response => {
            if (response.ok) {
              return markAsSynced(item.id);
            }
            throw new Error('同步失败');
          })
        )
      );
    });
}

/**
 * 获取待同步数据（模拟）
 */
function getPendingData() {
  // 实际项目中从IndexedDB获取
  return Promise.resolve([]);
}

/**
 * 标记数据为已同步（模拟）
 */
function markAsSynced(id) {
  // 实际项目中更新IndexedDB
  return Promise.resolve();
}

/**
 * 显示通知
 */
function showNotification(message) {
  return self.registration.showNotification('NENWA通知', {
    body: message,
    icon: './icons/icon-192x192.png'
  });
}