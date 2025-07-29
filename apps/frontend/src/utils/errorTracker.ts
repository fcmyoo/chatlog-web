/**
 * 错误追踪和监控系统
 * 提供完整的错误收集、分析、报告和处理能力
 */

export interface ErrorInfo {
  id: string
  timestamp: number
  type: 'javascript' | 'api' | 'network' | 'performance' | 'security' | 'user'
  level: 'error' | 'warning' | 'info' | 'debug'
  message: string
  stack?: string
  url: string
  line?: number
  column?: number
  source?: string
  userId?: string
  sessionId: string
  userAgent: string
  context: Record<string, any>
  breadcrumbs: Breadcrumb[]
  tags: string[]
  fingerprint: string
  resolved: boolean
  count: number
}

export interface Breadcrumb {
  timestamp: number
  type: 'navigation' | 'http' | 'user' | 'console' | 'dom' | 'error'
  category: string
  message: string
  level: 'info' | 'warning' | 'error'
  data?: Record<string, any>
}

export interface ErrorMetrics {
  totalErrors: number
  errorRate: number
  topErrors: Array<{ fingerprint: string; count: number; message: string }>
  errorsByType: Record<string, number>
  errorsByPage: Record<string, number>
  resolution: {
    resolved: number
    unresolved: number
    rate: number
  }
  trends: {
    hourly: number[]
    daily: number[]
    weekly: number[]
  }
}

/**
 * 错误追踪管理器
 */
export class ErrorTracker {
  private errors = new Map<string, ErrorInfo>()
  private breadcrumbs: Breadcrumb[] = []
  private sessionId = this.generateSessionId()
  private maxBreadcrumbs = 50
  private maxErrors = 1000
  private reportEndpoint = '/api/errors'
  private reportCallback?: (error: ErrorInfo) => void
  private filters: Array<(error: ErrorInfo) => boolean> = []
  private rateLimiter = new Map<string, { count: number; timestamp: number }>()
  private maxReportsPerMinute = 10

  constructor(options: {
    reportEndpoint?: string
    reportCallback?: (error: ErrorInfo) => void
    maxBreadcrumbs?: number
    maxErrors?: number
    maxReportsPerMinute?: number
  } = {}) {
    Object.assign(this, options)
    this.init()
  }

  /**
   * 初始化错误追踪
   */
  private init(): void {
    this.setupGlobalErrorHandlers()
    this.setupUnhandledRejectionHandler()
    this.setupConsoleInterception()
    this.setupNetworkErrorTracking()
    this.addBreadcrumb({
      timestamp: Date.now(),
      type: 'navigation',
      category: 'app',
      message: 'Error tracker initialized',
      level: 'info'
    })
  }

  /**
   * 设置全局错误处理器
   */
  private setupGlobalErrorHandlers(): void {
    window.addEventListener('error', (event) => {
      this.captureError({
        type: 'javascript',
        level: 'error',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        source: event.error?.toString(),
        context: {
          errorEvent: {
            type: event.type,
            target: event.target?.toString()
          }
        }
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'javascript',
        level: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        source: event.reason?.toString(),
        context: {
          promiseRejection: {
            reason: event.reason,
            promise: event.promise
          }
        }
      })
    })
  }

