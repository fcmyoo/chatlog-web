/**
 * 性能管理器
 * 集成请求队列和响应缓存，提供统一的性能优化接口
 */

const { RequestQueue, Priority } = require('./RequestQueue')
const { ResponseCache, CacheStrategy } = require('./ResponseCache')
const EventEmitter = require('events')

/**
 * 性能优化级别
 */
const OptimizationLevel = {
  DISABLED: 'disabled',
  BASIC: 'basic',
  STANDARD: 'standard',
  AGGRESSIVE: 'aggressive'
}

/**
 * 统一性能管理器
 */
class PerformanceManager extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      level: options.level || OptimizationLevel.STANDARD,
      enableQueue: options.enableQueue !== false,
      enableCache: options.enableCache !== false,
      enableMetrics: options.enableMetrics !== false,
      ...options
    }

    // 初始化组件
    this.requestQueue = null
    this.responseCache = null
    this.metrics = this.initMetrics()
    
    // 启动状态
    this.isStarted = false

    this.init()
  }

  /**
   * 初始化性能管理器
   */
  init() {
    if (this.options.level === OptimizationLevel.DISABLED) {
      console.log('📈 性能优化已禁用')
      return
    }

    const config = this.getConfigForLevel(this.options.level)

    // 初始化请求队列
    if (this.options.enableQueue) {
      this.requestQueue = new RequestQueue(config.queue)
      this.setupQueueEvents()
    }

    // 初始化响应缓存
    if (this.options.enableCache) {
      this.responseCache = new ResponseCache(config.cache)
      this.setupCacheEvents()
    }

    this.isStarted = true
    console.log(`📈 性能管理器已启动 (级别: ${this.options.level})`)
  }

  /**
   * 根据优化级别获取配置
   */
  getConfigForLevel(level) {
    const configs = {
      [OptimizationLevel.BASIC]: {
        queue: {
          maxConcurrent: 2,
          strategy: 'priority',
          timeout: 30000
        },
        cache: {
          maxSize: 50 * 1024 * 1024, // 50MB
          maxItems: 5000,
          defaultTTL: 5 * 60 * 1000, // 5分钟
          strategy: CacheStrategy.LRU
        }
      },
      [OptimizationLevel.STANDARD]: {
        queue: {
          maxConcurrent: 3,
          strategy: 'priority',
          timeout: 30000,
          enableMetrics: true
        },
        cache: {
          maxSize: 100 * 1024 * 1024, // 100MB
          maxItems: 10000,
          defaultTTL: 5 * 60 * 1000,
          strategy: CacheStrategy.ADAPTIVE,
          enableCompression: true
        }
      },
      [OptimizationLevel.AGGRESSIVE]: {
        queue: {
          maxConcurrent: 5,
          strategy: 'weighted',
          timeout: 45000,
          enableMetrics: true,
          retryDelay: 500
        },
        cache: {
          maxSize: 200 * 1024 * 1024, // 200MB
          maxItems: 20000,
          defaultTTL: 10 * 60 * 1000,
          strategy: CacheStrategy.ADAPTIVE,
          enableCompression: true,
          warmupEnabled: true
        }
      }
    }

    return configs[level] || configs[OptimizationLevel.STANDARD]
  }

  /**
   * 设置队列事件监听
   */
  setupQueueEvents() {
    this.requestQueue.on('itemCompleted', (item, result) => {
      this.metrics.queueMetrics.completed++
      this.emit('requestCompleted', item, result)
    })

    this.requestQueue.on('itemFailed', (item, error) => {
      this.metrics.queueMetrics.failed++
      this.emit('requestFailed', item, error)
    })

    this.requestQueue.on('metricsUpdated', (metrics) => {
      this.metrics.queueMetrics = { ...this.metrics.queueMetrics, ...metrics }
      this.emit('metricsUpdated', this.getMetrics())
    })
  }

  /**
   * 设置缓存事件监听
   */
  setupCacheEvents() {
    this.responseCache.on('hit', (key, item) => {
      this.metrics.cacheMetrics.hits++
      this.emit('cacheHit', key, item)
    })

    this.responseCache.on('miss', (key) => {
      this.metrics.cacheMetrics.misses++
      this.emit('cacheMiss', key)
    })

    this.responseCache.on('metrics', (metrics) => {
      this.metrics.cacheMetrics = { ...this.metrics.cacheMetrics, ...metrics }
      this.emit('metricsUpdated', this.getMetrics())
    })
  }

  /**
   * 初始化指标
   */
  initMetrics() {
    return {
      startTime: Date.now(),
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        cached: 0,
        queued: 0
      },
      performance: {
        averageResponseTime: 0,
        throughput: 0,
        errorRate: 0,
        cacheHitRate: 0
      },
      queueMetrics: {
        completed: 0,
        failed: 0,
        pending: 0,
        processing: 0
      },
      cacheMetrics: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        memoryUsage: 0
      }
    }
  }

  /**
   * 执行优化的HTTP请求
   */
  async request(id, requestFn, options = {}) {
    if (!this.isStarted) {
      // 性能优化未启用，直接执行
      return await requestFn()
    }

    const startTime = Date.now()
    this.metrics.requests.total++

    try {
      // 尝试缓存获取
      if (this.responseCache && options.cache !== false) {
        const cacheKey = options.cacheKey || this.generateCacheKey(id, options)
        const cached = this.responseCache.get(cacheKey)
        
        if (cached !== null) {
          this.metrics.requests.cached++
          this.updatePerformanceMetrics(startTime)
          return cached
        }

        // 缓存未命中，通过队列执行请求
        const result = await this.executeWithQueue(id, requestFn, options)
        
        // 缓存结果
        this.responseCache.set(cacheKey, result, {
          ttl: options.ttl,
          tags: options.tags,
          priority: options.priority
        })

        return result
      } else {
        // 仅使用队列，不使用缓存
        return await this.executeWithQueue(id, requestFn, options)
      }

    } catch (error) {
      this.metrics.requests.failed++
      throw error
    } finally {
      this.updatePerformanceMetrics(startTime)
    }
  }

  /**
   * 通过队列执行请求
   */
  async executeWithQueue(id, requestFn, options = {}) {
    if (!this.requestQueue) {
      return await requestFn()
    }

    this.metrics.requests.queued++
    
    return await this.requestQueue.add(id, requestFn, {
      priority: this.mapPriority(options.priority),
      timeout: options.timeout,
      retries: options.retries,
      maxRetries: options.maxRetries,
      metadata: options.metadata
    })
  }

  /**
   * 映射优先级
   */
  mapPriority(priority) {
    const mapping = {
      'critical': Priority.CRITICAL,
      'high': Priority.HIGH,
      'normal': Priority.NORMAL,
      'low': Priority.LOW
    }
    return mapping[priority] || Priority.NORMAL
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(id, options) {
    const keyData = {
      id,
      params: options.params || {},
      headers: options.headers || {}
    }
    
    const crypto = require('crypto')
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex')
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(startTime) {
    const responseTime = Date.now() - startTime
    
    // 更新平均响应时间
    this.metrics.performance.averageResponseTime = 
      (this.metrics.performance.averageResponseTime * 0.9) + (responseTime * 0.1)
    
    // 更新成功率
    this.metrics.requests.successful = 
      this.metrics.requests.total - this.metrics.requests.failed
    
    // 更新错误率
    this.metrics.performance.errorRate = 
      this.metrics.requests.total > 0 
        ? this.metrics.requests.failed / this.metrics.requests.total 
        : 0
    
    // 更新缓存命中率
    const totalCacheRequests = this.metrics.cacheMetrics.hits + this.metrics.cacheMetrics.misses
    this.metrics.performance.cacheHitRate = 
      totalCacheRequests > 0 
        ? this.metrics.cacheMetrics.hits / totalCacheRequests 
        : 0

    // 更新吞吐量
    const uptime = Date.now() - this.metrics.startTime
    this.metrics.performance.throughput = 
      (this.metrics.requests.successful / uptime) * 1000 // 每秒请求数
  }

  /**
   * 预热缓存
   */
  async warmupCache(items) {
    if (!this.responseCache || !this.responseCache.options.warmupEnabled) {
      console.log('⚡ 缓存预热已禁用')
      return
    }

    console.log(`⚡ 开始缓存预热: ${items.length} 个项目`)
    await this.responseCache.warmup(items)
  }

  /**
   * 批量请求优化
   */
  async batchRequest(requests, options = {}) {
    const batchSize = options.batchSize || 5
    const delay = options.delay || 100
    const results = []

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize)
      
      const batchPromises = batch.map(req => 
        this.request(req.id, req.fn, req.options)
      )

      try {
        const batchResults = await Promise.allSettled(batchPromises)
        results.push(...batchResults)
        
        // 批次间延迟
        if (i + batchSize < requests.length && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error('批量请求失败:', error)
        throw error
      }
    }

    return results
  }

  /**
   * 获取完整指标
   */
  getMetrics() {
    const queueStatus = this.requestQueue ? this.requestQueue.getStatus() : null
    const cacheStatus = this.responseCache ? this.responseCache.getStatus() : null

    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      queue: queueStatus,
      cache: cacheStatus,
      optimization: {
        level: this.options.level,
        queueEnabled: !!this.requestQueue,
        cacheEnabled: !!this.responseCache
      }
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    const metrics = this.getMetrics()
    
    return {
      summary: {
        totalRequests: metrics.requests.total,
        successRate: metrics.requests.total > 0 
          ? (metrics.requests.successful / metrics.requests.total * 100).toFixed(2) + '%'
          : '0%',
        cacheHitRate: (metrics.performance.cacheHitRate * 100).toFixed(2) + '%',
        averageResponseTime: Math.round(metrics.performance.averageResponseTime) + 'ms',
        throughput: metrics.performance.throughput.toFixed(2) + ' req/s'
      },
      details: metrics,
      recommendations: this.generateRecommendations(metrics)
    }
  }

  /**
   * 生成性能建议
   */
  generateRecommendations(metrics) {
    const recommendations = []

    // 错误率建议
    if (metrics.performance.errorRate > 0.1) {
      recommendations.push({
        type: 'error_rate',
        severity: 'high',
        message: `错误率过高 (${(metrics.performance.errorRate * 100).toFixed(1)}%)，建议检查请求重试配置`
      })
    }

    // 缓存命中率建议
    if (metrics.performance.cacheHitRate < 0.6) {
      recommendations.push({
        type: 'cache_hit_rate',
        severity: 'medium',
        message: `缓存命中率较低 (${(metrics.performance.cacheHitRate * 100).toFixed(1)}%)，建议调整缓存策略或TTL`
      })
    }

    // 响应时间建议
    if (metrics.performance.averageResponseTime > 1000) {
      recommendations.push({
        type: 'response_time',
        severity: 'medium',
        message: `平均响应时间较高 (${Math.round(metrics.performance.averageResponseTime)}ms)，建议检查网络或服务性能`
      })
    }

    // 队列积压建议
    if (metrics.queue && metrics.queue.queued > 10) {
      recommendations.push({
        type: 'queue_backlog',
        severity: 'high',
        message: `请求队列积压严重 (${metrics.queue.queued} 个请求)，建议增加并发数或优化处理速度`
      })
    }

    return recommendations
  }

  /**
   * 清理资源
   */
  cleanup() {
    if (this.requestQueue) {
      this.requestQueue.stop()
    }
    
    if (this.responseCache) {
      this.responseCache.stop()
    }

    this.isStarted = false
    console.log('📈 性能管理器已停止')
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics = this.initMetrics()
    
    if (this.requestQueue) {
      this.requestQueue.metrics = this.requestQueue.initMetrics()
    }
    
    if (this.responseCache) {
      this.responseCache.resetStats()
    }

    console.log('📊 性能指标已重置')
  }
}

module.exports = {
  PerformanceManager,
  OptimizationLevel,
  Priority
}