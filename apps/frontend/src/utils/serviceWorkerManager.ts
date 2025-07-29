/**
 * Service Worker 注册和管理
 * 处理 SW 生命周期、更新检测、用户提示等
 */

export interface ServiceWorkerManager {
  register(): Promise<ServiceWorkerRegistration | null>
  unregister(): Promise<boolean>
  update(): Promise<void>
  checkForUpdates(): void
  requestNotificationPermission(): Promise<NotificationPermission>
  subscribeToNotifications(): Promise<PushSubscription | null>
  getCacheStats(): Promise<CacheStats | null>
  clearAllCaches(): Promise<void>
}

export interface CacheStats {
  totalSize: number
  cacheNames: string[]
  itemCount: number
}

export interface ServiceWorkerMessage {
  type: 'BACKGROUND_SYNC_SUCCESS' | 'BACKGROUND_SYNC_ERROR' | 'CACHE_UPDATED' | 'UPDATE_AVAILABLE'
  message?: string
  error?: string
  data?: any
}

// PWA配置
const PWA_CONFIG = {
  updateStrategy: {
    checkInterval: 60000, // 1分钟
    updatePrompt: {
      enabled: true,
      message: '发现新版本，是否立即更新？',
      confirmText: '立即更新',
      cancelText: '稍后再说'
    }
  },
  notificationConfig: {
    enabled: true,
    vapidKey: import.meta.env.VITE_VAPID_KEY || ''
  }
}

