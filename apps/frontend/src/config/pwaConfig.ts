/**
 * PWA 配置和 Service Worker 设置
 * 提供离线缓存、资源预缓存、推送通知等功能
 */

// Service Worker 缓存策略配置
export const cacheStrategies = {
  // 应用外壳缓存策略 - Cache First
  appShell: {
    strategy: 'CacheFirst',
    cacheName: 'app-shell-v1',
    resources: [
      '/',
      '/index.html',
      '/static/js/app.js',
      '/static/css/app.css',
      '/images/icons/icon-192x192.png',
      '/images/icons/icon-512x512.png'
    ],
    maxAgeSeconds: 60 * 60 * 24 * 30 // 30天
  },

  // API 数据缓存策略 - Network First
  apiData: {
    strategy: 'NetworkFirst',
    cacheName: 'api-data-v1',
    urlPattern: /^https?:\/\/.*\/api\/.*/,
    maxEntries: 100,
    maxAgeSeconds: 60 * 60 * 24 // 24小时
  },

  // 图片资源缓存策略 - Cache First
  images: {
    strategy: 'CacheFirst',
    cacheName: 'images-v1',
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    maxEntries: 200,
    maxAgeSeconds: 60 * 60 * 24 * 30 // 30天
  },

  // 字体缓存策略 - Cache First
  fonts: {
    strategy: 'CacheFirst',
    cacheName: 'fonts-v1',
    urlPattern: /\.(?:woff|woff2|eot|ttf|otf)$/,
    maxAgeSeconds: 60 * 60 * 24 * 365 // 1年
  },

  // 静态资源缓存策略 - Stale While Revalidate
  staticAssets: {
    strategy: 'StaleWhileRevalidate',
    cacheName: 'static-assets-v1',
    urlPattern: /\.(?:js|css)$/,
    maxEntries: 50,
    maxAgeSeconds: 60 * 60 * 24 * 7 // 7天
  }
}

// PWA 配置
export const pwaConfig = {
  // 应用名称和描述
  name: 'Chatlog Web',
  short_name: 'Chatlog',
  description: 'WeChat数据分析和管理平台',
  
  // 主题配置
  theme_color: '#1890ff',
  background_color: '#ffffff',
  
  // 显示模式
  display: 'standalone',
  orientation: 'portrait-primary',
  
  // 启动 URL
  start_url: '/',
  scope: '/',
  
  // 图标配置
  icons: [
    {
      src: '/images/icons/icon-72x72.png',
      sizes: '72x72',
      type: 'image/png'
    },
    {
      src: '/images/icons/icon-96x96.png',
      sizes: '96x96',
      type: 'image/png'
    },
    {
      src: '/images/icons/icon-128x128.png',
      sizes: '128x128',
      type: 'image/png'
    },
    {
      src: '/images/icons/icon-144x144.png',
      sizes: '144x144',
      type: 'image/png'
    },
    {
      src: '/images/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png'
    },
    {
      src: '/images/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png'
    }
  ],

  // 分享目标
  share_target: {
    action: '/share',
    method: 'POST',
    enctype: 'multipart/form-data',
    params: {
      title: 'title',
      text: 'text',
      url: 'url',
      files: [
        {
          name: 'files',
          accept: ['image/*', 'text/*']
        }
      ]
    }
  },

  // 快捷方式
  shortcuts: [
    {
      name: '数据分析',
      short_name: '分析',
      description: '查看聊天数据分析',
      url: '/analytics',
      icons: [
        {
          src: '/images/shortcuts/analytics.png',
          sizes: '96x96'
        }
      ]
    },
    {
      name: '联系人',
      short_name: '联系人',
      description: '管理联系人信息',
      url: '/contacts',
      icons: [
        {
          src: '/images/shortcuts/contacts.png',
          sizes: '96x96'
        }
      ]
    }
  ]
}

// Service Worker 更新策略
export const updateStrategy = {
  // 自动更新检查间隔（毫秒）
  checkInterval: 60 * 60 * 1000, // 1小时
  
  // 是否在页面加载时检查更新
  checkOnLoad: true,
  
  // 是否在网络状态变化时检查更新
  checkOnNetworkChange: true,
  
  // 更新提示配置
  updatePrompt: {
    enabled: true,
    message: '发现新版本，是否立即更新？',
    confirmText: '立即更新',
    cancelText: '稍后再说'
  },
  
  // 后台同步配置
  backgroundSync: {
    enabled: true,
    syncName: 'chatlog-background-sync',
    maxRetries: 3
  }
}

// 推送通知配置
export const notificationConfig = {
  // VAPID 公钥（需要替换为实际的公钥）
  vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY',
  
  // 默认通知选项
  defaultOptions: {
    badge: '/images/icons/badge-72x72.png',
    icon: '/images/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: '查看详情',
        icon: '/images/icons/checkmark.png'
      },
      {
        action: 'close',
        title: '关闭',
        icon: '/images/icons/xmark.png'
      }
    ]
  }
}

// 离线页面配置
export const offlineConfig = {
  // 离线页面路径
  fallbackPage: '/offline.html',
  
  // 离线提示消息
  offlineMessage: {
    title: '网络连接已断开',
    message: '请检查网络连接后重试',
    retryText: '重试'
  },
  
  // 缓存优先级
  cachePriority: [
    'app-shell-v1',
    'api-data-v1',
    'images-v1',
    'fonts-v1',
    'static-assets-v1'
  ]
}