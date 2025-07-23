/**
 * Express性能优化中间件
 * 为AI服务提供请求队列和缓存功能
 */

const { PerformanceManager, OptimizationLevel } = require('./PerformanceManager')

/**
 * 性能中间件工厂
 */
function createPerformanceMiddleware(options = {}) {
  const performanceManager = new PerformanceManager({
    level: options.level || OptimizationLevel.STANDARD,
    enableQueue: options.enableQueue !== false,
    enableCache: options.enableCache !== false,
    enableMetrics: options.enableMetrics !== false,
    ...options
  })

  // 设置事件监听
  performanceManager.on('requestCompleted', (item, result) => {
    console.log(`🚀 请求完成: ${item.id} (${item.getExecutionTime()}ms)`)
  })

  performanceManager.on('requestFailed', (item, error) => {
    console.error(`❌ 请求失败: ${item.id} - ${error.message}`)
  })

  /**
   * Express中间件函数
   */
  const middleware = async (req, res, next) => {
    // 为请求添加性能管理器
    req.performanceManager = performanceManager
    
    // 添加优化请求方法
    req.optimizedRequest = async (id, requestFn, options = {}) => {
      return await performanceManager.request(id, requestFn, {
        ...options,
        headers: req.headers,
        params: req.params,
        query: req.query
      })
    }

    // 添加批量请求方法
    req.batchRequest = async (requests, options = {}) => {
      return await performanceManager.batchRequest(requests, options)
    }

    next()
  }

  // 添加管理方法到中间件
  middleware.getMetrics = () => performanceManager.getMetrics()
  middleware.getReport = () => performanceManager.getPerformanceReport()
  middleware.warmupCache = (items) => performanceManager.warmupCache(items)
  middleware.cleanup = () => performanceManager.cleanup()
  middleware.resetMetrics = () => performanceManager.resetMetrics()

  return middleware
}

/**
 * AI服务专用性能中间件
 */
function createAIServiceMiddleware(config = {}) {
  const options = {
    level: config.optimization?.level || OptimizationLevel.STANDARD,
    enableQueue: config.performance?.enableQueue !== false,
    enableCache: config.performance?.enableCache !== false,
    enableMetrics: config.monitoring?.metrics?.enabled !== false,
    
    // 队列配置
    maxConcurrent: config.performance?.maxConcurrent || 3,
    strategy: 'priority',
    timeout: config.performance?.timeout || 30000,
    
    // 缓存配置
    maxSize: config.performance?.cache?.maxSize || 100 * 1024 * 1024, // 100MB
    maxItems: config.performance?.cache?.maxItems || 10000,
    defaultTTL: config.performance?.cache?.ttl || 5 * 60 * 1000, // 5分钟
    
    ...config.performance
  }

  const middleware = createPerformanceMiddleware(options)

  // AI服务特定的预热逻辑
  const warmupAICache = async () => {
    const commonPrompts = [
      {
        key: 'health_check',
        generator: async () => ({ status: 'healthy', timestamp: Date.now() })
      },
      {
        key: 'model_info',
        generator: async () => ({ 
          models: ['gpt-3.5-turbo', 'gemini-pro'], 
          timestamp: Date.now() 
        })
      }
    ]

    await middleware.warmupCache(commonPrompts)
    console.log('🔥 AI服务缓存预热完成')
  }

  // 在启动时进行预热
  setTimeout(warmupAICache, 1000)

  return middleware
}

/**
 * 性能监控端点中间件
 */
function createMetricsEndpoint(performanceMiddleware) {
  return (req, res) => {
    try {
      const format = req.query.format || 'json'
      
      if (format === 'prometheus') {
        // Prometheus格式指标
        const metrics = performanceMiddleware.getMetrics()
        const prometheusMetrics = convertToPrometheus(metrics)
        
        res.set('Content-Type', 'text/plain')
        res.send(prometheusMetrics)
        
      } else if (format === 'report') {
        // 详细报告
        const report = performanceMiddleware.getReport()
        res.json(report)
        
      } else {
        // 默认JSON格式
        const metrics = performanceMiddleware.getMetrics()
        res.json(metrics)
      }
      
    } catch (error) {
      console.error('获取性能指标失败:', error)
      res.status(500).json({ 
        error: '获取性能指标失败', 
        message: error.message 
      })
    }
  }
}

/**
 * 转换为Prometheus格式
 */