class ServiceWorkerManagerImpl implements ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private updateCheckInterval: number | null = null
  private isUpdateAvailable = false

  constructor() {
    this.setupUpdateChecking()
    this.setupMessageHandling()
  }

  /**
   * 注册 Service Worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker 不受支持')
      return null
    }

    try {
      console.log('正在注册 Service Worker...')
      
      // 检查Service Worker文件是否存在
      const swResponse = await fetch('/sw.js', { method: 'HEAD' })
      if (!swResponse.ok) {
        throw new Error(`Service Worker文件不存在或无法访问: ${swResponse.status}`)
      }

      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
        type: 'classic' // 明确指定为传统脚本类型
      })

      console.log('Service Worker 注册成功:', this.registration.scope)

      // 监听安装事件
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdateFound()
      })

      // 检查是否有等待中的 Service Worker
      if (this.registration.waiting) {
        this.handleWaitingServiceWorker()
      }

      // 监听控制器变化
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker 控制器已更新')
        // 可以选择是否自动刷新页面
        // window.location.reload()
      })

      return this.registration
    } catch (error) {
      console.error('Service Worker 注册失败:', error)
      
      // 详细的错误信息
      if (error instanceof TypeError) {
        console.error('可能的原因: Service Worker脚本语法错误或网络问题')
        console.error('建议检查: 1. sw.js文件是否存在 2. 脚本语法是否正确 3. 网络连接')
      } else if (error instanceof DOMException) {
        console.error('可能的原因: 安全策略限制或HTTPS要求')
        console.error('建议检查: 1. 是否在HTTPS环境 2. 浏览器安全设置')
      }
      
      return null
    }
  }

  /**
   * 注销 Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const result = await this.registration.unregister()
      if (result) {
        console.log('Service Worker 注销成功')
        this.registration = null
        
        if (this.updateCheckInterval) {
          clearInterval(this.updateCheckInterval)
          this.updateCheckInterval = null
        }
      }
      return result
    } catch (error) {
      console.error('Service Worker 注销失败:', error)
      return false
    }
  }

  /**
   * 更新 Service Worker
   */
  async update(): Promise<void> {
    if (!this.registration) {
      console.warn('Service Worker 未注册')
      return
    }

    try {
      await this.registration.update()
      console.log('Service Worker 更新检查完成')
    } catch (error) {
      console.error('Service Worker 更新失败:', error)
    }
  }

  /**
   * 检查更新
   */
  checkForUpdates(): void {
    if (!PWA_CONFIG.updateStrategy.checkInterval) return

    this.updateCheckInterval = window.setInterval(() => {
      this.update()
    }, PWA_CONFIG.updateStrategy.checkInterval)
  }

  /**
   * 请求通知权限
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('此浏览器不支持通知')
      return 'denied'
    }

    if (Notification.permission === 'granted') {
      return 'granted'
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission
    }

    return Notification.permission
  }

  /**
   * 订阅推送通知
   */
  async subscribeToNotifications(): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.warn('Service Worker 未注册')
      return null
    }

    try {
      const permission = await this.requestNotificationPermission()
      if (permission !== 'granted') {
        console.warn('通知权限被拒绝')
        return null
      }

      // 检查现有订阅
      let subscription = await this.registration.pushManager.getSubscription()

      if (!subscription && PWA_CONFIG.notificationConfig.vapidKey) {
        // 创建新订阅
        const vapidPublicKey = this.urlBase64ToUint8Array(PWA_CONFIG.notificationConfig.vapidKey)
        
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey
        })

        console.log('推送通知订阅成功:', subscription)
      }

      return subscription
    } catch (error) {
      console.error('推送通知订阅失败:', error)
      return null
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<CacheStats | null> {
    if (!('caches' in window)) {
      return null
    }

    try {
      const cacheNames = await caches.keys()
      let totalSize = 0
      let itemCount = 0

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName)
        const keys = await cache.keys()
        itemCount += keys.length

        // 估算缓存大小（这是一个近似值）
        for (const request of keys) {
          const response = await cache.match(request)
          if (response) {
            const blob = await response.blob()
            totalSize += blob.size
          }
        }
      }

      return {
        totalSize,
        cacheNames,
        itemCount
      }
    } catch (error) {
      console.error('获取缓存统计失败:', error)
      return null
    }
  }

  /**
   * 清空所有缓存
   */
  async clearAllCaches(): Promise<void> {
    if (!('caches' in window)) {
      return
    }

    try {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
      console.log('所有缓存已清空')
    } catch (error) {
      console.error('清空缓存失败:', error)
    }
  }

  /**
   * 处理更新发现
   */
  private handleUpdateFound(): void {
    if (!this.registration) return

    const newWorker = this.registration.installing
    if (!newWorker) return

    console.log('发现新的 Service Worker')

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // 有新版本可用
          this.handleUpdateAvailable()
        } else {
          // 首次安装
          console.log('Service Worker 首次安装完成')
        }
      }
    })
  }

  /**
   * 处理等待中的 Service Worker
   */
  private handleWaitingServiceWorker(): void {
    console.log('有 Service Worker 正在等待激活')
    this.handleUpdateAvailable()
  }

  /**
   * 处理更新可用
   */
  private handleUpdateAvailable(): void {
    this.isUpdateAvailable = true
    console.log('Service Worker 更新可用')

    if (PWA_CONFIG.updateStrategy.updatePrompt.enabled) {
      this.showUpdatePrompt()
    } else {
      this.activateUpdate()
    }
  }

  /**
   * 显示更新提示
   */
  private showUpdatePrompt(): void {
    const { message, confirmText, cancelText } = PWA_CONFIG.updateStrategy.updatePrompt

    // 这里可以集成 UI 框架的对话框组件
    if (confirm(message)) {
      this.activateUpdate()
    }
  }

  /**
   * 激活更新
   */
  private activateUpdate(): void {
    if (!this.registration?.waiting) return

    // 发送跳过等待消息
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  /**
   * 设置更新检查
   */
  private setupUpdateChecking(): void {
    if (PWA_CONFIG.updateStrategy.checkInterval > 0) {
      this.updateCheckInterval = window.setInterval(() => {
        this.checkForUpdates()
      }, PWA_CONFIG.updateStrategy.checkInterval)
    }
  }

  /**
   * 设置消息处理
   */
  private setupMessageHandling(): void {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { data } = event as MessageEvent<ServiceWorkerMessage>
      
      console.log('收到 Service Worker 消息:', data)
      
      switch (data.type) {
        case 'BACKGROUND_SYNC_SUCCESS':
          console.log('后台同步成功:', data.message)
          break
        case 'BACKGROUND_SYNC_ERROR':
          console.error('后台同步失败:', data.error)
          break
        case 'CACHE_UPDATED':
          console.log('缓存已更新:', data.data)
          break
        case 'UPDATE_AVAILABLE':
          this.handleUpdateAvailable()
          break
      }
    })
  }

  /**
   * 显示安装成功提示
   */
  private showInstallSuccess(): void {
    console.log('PWA 安装成功！')
    
    // 可以显示一个友好的提示
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('应用安装成功', {
        body: '应用已添加到您的设备，可以离线使用！',
        icon: '/favicon.ico'
      })
    }
  }

  /**
   * 将 base64 字符串转换为 Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
  }
}

// 创建单例实例
export const serviceWorkerManager = new ServiceWorkerManagerImpl()

// 默认导出
export default serviceWorkerManager