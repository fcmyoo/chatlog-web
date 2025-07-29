/**
 * Service Worker
 * 提供缓存管理、离线支持、后台同步等功能
 * 注意：Service Worker不支持ES6模块，必须使用传统语法
 */

// Service Worker 版本
const CACHE_VERSION = 'v1.0.0'
const SW_VERSION = '1.0.0'

// 缓存名称
const CACHE_NAMES = {
  APP_SHELL: `app-shell-${CACHE_VERSION}`,
  API_DATA: `api-data-${CACHE_VERSION}`,
  IMAGES: `images-${CACHE_VERSION}`,
  FONTS: `fonts-${CACHE_VERSION}`,
  STATIC: `static-${CACHE_VERSION}`,
  RUNTIME: `runtime-${CACHE_VERSION}`
}

// 需要预缓存的资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
]

// 缓存策略配置
const CACHE_STRATEGIES = {
  images: {
    maxEntries: 100,
    maxAgeSeconds: 30 * 24 * 60 * 60 // 30天
  },
  api: {
    maxEntries: 50,
    maxAgeSeconds: 5 * 60 // 5分钟
  },
  static: {
    maxEntries: 200,
    maxAgeSeconds: 7 * 24 * 60 * 60 // 7天
  }
}

/**
 * Service Worker 安装事件
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker 安装中...', SW_VERSION)
  
  event.waitUntil(
    caches.open(CACHE_NAMES.APP_SHELL)
      .then((cache) => {
        console.log('预缓存资源...')
        return cache.addAll(PRECACHE_URLS)
      })
      .then(() => {
        console.log('Service Worker 安装完成')
        // 立即激活新的 Service Worker
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker 安装失败:', error)
      })
  )
})

/**
 * Service Worker 激活事件
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker 激活中...', SW_VERSION)
  
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      cleanupOldCaches(),
      // 立即控制所有客户端
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker 激活完成')
    })
  )
})

/**
 * 拦截网络请求
 */
self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  
  // 只处理 GET 请求
  if (request.method !== 'GET') {
    return
  }
  
  // 根据请求类型选择缓存策略
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request))
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request))
  } else if (isFontRequest(url)) {
    event.respondWith(handleFontRequest(request))
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAssetRequest(request))
  } else {
    event.respondWith(handleAppShellRequest(request))
  }
})

/**
 * 后台同步事件
 */
self.addEventListener('sync', (event) => {
  console.log('后台同步事件:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

/**
 * 推送通知事件
 */
self.addEventListener('push', (event) => {
  console.log('收到推送消息:', event)
  
  if (event.data) {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title || '新消息', {
        body: data.body || '您有新的消息',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: data
      })
    )
  }
})

/**
 * 通知点击事件
 */
self.addEventListener('notificationclick', (event) => {
  console.log('通知点击事件:', event)
  
  event.notification.close()
  
  const action = event.action
  const data = event.notification.data
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // 如果已有窗口打开，则聚焦到该窗口
      for (const client of clients) {
        if (client.url === self.location.origin && 'focus' in client) {
          return client.focus()
        }
      }
      
      // 否则打开新窗口
      if (self.clients.openWindow) {
        const url = action === 'explore' && data.url ? data.url : '/'
        return self.clients.openWindow(url)
      }
    })
  )
})

/**
 * 处理 API 请求 - Network First 策略
 */
async function handleApiRequest(request) {
  const cacheName = CACHE_NAMES.API_DATA
  
  try {
    // 先尝试网络请求
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // 网络请求成功，更新缓存
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    throw new Error('Network response not ok')
  } catch (error) {
    console.log('网络请求失败，使用缓存:', request.url)
    
    // 网络请求失败，返回缓存
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // 缓存也没有，返回离线页面
    return createOfflineResponse()
  }
}

/**
 * 处理图片请求 - Cache First 策略
 */
async function handleImageRequest(request) {
  const cacheName = CACHE_NAMES.IMAGES
  
  // 先检查缓存
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    // 缓存没有，从网络获取
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // 更新缓存
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
      
      // 清理过期缓存
      await cleanupCache(cacheName, CACHE_STRATEGIES.images.maxEntries)
    }
    
    return networkResponse
  } catch (error) {
    console.log('图片加载失败:', request.url)
    
    // 返回默认图片
    return createDefaultImageResponse()
  }
}

