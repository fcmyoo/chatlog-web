/**
 * API监控和日志管理器
 * 提供请求性能监控、错误跟踪和详细日志记录
 */

export interface RequestMetrics {
  id: string
  url: string
  method: string
  startTime: number
  endTime?: number
  duration?: number
  status?: number
  statusText?: string
  requestSize: number
  responseSize?: number
  success: boolean
  error?: string
  retryCount: number
  fromCache: boolean
}

export interface PerformanceMetrics {
  totalRequests: number
  successRate: number
  averageResponseTime: number
  slowRequestCount: number
  errorCount: number
  cacheHitRate: number
  topSlowEndpoints: Array<{ url: string; averageTime: number; count: number }>
  errorsByType: Record<string, number>
  requestsByHour: number[]
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * API监控管理器
 */
export class ApiMonitorManager {
  private static instance: ApiMonitorManager
  private metrics: RequestMetrics[] = []
  private activeRequests = new Map<string, RequestMetrics>()
  private logLevel: LogLevel = LogLevel.INFO
  private maxMetricsHistory = 1000

  private constructor() {}

  public static getInstance(): ApiMonitorManager {
    if (!ApiMonitorManager.instance) {
      ApiMonitorManager.instance = new ApiMonitorManager()
    }
    return ApiMonitorManager.instance
  }

  /**
   * 开始监控请求
   */
  public startRequest(config: {
    url: string
    method: string
    data?: any
    fromCache?: boolean
  }): string {
    const id = this.generateRequestId()
    const startTime = performance.now()
    
    const metrics: RequestMetrics = {
      id,
      url: config.url,
      method: config.method.toUpperCase(),
      startTime,
      requestSize: this.calculateSize(config.data),
      success: false,
      retryCount: 0,
      fromCache: config.fromCache || false
    }

    this.activeRequests.set(id, metrics)
    
    this.log(LogLevel.DEBUG, `🚀 请求开始: ${config.method} ${config.url}`, {
      requestId: id,
      fromCache: config.fromCache
    })

    return id
  }

  /**
   * 完成请求监控
   */
  public completeRequest(
    requestId: string, 
    response: {
      status: number
      statusText: string
      data?: any
      headers?: Record<string, string>
    }
  ): void {
    const metrics = this.activeRequests.get(requestId)
    if (!metrics) return

    const endTime = performance.now()
    const duration = endTime - metrics.startTime

    metrics.endTime = endTime
    metrics.duration = duration
    metrics.status = response.status
    metrics.statusText = response.statusText
    metrics.responseSize = this.calculateSize(response.data)
    metrics.success = response.status >= 200 && response.status < 300

    this.activeRequests.delete(requestId)
    this.addToHistory(metrics)

    // 记录慢请求
    if (duration > 3000) {
      this.log(LogLevel.WARN, `🐌 慢请求检测: ${metrics.method} ${metrics.url}`, {
        duration: `${Math.round(duration)}ms`,
        status: response.status
      })
    }

    this.log(LogLevel.DEBUG, `✅ 请求完成: ${metrics.method} ${metrics.url}`, {
      duration: `${Math.round(duration)}ms`,
      status: response.status,
      fromCache: metrics.fromCache
    })
  }

  /**
   * 记录请求错误
   */
  public recordError(
    requestId: string,
    error: {
      message: string
      code?: string
      status?: number
      stack?: string
    }
  ): void {
    const metrics = this.activeRequests.get(requestId)
    if (!metrics) return

    const endTime = performance.now()
    const duration = endTime - metrics.startTime

    metrics.endTime = endTime
    metrics.duration = duration
    metrics.success = false
    metrics.error = error.message
    metrics.status = error.status

    this.activeRequests.delete(requestId)
    this.addToHistory(metrics)

    this.log(LogLevel.ERROR, `❌ 请求失败: ${metrics.method} ${metrics.url}`, {
      error: error.message,
      code: error.code,
      duration: `${Math.round(duration)}ms`,
      stack: error.stack
    })
  }

  /**
   * 记录重试
   */
  public recordRetry(requestId: string, retryCount: number): void {
    const metrics = this.activeRequests.get(requestId)
    if (metrics) {
      metrics.retryCount = retryCount
      this.log(LogLevel.WARN, `🔄 请求重试: ${metrics.method} ${metrics.url}`, {
        retryCount,
        duration: `${Math.round(performance.now() - metrics.startTime)}ms`
      })
    }
  }

