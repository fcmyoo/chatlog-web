/**
 * 智能响应缓存系统
 * 实现多级缓存、TTL管理、LRU淘汰和缓存预热
 */

const EventEmitter = require('events')
const crypto = require('crypto')

/**
 * 缓存策略
 */
const CacheStrategy = {
  LRU: 'lru',           // 最近最少使用
  LFU: 'lfu',           // 最不经常使用
  FIFO: 'fifo',         // 先进先出
  TTL: 'ttl',           // 基于时间
  ADAPTIVE: 'adaptive'   // 自适应
}

/**
 * 缓存项
 */
class CacheItem {
  constructor(key, value, options = {}) {
    this.key = key
    this.value = value
    this.size = options.size || this.calculateSize(value)
    this.ttl = options.ttl || 0
    this.priority = options.priority || 1
    this.tags = options.tags || []
    this.metadata = options.metadata || {}
    
    this.createdAt = Date.now()
    this.accessedAt = Date.now()
    this.accessCount = 1
    this.hitCount = 0
    this.lastModified = Date.now()
    
    // TTL 设置
    if (this.ttl > 0) {
      this.expiresAt = this.createdAt + this.ttl
    } else {
      this.expiresAt = null
    }
  }

  /**
   * 计算数据大小
   */
  calculateSize(data) {
    if (data === null || data === undefined) return 0
    if (typeof data === 'string') return data.length * 2 // UTF-16
    if (typeof data === 'number') return 8
    if (typeof data === 'boolean') return 4
    if (Buffer.isBuffer(data)) return data.length
    
    try {
      return JSON.stringify(data).length * 2
    } catch {
      return 1024 // 默认1KB
    }
  }

  /**
   * 检查是否过期
   */
  isExpired() {
    if (!this.expiresAt) return false
    return Date.now() > this.expiresAt
  }

  /**
   * 更新访问信息
   */
  touch() {
    this.accessedAt = Date.now()
    this.accessCount++
    this.hitCount++
  }

  /**
   * 更新数据
   */
  update(value, options = {}) {
    this.value = value
    this.size = options.size || this.calculateSize(value)
    this.lastModified = Date.now()
    
    if (options.ttl !== undefined) {
      this.ttl = options.ttl
      if (this.ttl > 0) {
        this.expiresAt = Date.now() + this.ttl
      } else {
        this.expiresAt = null
      }
    }
  }

  /**
   * 获取缓存项年龄
   */
  getAge() {
    return Date.now() - this.createdAt
  }

  /**
   * 获取缓存项得分（用于淘汰算法）
   */
  getScore(strategy) {
    const now = Date.now()
    
    switch (strategy) {
      case CacheStrategy.LRU:
        return now - this.accessedAt // 越大越应该淘汰
        
      case CacheStrategy.LFU:
        return -this.accessCount // 越小越应该淘汰
        
      case CacheStrategy.FIFO:
        return this.createdAt // 越小越应该淘汰
        
      case CacheStrategy.TTL:
        return this.expiresAt ? this.expiresAt - now : Infinity
        
      case CacheStrategy.ADAPTIVE:
        // 综合考虑访问频率、时间和优先级
        const ageScore = (now - this.accessedAt) / 1000 // 秒
        const frequencyScore = Math.max(1, this.accessCount)
        const priorityScore = this.priority
        return ageScore / (frequencyScore * priorityScore)
        
      default:
        return now - this.accessedAt
    }
  }
}

/**
 * 智能响应缓存
 */