function convertToPrometheus(metrics) {
  const lines = []
  
  // 请求指标
  lines.push(`# HELP http_requests_total Total number of HTTP requests`)
  lines.push(`# TYPE http_requests_total counter`)
  lines.push(`http_requests_total ${metrics.requests.total}`)
  
  lines.push(`# HELP http_requests_successful Successful HTTP requests`)
  lines.push(`# TYPE http_requests_successful counter`)
  lines.push(`http_requests_successful ${metrics.requests.successful}`)
  
  lines.push(`# HELP http_requests_failed Failed HTTP requests`)
  lines.push(`# TYPE http_requests_failed counter`)
  lines.push(`http_requests_failed ${metrics.requests.failed}`)
  
  // 性能指标
  lines.push(`# HELP http_request_duration_ms Average request duration in milliseconds`)
  lines.push(`# TYPE http_request_duration_ms gauge`)
  lines.push(`http_request_duration_ms ${metrics.performance.averageResponseTime}`)
  
  lines.push(`# HELP http_requests_per_second Request throughput per second`)
  lines.push(`# TYPE http_requests_per_second gauge`)
  lines.push(`http_requests_per_second ${metrics.performance.throughput}`)
  
  // 缓存指标
  if (metrics.cache) {
    lines.push(`# HELP cache_hits_total Total cache hits`)
    lines.push(`# TYPE cache_hits_total counter`)
    lines.push(`cache_hits_total ${metrics.cacheMetrics.hits}`)
    
    lines.push(`# HELP cache_misses_total Total cache misses`)
    lines.push(`# TYPE cache_misses_total counter`)
    lines.push(`cache_misses_total ${metrics.cacheMetrics.misses}`)
    
    lines.push(`# HELP cache_hit_rate Cache hit rate`)
    lines.push(`# TYPE cache_hit_rate gauge`)
    lines.push(`cache_hit_rate ${metrics.performance.cacheHitRate}`)
  }
  
  // 队列指标
  if (metrics.queue) {
    lines.push(`# HELP queue_size Current queue size`)
    lines.push(`# TYPE queue_size gauge`)
    lines.push(`queue_size ${metrics.queue.queued}`)
    
    lines.push(`# HELP queue_processing Current processing requests`)
    lines.push(`# TYPE queue_processing gauge`)
    lines.push(`queue_processing ${metrics.queue.running}`)
  }
  
  return lines.join('\n') + '\n'
}

/**
 * 性能健康检查中间件
 */
function createHealthCheck(performanceMiddleware) {
  return (req, res) => {
    try {
      const metrics = performanceMiddleware.getMetrics()
      const report = performanceMiddleware.getReport()
      
      // 健康状态检查
      const health = {
        status: 'healthy',
        timestamp: Date.now(),
        uptime: metrics.uptime,
        checks: {
          performance: checkPerformanceHealth(metrics),
          queue: checkQueueHealth(metrics.queue),
          cache: checkCacheHealth(metrics.cache)
        }
      }
      
      // 确定总体状态
      const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy')
      health.status = allHealthy ? 'healthy' : 'degraded'
      
      // 添加建议
      health.recommendations = report.recommendations
      
      const statusCode = health.status === 'healthy' ? 200 : 503
      res.status(statusCode).json(health)
      
    } catch (error) {
      console.error('健康检查失败:', error)
      res.status(500).json({
        status: 'unhealthy',
        timestamp: Date.now(),
        error: error.message
      })
    }
  }
}

/**
 * 检查性能健康状态
 */
function checkPerformanceHealth(metrics) {
  const errorRate = metrics.performance.errorRate || 0
  const avgResponseTime = metrics.performance.averageResponseTime || 0
  
  if (errorRate > 0.2) {
    return { status: 'unhealthy', reason: '错误率过高' }
  }
  
  if (avgResponseTime > 5000) {
    return { status: 'degraded', reason: '响应时间过长' }
  }
  
  return { status: 'healthy' }
}

/**
 * 检查队列健康状态
 */
function checkQueueHealth(queueMetrics) {
  if (!queueMetrics) {
    return { status: 'disabled' }
  }
  
  if (queueMetrics.queued > 50) {
    return { status: 'degraded', reason: '队列积压严重' }
  }
  
  return { status: 'healthy' }
}

/**
 * 检查缓存健康状态
 */
function checkCacheHealth(cacheMetrics) {
  if (!cacheMetrics) {
    return { status: 'disabled' }
  }
  
  if (cacheMetrics.memoryUsagePercent > 90) {
    return { status: 'degraded', reason: '缓存内存使用过高' }
  }
  
  return { status: 'healthy' }
}

module.exports = {
  createPerformanceMiddleware,
  createAIServiceMiddleware,
  createMetricsEndpoint,
  createHealthCheck,
  OptimizationLevel
}