  /**
   * 获取性能指标
   */
  public getPerformanceMetrics(timeRange?: { start: number; end: number }): PerformanceMetrics {
    let relevantMetrics = this.metrics

    if (timeRange) {
      relevantMetrics = this.metrics.filter(m => 
        m.startTime >= timeRange.start && m.startTime <= timeRange.end
      )
    }

    const total = relevantMetrics.length
    const successful = relevantMetrics.filter(m => m.success).length
    const errors = relevantMetrics.filter(m => !m.success)
    const slowRequests = relevantMetrics.filter(m => (m.duration || 0) > 3000)
    const fromCache = relevantMetrics.filter(m => m.fromCache).length

    // 计算平均响应时间
    const totalDuration = relevantMetrics.reduce((sum, m) => sum + (m.duration || 0), 0)
    const averageResponseTime = total > 0 ? totalDuration / total : 0

    // 统计最慢的端点
    const endpointStats = new Map<string, { totalTime: number; count: number }>()
    relevantMetrics.forEach(m => {
      const key = `${m.method} ${m.url.split('?')[0]}` // 移除查询参数
      const existing = endpointStats.get(key) || { totalTime: 0, count: 0 }
      existing.totalTime += m.duration || 0
      existing.count += 1
      endpointStats.set(key, existing)
    })

    const topSlowEndpoints = Array.from(endpointStats.entries())
      .map(([url, stats]) => ({
        url,
        averageTime: stats.totalTime / stats.count,
        count: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10)

    // 按错误类型统计
    const errorsByType: Record<string, number> = {}
    errors.forEach(m => {
      const errorType = this.getErrorType(m.status, m.error)
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1
    })

    // 按小时统计请求数
    const requestsByHour = new Array(24).fill(0)
    relevantMetrics.forEach(m => {
      const hour = new Date(m.startTime).getHours()
      requestsByHour[hour]++
    })

    return {
      totalRequests: total,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequestCount: slowRequests.length,
      errorCount: errors.length,
      cacheHitRate: total > 0 ? (fromCache / total) * 100 : 0,
      topSlowEndpoints,
      errorsByType,
      requestsByHour
    }
  }

  /**
   * 获取活动请求列表
   */
  public getActiveRequests(): RequestMetrics[] {
    const now = performance.now()
    return Array.from(this.activeRequests.values()).map(metrics => ({
      ...metrics,
      duration: now - metrics.startTime
    }))
  }

  /**
   * 清理历史记录
   */
  public clearHistory(): void {
    this.metrics = []
    this.log(LogLevel.INFO, '📊 监控历史已清理')
  }

  /**
   * 设置日志级别
   */
  public setLogLevel(level: LogLevel): void {
    this.logLevel = level
    this.log(LogLevel.INFO, `📝 日志级别设置为: ${LogLevel[level]}`)
  }

  /**
   * 导出监控数据
   */
  public exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV()
    }
    return JSON.stringify(this.metrics, null, 2)
  }

  /**
   * 启动实时监控
   */
  public startRealTimeMonitoring(callback: (metrics: PerformanceMetrics) => void, intervalMs: number = 30000): () => void {
    const timer = setInterval(() => {
      const metrics = this.getPerformanceMetrics()
      callback(metrics)
    }, intervalMs)

    return () => clearInterval(timer)
  }

  // 私有方法
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private calculateSize(data: any): number {
    if (!data) return 0
    if (typeof data === 'string') return data.length * 2
    try {
      return JSON.stringify(data).length * 2
    } catch {
      return 0
    }
  }

  private addToHistory(metrics: RequestMetrics): void {
    this.metrics.push(metrics)
    
    // 保持历史记录在限制范围内
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }
  }

  private getErrorType(status?: number, error?: string): string {
    if (!status && error) {
      if (error.includes('timeout')) return '超时错误'
      if (error.includes('network')) return '网络错误'
      return '未知错误'
    }

    if (status) {
      if (status >= 500) return '服务器错误'
      if (status >= 400) return '客户端错误'
    }

    return '其他错误'
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.logLevel) return

    const timestamp = new Date().toISOString()
    const logData = { timestamp, level: LogLevel[level], message, data }

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`[API-DEBUG] ${message}`, data)
        break
      case LogLevel.INFO:
        console.info(`[API-INFO] ${message}`, data)
        break
      case LogLevel.WARN:
        console.warn(`[API-WARN] ${message}`, data)
        break
      case LogLevel.ERROR:
        console.error(`[API-ERROR] ${message}`, data)
        break
    }

    // 在生产环境中可以发送到日志服务
    if (process.env.NODE_ENV === 'production' && level >= LogLevel.WARN) {
      this.sendToLoggingService(logData)
    }
  }

  private exportToCSV(): string {
    const headers = [
      'ID', 'URL', 'Method', 'Start Time', 'Duration', 'Status', 
      'Success', 'Request Size', 'Response Size', 'From Cache', 'Retry Count', 'Error'
    ]
    
    const rows = this.metrics.map(m => [
      m.id,
      m.url,
      m.method,
      new Date(m.startTime).toISOString(),
      m.duration || '',
      m.status || '',
      m.success,
      m.requestSize,
      m.responseSize || '',
      m.fromCache,
      m.retryCount,
      m.error || ''
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  private async sendToLoggingService(logData: any): Promise<void> {
    // 实际应用中发送到外部日志服务，如Sentry、LogRocket等
    // 这里只是示例
    try {
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logData)
      // })
    } catch (error) {
      // 静默失败，避免日志发送错误影响主业务
    }
  }
}

// 创建全局监控实例
export const apiMonitor = ApiMonitorManager.getInstance()