class ResponseCache extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      maxSize: options.maxSize || 100 * 1024 * 1024, // 100MB
      maxItems: options.maxItems || 10000,
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5分钟
      strategy: options.strategy || CacheStrategy.ADAPTIVE,
      enableCompression: options.enableCompression !== false,
      enableMetrics: options.enableMetrics !== false,
      cleanupInterval: options.cleanupInterval || 60000, // 1分钟
      warmupEnabled: options.warmupEnabled !== false,
      serializer: options.serializer || JSON,
      keyGenerator: options.keyGenerator || this.defaultKeyGenerator,
      ...options
    }

    // 缓存存储
    this.cache = new Map()
    this.accessOrder = new Map() // LRU链表模拟
    this.sizeIndex = new Map()   // 按大小索引
    this.tagIndex = new Map()    // 按标签索引
    
    // 缓存统计
    this.stats = this.initStats()
    
    // 当前使用的内存大小
    this.currentSize = 0
    
    // 定时器
    this.cleanupTimer = null
    this.metricsTimer = null
    
    // 预热队列
    this.warmupQueue = []
    this.isWarming = false
    
    this.startCleanup()
    this.startMetrics()
  }

  /**
   * 初始化统计信息
   */
  initStats() {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      hitRate: 0,
      avgResponseTime: 0,
      memoryUsage: 0,
      itemCount: 0,
      lastReset: Date.now()
    }
  }

  /**
   * 默认键生成器
   */
  defaultKeyGenerator(request) {
    const { url, method = 'GET', body, headers = {} } = request
    const relevantHeaders = ['authorization', 'accept', 'content-type']
    
    const keyData = {
      method,
      url,
      body: body ? crypto.createHash('md5').update(JSON.stringify(body)).digest('hex') : null,
      headers: Object.fromEntries(
        Object.entries(headers)
          .filter(([key]) => relevantHeaders.includes(key.toLowerCase()))
      )
    }
    
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex')
  }

  /**
   * 获取缓存
   */
  get(key, options = {}) {
    const startTime = Date.now()
    
    try {
      const item = this.cache.get(key)
      
      if (!item) {
        this.stats.misses++
        this.emit('miss', key)
        return null
      }

      // 检查过期
      if (item.isExpired()) {
        this.delete(key)
        this.stats.misses++
        this.emit('miss', key)
        return null
      }

      // 更新访问信息
      item.touch()
      this.updateAccessOrder(key)
      
      this.stats.hits++
      this.updateHitRate()
      
      const responseTime = Date.now() - startTime
      this.updateAverageResponseTime(responseTime)
      
      this.emit('hit', key, item)
      
      // 返回副本以防止外部修改
      return options.clone !== false ? this.cloneValue(item.value) : item.value
      
    } catch (error) {
      console.error('缓存获取失败:', error)
      this.stats.misses++
      return null
    }
  }

  /**
   * 设置缓存
   */
  async set(key, value, options = {}) {
    try {
      const ttl = options.ttl || this.options.defaultTTL
      const item = new CacheItem(key, value, { ...options, ttl })
      
      // 检查是否需要压缩
      if (this.options.enableCompression && item.size > 1024) {
        item.value = this.compress(item.value)
        item.compressed = true
      }

      // 更新现有项还是新增
      const existingItem = this.cache.get(key)
      if (existingItem) {
        this.currentSize -= existingItem.size
        this.removeFromIndexes(key, existingItem)
      }

      // 检查容量限制
      await this.ensureCapacity(item.size)

      // 设置缓存
      this.cache.set(key, item)
      this.currentSize += item.size
      this.updateAccessOrder(key)
      this.addToIndexes(key, item)
      
      this.stats.sets++
      this.updateStats()
      
      this.emit('set', key, item)
      
      return true
      
    } catch (error) {
      console.error('缓存设置失败:', error)
      return false
    }
  }

  /**
   * 删除缓存
   */
  delete(key) {
    const item = this.cache.get(key)
    if (!item) {
      return false
    }

    this.cache.delete(key)
    this.currentSize -= item.size
    this.accessOrder.delete(key)
    this.removeFromIndexes(key, item)
    
    this.stats.deletes++
    this.updateStats()
    
    this.emit('delete', key, item)
    
    return true
  }

  /**
   * 批量删除（按标签）
   */
  deleteByTag(tag) {
    const keys = this.tagIndex.get(tag) || new Set()
    let deletedCount = 0
    
    for (const key of keys) {
      if (this.delete(key)) {
        deletedCount++
      }
    }
    
    this.tagIndex.delete(tag)
    
    this.emit('deleteByTag', tag, deletedCount)
    return deletedCount
  }

  /**
   * 清空缓存
   */
  clear() {
    const itemCount = this.cache.size
    
    this.cache.clear()
    this.accessOrder.clear()
    this.sizeIndex.clear()
    this.tagIndex.clear()
    this.currentSize = 0
    
    this.updateStats()
    
    this.emit('clear', itemCount)
    return itemCount
  }

  /**
   * 检查键是否存在
   */
  has(key) {
    const item = this.cache.get(key)
    return item && !item.isExpired()
  }

  /**
   * 获取或设置缓存（如果不存在则调用生成函数）
   */
  async getOrSet(key, generator, options = {}) {
    const cached = this.get(key)
    if (cached !== null) {
      return cached
    }

    try {
      const value = await generator()
      await this.set(key, value, options)
      return value
    } catch (error) {
      this.emit('generatorError', key, error)
      throw error
    }
  }

  /**
   * 预热缓存
   */
  async warmup(items) {
    if (!this.options.warmupEnabled) {
      return
    }

    this.warmupQueue.push(...items)
    
    if (!this.isWarming) {
      await this.processWarmupQueue()
    }
  }

  /**
   * 处理预热队列
   */
  async processWarmupQueue() {
    if (this.isWarming || this.warmupQueue.length === 0) {
      return
    }

    this.isWarming = true
    this.emit('warmupStarted', this.warmupQueue.length)
    
    try {
      while (this.warmupQueue.length > 0) {
        const item = this.warmupQueue.shift()
        
        try {
          if (typeof item === 'function') {
            await item()
          } else if (item.key && item.generator) {
            await this.getOrSet(item.key, item.generator, item.options)
          }
        } catch (error) {
          console.warn('预热项目失败:', error)
        }
        
        // 避免阻塞
        await new Promise(resolve => setImmediate(resolve))
      }
      
      this.emit('warmupCompleted')
      
    } finally {
      this.isWarming = false
    }
  }

  /**
   * 确保容量足够
   */
  async ensureCapacity(requiredSize) {
    // 检查项目数量限制
    if (this.cache.size >= this.options.maxItems) {
      await this.evictItems(Math.ceil(this.options.maxItems * 0.1)) // 淘汰10%
    }

    // 检查内存限制
    while (this.currentSize + requiredSize > this.options.maxSize) {
      const evicted = await this.evictOne()
      if (!evicted) {
        throw new Error('无法释放足够的缓存空间')
      }
    }
  }

  /**
   * 淘汰一个缓存项
   */
  async evictOne() {
    if (this.cache.size === 0) {
      return false
    }

    const candidates = Array.from(this.cache.entries())
    
    // 首先清理过期项
    for (const [key, item] of candidates) {
      if (item.isExpired()) {
        this.delete(key)
        this.stats.evictions++
        return true
      }
    }

    // 按策略选择淘汰项
    const keyToEvict = this.selectEvictionCandidate(candidates)
    if (keyToEvict) {
      this.delete(keyToEvict)
      this.stats.evictions++
      return true
    }

    return false
  }

  /**
   * 淘汰多个缓存项
   */
  async evictItems(count) {
    for (let i = 0; i < count; i++) {
      const evicted = await this.evictOne()
      if (!evicted) {
        break
      }
    }
  }

  /**
   * 选择淘汰候选项
   */
  selectEvictionCandidate(candidates) {
    if (candidates.length === 0) {
      return null
    }

    // 按策略排序
    candidates.sort(([keyA, itemA], [keyB, itemB]) => {
      const scoreA = itemA.getScore(this.options.strategy)
      const scoreB = itemB.getScore(this.options.strategy)
      
      if (this.options.strategy === CacheStrategy.LFU) {
        return scoreA - scoreB // LFU: 最小值优先
      } else {
        return scoreB - scoreA // 其他: 最大值优先
      }
    })

    return candidates[0][0]
  }

  /**
   * 更新访问顺序
   */
  updateAccessOrder(key) {
    // 简化的LRU实现
    if (this.accessOrder.has(key)) {
      this.accessOrder.delete(key)
    }
    this.accessOrder.set(key, Date.now())
  }

  /**
   * 添加到索引
   */
  addToIndexes(key, item) {
    // 大小索引
    if (!this.sizeIndex.has(item.size)) {
      this.sizeIndex.set(item.size, new Set())
    }
    this.sizeIndex.get(item.size).add(key)

    // 标签索引
    for (const tag of item.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag).add(key)
    }
  }

  /**
   * 从索引中移除
   */
  removeFromIndexes(key, item) {
    // 大小索引
    const sizeSet = this.sizeIndex.get(item.size)
    if (sizeSet) {
      sizeSet.delete(key)
      if (sizeSet.size === 0) {
        this.sizeIndex.delete(item.size)
      }
    }

    // 标签索引
    for (const tag of item.tags) {
      const tagSet = this.tagIndex.get(tag)
      if (tagSet) {
        tagSet.delete(key)
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag)
        }
      }
    }
  }

  /**
   * 更新命中率
   */
  updateHitRate() {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }

  /**
   * 更新平均响应时间
   */
  updateAverageResponseTime(responseTime) {
    // 简化的移动平均
    this.stats.avgResponseTime = 
      (this.stats.avgResponseTime * 0.9) + (responseTime * 0.1)
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    this.stats.memoryUsage = this.currentSize
    this.stats.itemCount = this.cache.size
  }

  /**
   * 压缩数据
   */
  compress(data) {
    // 这里可以实现真正的压缩算法
    // 简化实现：只压缩字符串
    if (typeof data === 'string') {
      return Buffer.from(data, 'utf8').toString('base64')
    }
    return data
  }

  /**
   * 解压数据
   */
  decompress(data) {
    // 对应compress的解压实现
    if (typeof data === 'string') {
      try {
        return Buffer.from(data, 'base64').toString('utf8')
      } catch {
        return data
      }
    }
    return data
  }

  /**
   * 克隆值
   */
  cloneValue(value) {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return value
    }
  }

  /**
   * 开始清理
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.options.cleanupInterval)
  }

  /**
   * 清理过期项
   */
  cleanup() {
    const startTime = Date.now()
    let expiredCount = 0

    for (const [key, item] of this.cache) {
      if (item.isExpired()) {
        this.delete(key)
        expiredCount++
      }
    }

    const cleanupTime = Date.now() - startTime
    
    if (expiredCount > 0) {
      console.log(`🧹 缓存清理完成: 删除 ${expiredCount} 个过期项，耗时 ${cleanupTime}ms`)
    }

    this.emit('cleanup', { expiredCount, cleanupTime })
  }

  /**
   * 开始指标收集
   */
  startMetrics() {
    if (!this.options.enableMetrics) {
      return
    }

    this.metricsTimer = setInterval(() => {
      this.updateStats()
      this.emit('metrics', this.getMetrics())
    }, 10000) // 每10秒更新一次指标
  }

  /**
   * 获取缓存指标
   */
  getMetrics() {
    return {
      ...this.stats,
      memoryUsage: this.currentSize,
      memoryUsagePercent: (this.currentSize / this.options.maxSize) * 100,
      itemCount: this.cache.size,
      itemUsagePercent: (this.cache.size / this.options.maxItems) * 100,
      avgItemSize: this.cache.size > 0 ? this.currentSize / this.cache.size : 0
    }
  }

  /**
   * 获取缓存状态
   */
  getStatus() {
    return {
      enabled: true,
      strategy: this.options.strategy,
      metrics: this.getMetrics(),
      configuration: {
        maxSize: this.options.maxSize,
        maxItems: this.options.maxItems,
        defaultTTL: this.options.defaultTTL,
        enableCompression: this.options.enableCompression,
        warmupEnabled: this.options.warmupEnabled
      },
      indexes: {
        sizeIndex: this.sizeIndex.size,
        tagIndex: this.tagIndex.size,
        accessOrder: this.accessOrder.size
      }
    }
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = this.initStats()
    this.emit('statsReset')
  }

  /**
   * 停止缓存
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
      this.metricsTimer = null
    }

    this.emit('stopped')
  }
}

module.exports = {
  ResponseCache,
  CacheStrategy,
  CacheItem
}