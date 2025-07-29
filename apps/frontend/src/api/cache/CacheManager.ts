/**
 * API缓存管理器
 * 提供智能缓存、压缩存储和TTL管理
 */

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  compressed: boolean
  size: number
  accessCount: number
  lastAccessed: number
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  totalHits: number
  totalMisses: number
  oldestEntry: number
  newestEntry: number
}

export interface CacheOptions {
  ttl?: number
  compress?: boolean
  priority?: 'low' | 'normal' | 'high'
  tags?: string[]
}

/**
 * LRU缓存实现，支持TTL和压缩
 */
export class ApiCacheManager {
  private cache = new Map<string, CacheEntry>()
  private accessOrder: string[] = []
  private stats = {
    hits: 0,
    misses: 0
  }

  constructor(
    private maxSize: number = 100,
    private defaultTTL: number = 5 * 60 * 1000,
    private enableCompression: boolean = true
  ) {}

  /**
   * 获取缓存数据
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }

    // 检查TTL
    if (this.isExpired(entry)) {
      this.delete(key)
      this.stats.misses++
      return null
    }

    // 更新访问统计
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.moveToEnd(key)
    this.stats.hits++

    // 解压缩数据
    return entry.compressed ? this.decompress(entry.data) : entry.data
  }

  /**
   * 设置缓存数据
   */
  public set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const now = Date.now()
    const ttl = options.ttl || this.defaultTTL
    const shouldCompress = options.compress !== false && this.enableCompression && this.shouldCompress(data)
    
    // 压缩数据
    const processedData = shouldCompress ? this.compress(data) : data
    const dataSize = this.calculateSize(processedData)

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: now,
      ttl,
      compressed: shouldCompress,
      size: dataSize,
      accessCount: 1,
      lastAccessed: now
    }

    // 如果缓存已满，移除最少使用的条目
    this.evictIfNecessary()

    this.cache.set(key, entry)
    this.accessOrder.push(key)
  }

  /**
   * 删除缓存条目
   */
  public delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.accessOrder = this.accessOrder.filter(k => k !== key)
    }
    return deleted
  }

  /**
   * 清空缓存
   */
  public clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * 检查是否存在且未过期
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (this.isExpired(entry)) {
      this.delete(key)
      return false
    }
    
    return true
  }

  /**
   * 批量删除带标签的缓存
   */
  public deleteByTag(tag: string): number {
    let deletedCount = 0
    const keysToDelete: string[] = []

    // 在实际应用中，需要存储key到tag的映射
    // 这里简化处理，通过key名称匹配
    for (const key of this.cache.keys()) {
      if (key.includes(tag)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      if (this.delete(key)) {
        deletedCount++
      }
    })

    return deletedCount
  }

  /**
   * 获取缓存统计
   */
  public getStats(): CacheStats {
    let totalSize = 0
    let oldestEntry = Date.now()
    let newestEntry = 0

    for (const entry of this.cache.values()) {
      totalSize += entry.size
      oldestEntry = Math.min(oldestEntry, entry.timestamp)
      newestEntry = Math.max(newestEntry, entry.timestamp)
    }

    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry,
      newestEntry
    }
  }

  /**
   * 清理过期条目
   */
  public cleanup(): number {
    const now = Date.now()
    let cleanedCount = 0
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      if (this.delete(key)) {
        cleanedCount++
      }
    })

    return cleanedCount
  }

  /**
   * 设置自动清理定时器
   */
  public startAutoCleanup(intervalMs: number = 60000): () => void {
    const timer = setInterval(() => {
      const cleaned = this.cleanup()
      if (cleaned > 0) {
        console.log(`API缓存自动清理: 移除 ${cleaned} 个过期条目`)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }

  /**
   * 预热缓存
   */
  public async preheat(entries: Array<{ key: string; fetcher: () => Promise<any>; options?: CacheOptions }>): Promise<void> {
    const promises = entries.map(async ({ key, fetcher, options }) => {
      try {
        if (!this.has(key)) {
          const data = await fetcher()
          this.set(key, data, options)
        }
      } catch (error) {
        console.warn(`缓存预热失败 ${key}:`, error)
      }
    })

    await Promise.allSettled(promises)
  }

  // 私有方法
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private moveToEnd(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index !== -1) {
      this.accessOrder.splice(index, 1)
      this.accessOrder.push(key)
    }
  }

  private evictIfNecessary(): void {
    while (this.cache.size >= this.maxSize) {
      const lruKey = this.accessOrder.shift()
      if (lruKey) {
        this.cache.delete(lruKey)
      }
    }
  }

  private shouldCompress(data: any): boolean {
    // 只压缩较大的对象或数组
    const size = this.calculateSize(data)
    return size > 1024 // 大于1KB才压缩
  }

  private compress(data: any): string {
    try {
      // 简单的JSON压缩（在实际应用中可以使用更好的压缩算法）
      return JSON.stringify(data)
    } catch {
      return data
    }
  }

  private decompress(compressedData: string): any {
    try {
      return JSON.parse(compressedData)
    } catch {
      return compressedData
    }
  }

  private calculateSize(data: any): number {
    // 简单的大小计算
    if (typeof data === 'string') {
      return data.length * 2 // UTF-16
    }
    
    try {
      return JSON.stringify(data).length * 2
    } catch {
      return 1000 // 默认大小
    }
  }
}

// 创建全局缓存实例
export const apiCacheManager = new ApiCacheManager()