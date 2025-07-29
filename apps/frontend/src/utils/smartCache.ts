import { ref, computed, watch } from 'vue'

/**
 * 智能缓存管理器
 * 提供多级缓存、智能预取、过期策略等高级功能
 */
export interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
  hit: number
  size: number
  priority: number
  tags: string[]
}

export interface CacheConfig {
  maxSize: number          // 最大缓存大小 (MB)
  defaultTTL: number       // 默认过期时间 (ms)
  maxItems: number         // 最大缓存项数
  enablePersist: boolean   // 是否持久化
  enableMetrics: boolean   // 是否启用指标
  cleanupInterval: number  // 清理间隔 (ms)
}

export interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  evictions: number
  memoryUsage: number
}

export class SmartCacheManager {
  private cache = new Map<string, CacheItem>()
  private config: CacheConfig
  private metrics: CacheMetrics
  private cleanupTimer: number | null = null
  private prefetchQueue = new Set<string>()

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50, // 50MB
      defaultTTL: 5 * 60 * 1000, // 5分钟
      maxItems: 1000,
      enablePersist: true,
      enableMetrics: true,
      cleanupInterval: 30 * 1000, // 30秒
      ...config
    }

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0
    }

    this.startCleanup()
    this.loadFromPersist()
  }

  /**
   * 设置缓存项
   */
  set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number
      priority?: number
      tags?: string[]
      persist?: boolean
    } = {}
  ): void {
    const now = Date.now()
    const size = this.calculateSize(data)
    
    // 检查缓存空间
    this.ensureSpace(size)

    const item: CacheItem<T> = {
      data,
      timestamp: now,
      ttl: options.ttl || this.config.defaultTTL,
      hit: 0,
      size,
      priority: options.priority || 1,
      tags: options.tags || []
    }

    this.cache.set(key, item)
    this.metrics.sets++
    this.updateMemoryUsage()

    // 持久化
    if (this.config.enablePersist && options.persist !== false) {
      this.persistItem(key, item)
    }
  }

  /**
   * 获取缓存项
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined

    if (!item) {
      this.metrics.misses++
      return null
    }

    // 检查过期
    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.delete(key)
      this.metrics.misses++
      return null
    }

    // 更新访问统计
    item.hit++
    item.timestamp = now // 更新访问时间
    this.metrics.hits++

    return item.data
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    const success = this.cache.delete(key)
    if (success) {
      this.metrics.deletes++
      this.updateMemoryUsage()
      this.removePersistItem(key)
    }
    return success
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.metrics.memoryUsage = 0
    if (this.config.enablePersist) {
      localStorage.removeItem('smart-cache-data')
    }
  }

  /**
   * 批量设置
   */
  setBatch<T>(items: Array<{ key: string; data: T; options?: any }>): void {
    items.forEach(({ key, data, options }) => {
      this.set(key, data, options)
    })
  }

  /**
   * 批量获取
   */
  getBatch<T>(keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>()
    keys.forEach(key => {
      result.set(key, this.get<T>(key))
    })
    return result
  }

  /**
   * 按标签获取
   */
  getByTags<T>(tags: string[]): Map<string, T> {
    const result = new Map<string, T>()
    
    this.cache.forEach((item, key) => {
      const hasMatchingTag = tags.some(tag => item.tags.includes(tag))
      if (hasMatchingTag && !this.isExpired(item)) {
        result.set(key, item.data as T)
      }
    })

    return result
  }

  /**
   * 按标签删除
   */
  deleteByTags(tags: string[]): number {
    let deletedCount = 0
    
    this.cache.forEach((item, key) => {
      const hasMatchingTag = tags.some(tag => item.tags.includes(tag))
      if (hasMatchingTag) {
        this.delete(key)
        deletedCount++
      }
    })

    return deletedCount
  }

  /**
   * 预取数据
   */
  prefetch<T>(key: string, fetchFn: () => Promise<T>, options?: any): Promise<T> {
    // 如果已经在缓存中，直接返回
    const cached = this.get<T>(key)
    if (cached) {
      return Promise.resolve(cached)
    }

    // 如果正在预取，等待结果
    if (this.prefetchQueue.has(key)) {
      return new Promise(resolve => {
        const checkCache = () => {
          const data = this.get<T>(key)
          if (data) {
            resolve(data)
          } else {
            setTimeout(checkCache, 100)
          }
        }
        checkCache()
      })
    }

    // 开始预取
    this.prefetchQueue.add(key)
    
    return fetchFn()
      .then(data => {
        this.set(key, data, options)
        this.prefetchQueue.delete(key)
        return data
      })
      .catch(error => {
        this.prefetchQueue.delete(key)
        throw error
      })
  }

  /**
   * 智能预加载相关数据
   */
  preloadRelated(baseKey: string, relatedKeys: string[], fetchFn: (key: string) => Promise<any>): void {
    // 在后台预加载相关数据
    setTimeout(() => {
      relatedKeys.forEach(async (key) => {
        if (!this.cache.has(key)) {
          try {
            const data = await fetchFn(key)
            this.set(key, data, { priority: 0.5 }) // 较低优先级
          } catch (error) {
            console.warn(`预加载失败: ${key}`, error)
          }
        }
      })
    }, 100)
  }

  /**
   * 获取缓存统计
   */
  getMetrics(): CacheMetrics & { hitRate: number; size: number } {
    const totalRequests = this.metrics.hits + this.metrics.misses
    const hitRate = totalRequests > 0 ? this.metrics.hits / totalRequests : 0

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size
    }
  }

  /**
   * 获取缓存键列表
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 检查缓存项是否存在且未过期
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    return !!item && !this.isExpired(item)
  }

  /**
   * 更新缓存项的TTL
   */
  updateTTL(key: string, ttl: number): boolean {
    const item = this.cache.get(key)
    if (item) {
      item.ttl = ttl
      item.timestamp = Date.now()
      return true
    }
    return false
  }

  /**
   * 压缩缓存
   */
  compress(): void {
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => ({ key, item, score: this.calculateEvictionScore(item) }))
      .sort((a, b) => a.score - b.score)

    // 移除优先级最低的项目
    const removeCount = Math.max(1, Math.floor(items.length * 0.1))
    items.slice(0, removeCount).forEach(({ key }) => {
      this.delete(key)
      this.metrics.evictions++
    })
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }

  // 私有方法

  private isExpired(item: CacheItem): boolean {
    return Date.now() - item.timestamp > item.ttl
  }

  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      return 1024 // 默认1KB
    }
  }

  private calculateEvictionScore(item: CacheItem): number {
    const age = Date.now() - item.timestamp
    const ageScore = age / item.ttl
    const hitScore = 1 / (item.hit + 1)
    const priorityScore = 1 / item.priority
    
    return ageScore * 0.4 + hitScore * 0.4 + priorityScore * 0.2
  }

  private ensureSpace(requiredSize: number): void {
    const maxSizeBytes = this.config.maxSize * 1024 * 1024
    
    while (
      (this.metrics.memoryUsage + requiredSize > maxSizeBytes) ||
      (this.cache.size >= this.config.maxItems)
    ) {
      this.compress()
    }
  }

  private updateMemoryUsage(): void {
    let totalSize = 0
    this.cache.forEach(item => {
      totalSize += item.size
    })
    this.metrics.memoryUsage = totalSize
  }

  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = window.setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => {
      this.delete(key)
      this.metrics.evictions++
    })
  }

  private persistItem(key: string, item: CacheItem): void {
    if (!this.config.enablePersist) return

    try {
      const stored = JSON.parse(localStorage.getItem('smart-cache-data') || '{}')
      stored[key] = {
        ...item,
        persistedAt: Date.now()
      }
      localStorage.setItem('smart-cache-data', JSON.stringify(stored))
    } catch (error) {
      console.warn('缓存持久化失败:', error)
    }
  }

  private removePersistItem(key: string): void {
    if (!this.config.enablePersist) return

    try {
      const stored = JSON.parse(localStorage.getItem('smart-cache-data') || '{}')
      delete stored[key]
      localStorage.setItem('smart-cache-data', JSON.stringify(stored))
    } catch (error) {
      console.warn('缓存持久化删除失败:', error)
    }
  }

  private loadFromPersist(): void {
    if (!this.config.enablePersist) return

    try {
      const stored = JSON.parse(localStorage.getItem('smart-cache-data') || '{}')
      const now = Date.now()

      Object.entries(stored).forEach(([key, storedItem]: [string, any]) => {
        // 检查持久化的数据是否仍然有效
        const age = now - (storedItem.persistedAt || 0)
        if (age < storedItem.ttl) {
          const item: CacheItem = {
            ...storedItem,
            timestamp: storedItem.persistedAt || now
          }
          this.cache.set(key, item)
        }
      })

      this.updateMemoryUsage()
    } catch (error) {
      console.warn('缓存持久化加载失败:', error)
    }
  }
}

// 创建全局缓存实例
export const smartCache = new SmartCacheManager({
  maxSize: 100, // 100MB
  defaultTTL: 10 * 60 * 1000, // 10分钟
  maxItems: 2000,
  enablePersist: true,
  enableMetrics: true
})

// Vue 组合式函数
export function useSmartCache() {
  const metrics = ref(smartCache.getMetrics())
  
  const updateMetrics = () => {
    metrics.value = smartCache.getMetrics()
  }

  // 每5秒更新一次指标
  const metricsTimer = setInterval(updateMetrics, 5000)

  const cacheInfo = computed(() => ({
    ...metrics.value,
    hitRateText: `${(metrics.value.hitRate * 100).toFixed(1)}%`,
    memorySizeText: `${(metrics.value.memoryUsage / 1024 / 1024).toFixed(2)} MB`
  }))

  // 清理定时器
  const cleanup = () => {
    clearInterval(metricsTimer)
  }

  return {
    cache: smartCache,
    metrics: metrics,
    cacheInfo,
    updateMetrics,
    cleanup
  }
}