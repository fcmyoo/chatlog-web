/**
 * 前端统一错误处理器
 * 提供统一的错误处理、用户提示和错误恢复机制
 */

/**
 * 错误类型映射
 */
const ErrorTypeMessages = {
  VALIDATION_ERROR: '输入参数有误',
  BUSINESS_ERROR: '业务逻辑错误',
  EXTERNAL_API_ERROR: '外部服务异常',
  SYSTEM_ERROR: '系统错误',
  TIMEOUT_ERROR: '请求超时',
  RATE_LIMIT_ERROR: '请求过于频繁',
  NETWORK_ERROR: '网络连接失败'
}

/**
 * HTTP状态码映射
 */
const HttpStatusMessages = {
  400: '请求参数错误',
  401: '未授权访问',
  403: '禁止访问',
  404: '请求的资源不存在',
  408: '请求超时',
  422: '请求参数验证失败',
  429: '请求过于频繁',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务暂不可用',
  504: '网关超时'
}

/**
 * 前端错误处理器
 */
class FrontendErrorHandler {
  constructor (options = {}) {
    this.showNotification = options.showNotification || this.defaultNotification
    this.enableLogging = options.enableLogging !== false
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableErrors: ['TIMEOUT_ERROR', 'EXTERNAL_API_ERROR', 'NETWORK_ERROR'],
      ...options.retryConfig
    }
  }

  /**
   * 处理API错误响应
   */
  handleApiError (error, options = {}) {
    const normalizedError = this.normalizeError(error)

    // 记录错误日志
    if (this.enableLogging) {
      this.logError(normalizedError, options.context)
    }

    // 显示用户通知
    if (options.showNotification !== false) {
      this.showUserNotification(normalizedError, options.notificationOptions)
    }

    // 执行自动重试逻辑
    if (options.enableRetry && this.shouldRetry(normalizedError, options.retryCount || 0)) {
      return this.scheduleRetry(options.retryFn, options.retryCount || 0, normalizedError)
    }

    // 返回标准化错误
    return normalizedError
  }

  /**
   * 标准化错误对象
   */
  normalizeError (error) {
    // 处理网络错误
    if (!error.response && error.request) {
      return {
        type: 'NETWORK_ERROR',
        message: '网络连接失败，请检查网络设置',
        statusCode: 0,
        details: {
          originalError: error.message
        },
        timestamp: new Date().toISOString()
      }
    }

    // 处理HTTP响应错误
    if (error.response) {
      const { status, data } = error.response

      // 如果后端返回了标准化错误格式
      if (data && data.error && data.error.type) {
        return {
          type: data.error.type,
          message: data.error.message,
          statusCode: status,
          details: data.error.details,
          suggestions: data.suggestions || [],
          timestamp: data.error.timestamp || new Date().toISOString()
        }
      }

      // 处理后端返回的简单错误格式
      if (data && data.error) {
        return {
          type: this.inferErrorType(status),
          message: data.error,
          statusCode: status,
          details: data,
          suggestions: data.suggestions || [],
          timestamp: new Date().toISOString()
        }
      }

      // 使用HTTP状态码生成错误信息
      return {
        type: this.inferErrorType(status),
        message: HttpStatusMessages[status] || `HTTP ${status} 错误`,
        statusCode: status,
        details: data,
        suggestions: [],
        timestamp: new Date().toISOString()
      }
    }

    // 处理JavaScript运行时错误
    return {
      type: 'SYSTEM_ERROR',
      message: error.message || '未知错误',
      statusCode: 500,
      details: {
        stack: error.stack,
        name: error.name
      },
      suggestions: ['请刷新页面重试', '如果问题持续存在，请联系技术支持'],
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 根据HTTP状态码推断错误类型
   */
  inferErrorType (statusCode) {
    if (statusCode >= 400 && statusCode < 500) {
      if (statusCode === 408) return 'TIMEOUT_ERROR'
      if (statusCode === 429) return 'RATE_LIMIT_ERROR'
      return 'VALIDATION_ERROR'
    }

    if (statusCode >= 500) {
      if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
        return 'EXTERNAL_API_ERROR'
      }
      return 'SYSTEM_ERROR'
    }

    return 'SYSTEM_ERROR'
  }

  /**
   * 显示用户通知
   */
  showUserNotification (error, options = {}) {
    const severity = this.getNotificationSeverity(error.type)
    const message = options.customMessage || error.message

    const notificationConfig = {
      type: severity,
      title: this.getNotificationTitle(error.type),
      message,
      duration: options.duration || this.getNotificationDuration(severity),
      showClose: true,
      ...options
    }

    // 如果有建议，添加到通知中
    if (error.suggestions && error.suggestions.length > 0) {
      notificationConfig.description = error.suggestions.join('；')
    }

    this.showNotification(notificationConfig)
  }

  /**
   * 默认通知显示方法（需要被重写）
   */
  defaultNotification (config) {
    console.warn('请配置showNotification方法以显示用户通知:', config)
  }

  /**
   * 获取通知严重程度
   */
  getNotificationSeverity (errorType) {
    const severityMap = {
      VALIDATION_ERROR: 'warning',
      BUSINESS_ERROR: 'warning',
      EXTERNAL_API_ERROR: 'error',
      SYSTEM_ERROR: 'error',
      TIMEOUT_ERROR: 'warning',
      RATE_LIMIT_ERROR: 'warning',
      NETWORK_ERROR: 'error'
    }
    return severityMap[errorType] || 'error'
  }

  /**
   * 获取通知标题
   */
  getNotificationTitle (errorType) {
    return ErrorTypeMessages[errorType] || '系统提示'
  }

  /**
   * 获取通知持续时间
   */
  getNotificationDuration (severity) {
    const durationMap = {
      info: 3000,
      success: 3000,
      warning: 5000,
      error: 8000
    }
    return durationMap[severity] || 5000
  }

  /**
   * 记录错误日志
   */
  logError (error, context = {}) {
    const logData = {
      timestamp: error.timestamp,
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      url: window.location.href,
      userAgent: navigator.userAgent,
      context
    }

    if (error.details) {
      logData.details = error.details
    }

    // 根据错误类型选择日志级别
    switch (error.type) {
      case 'VALIDATION_ERROR':
      case 'BUSINESS_ERROR':
      case 'TIMEOUT_ERROR':
      case 'RATE_LIMIT_ERROR':
        console.warn('⚠️ 前端错误:', logData)
        break
      default:
        console.error('🚨 前端错误:', logData)
    }

    // 在生产环境中可以发送到错误监控服务
    if (process.env.NODE_ENV === 'production' && this.errorReportingService) {
      this.errorReportingService.report(logData)
    }
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry (error, retryCount) {
    if (retryCount >= this.retryConfig.maxRetries) {
      return false
    }

    return this.retryConfig.retryableErrors.includes(error.type)
  }

  /**
   * 安排重试
   */
  async scheduleRetry (retryFn, retryCount, error) {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(2, retryCount),
      this.retryConfig.maxDelay
    )

    console.log(`🔄 错误重试中... (${retryCount + 1}/${this.retryConfig.maxRetries}) 延迟: ${delay}ms`)

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(retryFn({ retryCount: retryCount + 1 }))
      }, delay)
    })
  }

  /**
   * 创建包装函数，自动处理异步操作的错误
   */
  wrapAsyncOperation (asyncFn, options = {}) {
    return async (...args) => {
      try {
        return await asyncFn(...args)
      } catch (error) {
        const handlerOptions = {
          enableRetry: options.enableRetry,
          retryFn: () => asyncFn(...args),
          context: options.context,
          ...options
        }

        const normalizedError = this.handleApiError(error, handlerOptions)

        // 如果配置了重试，则返回重试的Promise
        if (options.enableRetry && this.shouldRetry(normalizedError, 0)) {
          return this.scheduleRetry(() => asyncFn(...args), 0, normalizedError)
        }

        // 否则抛出标准化错误
        throw normalizedError
      }
    }
  }

  /**
   * 全局错误监听器
   */
  setupGlobalErrorHandlers () {
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未处理的Promise拒绝:', event.reason)

      if (event.reason && typeof event.reason === 'object') {
        this.handleApiError(event.reason, {
          context: { type: 'unhandledRejection' }
        })
      }

      event.preventDefault()
    })

    // 捕获JavaScript运行时错误
    window.addEventListener('error', (event) => {
      console.error('JavaScript运行时错误:', event.error)

      const error = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      }

      this.handleApiError(error, {
        context: { type: 'runtimeError' }
      })
    })
  }
}

export default FrontendErrorHandler
export { ErrorTypeMessages, HttpStatusMessages }