  /**
   * 设置未处理的 Promise 拒绝处理器
   */
  private setupUnhandledRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      this.addBreadcrumb({
        timestamp: Date.now(),
        type: 'error',
        category: 'promise',
        message: `Unhandled rejection: ${event.reason}`,
        level: 'error',
        data: { reason: event.reason }
      })
    })
  }

  /**
   * 设置控制台拦截
   */
  private setupConsoleInterception(): void {
    const originalConsole = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    }

    console.error = (...args) => {
      this.addBreadcrumb({
        timestamp: Date.now(),
        type: 'console',
        category: 'error',
        message: args.join(' '),
        level: 'error',
        data: { args }
      })
      originalConsole.error.apply(console, args)
    }

    console.warn = (...args) => {
      this.addBreadcrumb({
        timestamp: Date.now(),
        type: 'console',
        category: 'warning',
        message: args.join(' '),
        level: 'warning',
        data: { args }
      })
      originalConsole.warn.apply(console, args)
    }
  }

  /**
   * 设置网络错误追踪
   */
  private setupNetworkErrorTracking(): void {
    // 拦截 fetch
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const [input, init] = args
      const url = typeof input === 'string' ? input : input.url
      const method = init?.method || 'GET'

      this.addBreadcrumb({
        timestamp: Date.now(),
        type: 'http',
        category: 'request',
        message: `${method} ${url}`,
        level: 'info',
        data: { url, method }
      })

      try {
        const response = await originalFetch(...args)
        
        if (!response.ok) {
          this.captureError({
            type: 'network',
            level: response.status >= 500 ? 'error' : 'warning',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: url,
            context: {
              request: { url, method, status: response.status },
              response: { statusText: response.statusText }
            }
          })
        }

        this.addBreadcrumb({
          timestamp: Date.now(),
          type: 'http',
          category: 'response',
          message: `${method} ${url} - ${response.status}`,
          level: response.ok ? 'info' : 'error',
          data: { url, method, status: response.status }
        })

        return response
      } catch (error) {
        this.captureError({
          type: 'network',
          level: 'error',
          message: `Network error: ${error}`,
          url: url,
          context: { request: { url, method }, networkError: error }
        })
        throw error
      }
    }

    // 拦截 XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._errorTrackerMethod = method
      this._errorTrackerUrl = url
      return originalXHROpen.call(this, method, url, ...args)
    }

    XMLHttpRequest.prototype.send = function(...args) {
      this.addEventListener('load', () => {
        if (this.status >= 400) {
          errorTracker.captureError({
            type: 'network',
            level: this.status >= 500 ? 'error' : 'warning',
            message: `XHR ${this.status}: ${this.statusText}`,
            url: this._errorTrackerUrl,
            context: {
              xhr: {
                method: this._errorTrackerMethod,
                url: this._errorTrackerUrl,
                status: this.status,
                statusText: this.statusText
              }
            }
          })
        }
      })

      this.addEventListener('error', () => {
        errorTracker.captureError({
          type: 'network',
          level: 'error',
          message: 'XHR request failed',
          url: this._errorTrackerUrl,
          context: {
            xhr: {
              method: this._errorTrackerMethod,
              url: this._errorTrackerUrl
            }
          }
        })
      })

      return originalXHRSend.call(this, ...args)
    }
  }

  /**
   * 捕获错误
   */
  captureError(errorData: Partial<ErrorInfo>): string {
    const error: ErrorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type: errorData.type || 'javascript',
      level: errorData.level || 'error',
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      url: errorData.url || window.location.href,
      line: errorData.line,
      column: errorData.column,
      source: errorData.source,
      userId: errorData.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      context: {
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...errorData.context
      },
      breadcrumbs: [...this.breadcrumbs],
      tags: errorData.tags || [],
      fingerprint: this.generateFingerprint(errorData),
      resolved: false,
      count: 1
    }

    // 应用过滤器
    if (!this.applyFilters(error)) {
      return error.id
    }

    // 检查是否为重复错误
    const existingError = this.errors.get(error.fingerprint)
    if (existingError) {
      existingError.count++
      existingError.timestamp = Date.now()
      this.reportError(error)
      return existingError.id
    }

    // 存储新错误
    this.errors.set(error.fingerprint, error)

    // 限制错误数量
    if (this.errors.size > this.maxErrors) {
      const oldestError = Array.from(this.errors.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0]
      this.errors.delete(oldestError.fingerprint)
    }

    // 报告错误
    this.reportError(error)

    return error.id
  }

  /**
   * 添加面包屑
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    this.breadcrumbs.push(breadcrumb)

    // 限制面包屑数量
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift()
    }
  }

  /**
   * 捕获用户操作
   */
  captureUserAction(action: string, data?: Record<string, any>): void {
    this.addBreadcrumb({
      timestamp: Date.now(),
      type: 'user',
      category: 'interaction',
      message: action,
      level: 'info',
      data
    })
  }

  /**
   * 捕获自定义错误
   */
  captureMessage(message: string, level: ErrorInfo['level'] = 'info', context?: Record<string, any>): string {
    return this.captureError({
      type: 'user',
      level,
      message,
      context
    })
  }

  /**
   * 捕获异常
   */
  captureException(exception: Error, context?: Record<string, any>): string {
    return this.captureError({
      type: 'javascript',
      level: 'error',
      message: exception.message,
      stack: exception.stack,
      source: exception.toString(),
      context
    })
  }

  /**
   * 应用过滤器
   */
  private applyFilters(error: ErrorInfo): boolean {
    return this.filters.every(filter => filter(error))
  }

  /**
   * 添加过滤器
   */
  addFilter(filter: (error: ErrorInfo) => boolean): void {
    this.filters.push(filter)
  }

  /**
   * 生成错误指纹
   */
  private generateFingerprint(errorData: Partial<ErrorInfo>): string {
    const key = [
      errorData.type,
      errorData.message,
      errorData.url,
      errorData.line,
      errorData.column
    ].filter(Boolean).join('|')
    
    return this.hashString(key)
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 字符串哈希
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 报告错误
   */
  private async reportError(error: ErrorInfo): Promise<void> {
    // 速率限制
    if (!this.checkRateLimit(error.fingerprint)) {
      return
    }

    try {
      // 回调函数报告
      if (this.reportCallback) {
        this.reportCallback(error)
      }

      // HTTP 报告
      if (this.reportEndpoint) {
        await fetch(this.reportEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...error,
            // 减少传输数据量
            breadcrumbs: error.breadcrumbs.slice(-10),
            stack: error.stack?.substring(0, 1000)
          })
        })
      }
    } catch (reportError) {
      console.error('错误报告失败:', reportError)
    }
  }

  /**
   * 速率限制检查
   */
  private checkRateLimit(fingerprint: string): boolean {
    const now = Date.now()
    const windowMs = 60 * 1000 // 1分钟窗口
    
    const record = this.rateLimiter.get(fingerprint)
    if (!record) {
      this.rateLimiter.set(fingerprint, { count: 1, timestamp: now })
      return true
    }

    if (now - record.timestamp > windowMs) {
      // 重置窗口
      record.count = 1
      record.timestamp = now
      return true
    }

    if (record.count >= this.maxReportsPerMinute) {
      return false
    }

    record.count++
    return true
  }

  /**
   * 获取错误统计
   */
  getMetrics(): ErrorMetrics {
    const errors = Array.from(this.errors.values())
    const totalErrors = errors.reduce((sum, error) => sum + error.count, 0)
    const resolved = errors.filter(error => error.resolved).length
    
    return {
      totalErrors,
      errorRate: totalErrors / (Date.now() - (Date.now() - 24 * 60 * 60 * 1000)) * 1000,
      topErrors: errors
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(error => ({
          fingerprint: error.fingerprint,
          count: error.count,
          message: error.message
        })),
      errorsByType: this.groupBy(errors, 'type'),
      errorsByPage: this.groupBy(errors, 'url'),
      resolution: {
        resolved,
        unresolved: errors.length - resolved,
        rate: resolved / errors.length * 100 || 0
      },
      trends: {
        hourly: this.getTrends(errors, 'hour'),
        daily: this.getTrends(errors, 'day'),
        weekly: this.getTrends(errors, 'week')
      }
    }
  }

  /**
   * 按字段分组
   */
  private groupBy(errors: ErrorInfo[], field: keyof ErrorInfo): Record<string, number> {
    return errors.reduce((groups, error) => {
      const key = error[field] as string
      groups[key] = (groups[key] || 0) + error.count
      return groups
    }, {} as Record<string, number>)
  }

  /**
   * 获取趋势数据
   */
  private getTrends(errors: ErrorInfo[], period: 'hour' | 'day' | 'week'): number[] {
    const now = Date.now()
    const periodMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }[period]
    
    const buckets = Array(24).fill(0) // 24个时间段
    
    errors.forEach(error => {
      const bucketIndex = Math.floor((now - error.timestamp) / (periodMs / 24))
      if (bucketIndex >= 0 && bucketIndex < 24) {
        buckets[23 - bucketIndex] += error.count
      }
    })
    
    return buckets
  }

  /**
   * 标记错误为已解决
   */
  markResolved(fingerprint: string): void {
    const error = this.errors.get(fingerprint)
    if (error) {
      error.resolved = true
    }
  }

  /**
   * 获取错误详情
   */
  getError(fingerprint: string): ErrorInfo | undefined {
    return this.errors.get(fingerprint)
  }

  /**
   * 获取所有错误
   */
  getAllErrors(): ErrorInfo[] {
    return Array.from(this.errors.values())
  }

  /**
   * 清除所有错误
   */
  clearErrors(): void {
    this.errors.clear()
    this.breadcrumbs = []
  }

  /**
   * 设置用户信息
   */
  setUser(userId: string, context?: Record<string, any>): void {
    this.addBreadcrumb({
      timestamp: Date.now(),
      type: 'user',
      category: 'identity',
      message: `User set: ${userId}`,
      level: 'info',
      data: { userId, ...context }
    })
  }

  /**
   * 设置标签
   */
  setTags(tags: Record<string, string>): void {
    this.addBreadcrumb({
      timestamp: Date.now(),
      type: 'user',
      category: 'context',
      message: 'Tags updated',
      level: 'info',
      data: { tags }
    })
  }

  /**
   * 销毁追踪器
   */
  destroy(): void {
    this.errors.clear()
    this.breadcrumbs = []
    this.rateLimiter.clear()
  }
}

// 创建全局实例
export const errorTracker = new ErrorTracker({
  reportCallback: (error) => {
    console.group(`🚨 错误报告: ${error.level}`)
    console.log('消息:', error.message)
    console.log('类型:', error.type)
    console.log('URL:', error.url)
    console.log('时间:', new Date(error.timestamp).toLocaleString())
    console.log('会话:', error.sessionId)
    console.log('上下文:', error.context)
    console.log('面包屑:', error.breadcrumbs.slice(-5))
    console.groupEnd()
  }
})

// 导出便利函数
export const captureError = (error: Error, context?: Record<string, any>) => {
  return errorTracker.captureException(error, context)
}

export const captureMessage = (message: string, level?: ErrorInfo['level'], context?: Record<string, any>) => {
  return errorTracker.captureMessage(message, level, context)
}

export const addBreadcrumb = (breadcrumb: Breadcrumb) => {
  errorTracker.addBreadcrumb(breadcrumb)
}