/**
 * 处理字体请求 - Cache First 策略
 */
async function handleFontRequest(request) {
  const cacheName = CACHE_NAMES.FONTS
  
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('字体加载失败:', request.url)
    return new Response('', { status: 404 })
  }
}

/**
 * 处理静态资源请求 - Stale While Revalidate 策略
 */
async function handleStaticAssetRequest(request) {
  const cacheName = CACHE_NAMES.STATIC
  
  const cachedResponse = await caches.match(request)
  
  // 异步更新缓存
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName)
      cache.then(c => c.put(request, networkResponse.clone()))
    }
    return networkResponse
  }).catch(() => {
    // 网络请求失败时静默处理
    return null
  })
  
  // 返回缓存版本或等待网络版本
  return cachedResponse || fetchPromise
}

/**
 * 处理应用外壳请求 - Cache First 策略
 */
async function handleAppShellRequest(request) {
  const cacheName = CACHE_NAMES.APP_SHELL
  
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // 对于导航请求，返回缓存的首页
    if (request.mode === 'navigate') {
      const cachedIndex = await caches.match('/')
      if (cachedIndex) {
        return cachedIndex
      }
    }
    
    return createOfflineResponse()
  }
}

/**
 * 清理旧缓存
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys()
  const currentCaches = Object.values(CACHE_NAMES)
  
  const deletePromises = cacheNames
    .filter(cacheName => !currentCaches.includes(cacheName))
    .map(cacheName => {
      console.log('删除旧缓存:', cacheName)
      return caches.delete(cacheName)
    })
  
  return Promise.all(deletePromises)
}

/**
 * 清理缓存条目
 */
async function cleanupCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  
  if (keys.length > maxEntries) {
    const deleteCount = keys.length - maxEntries
    const deletePromises = keys
      .slice(0, deleteCount)
      .map(key => cache.delete(key))
    
    await Promise.all(deletePromises)
  }
}

/**
 * 处理后台同步
 */
async function handleBackgroundSync() {
  console.log('执行后台同步任务')
  
  try {
    // 这里可以执行需要后台同步的任务
    // 例如：同步离线时的用户操作、更新缓存等
    
    // 通知客户端同步完成
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_SUCCESS',
        message: '后台同步完成'
      })
    })
  } catch (error) {
    console.error('后台同步失败:', error)
    
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_ERROR',
        error: error.message
      })
    })
  }
}

/**
 * 创建离线响应
 */
function createOfflineResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>离线模式</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
          text-align: center; 
          padding: 50px; 
          background: #f5f5f5;
        }
        .offline-container {
          max-width: 400px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1);
        }
        .offline-icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #666; margin-bottom: 16px; }
        p { color: #999; margin-bottom: 24px; }
        button { 
          padding: 12px 24px; 
          background: #409eff; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer;
          font-size: 14px;
        }
        button:hover { background: #337ecc; }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📡</div>
        <h1>网络连接已断开</h1>
        <p>请检查您的网络连接后重试</p>
        <button onclick="location.reload()">重试</button>
      </div>
    </body>
    </html>
    `,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }
  )
}

/**
 * 创建默认图片响应
 */
function createDefaultImageResponse() {
  // 创建一个简单的 SVG 占位图
  const svg = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#f5f5f5"/>
      <text x="50" y="50" font-family="Arial" font-size="12" fill="#999" text-anchor="middle" dy="4">图片加载失败</text>
    </svg>
  `
  
  return new Response(svg, {
    status: 200,
    headers: { 'Content-Type': 'image/svg+xml' }
  })
}

/**
 * 判断是否为 API 请求
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/')
}

/**
 * 判断是否为图片请求
 */
function isImageRequest(url) {
  return /\.(png|jpg|jpeg|gif|svg|webp)(\?.*)?$/i.test(url.pathname)
}

/**
 * 判断是否为字体请求
 */
function isFontRequest(url) {
  return /\.(woff|woff2|eot|ttf|otf)(\?.*)?$/i.test(url.pathname)
}

/**
 * 判断是否为静态资源请求
 */
function isStaticAsset(url) {
  return /\.(js|css)(\?.*)?$/i.test(url.pathname)
}