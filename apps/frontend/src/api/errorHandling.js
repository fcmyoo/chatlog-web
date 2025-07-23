/**
 * 前端API客户端错误处理器集成
 * 为统一ApiClient添加错误处理支持
 */

import FrontendErrorHandler from '../utils/errorHandler.js'

/**
 * 创建错误处理器实例
 */
const errorHandler = new FrontendErrorHandler({
  enableLogging: true,
  showNotification: (config) => {
    // 这里需要集成具体的UI通知库（如Element Plus）
    // 现在只是控制台输出，待后续集成
    console.warn('用户通知:', config)
  },
  retryConfig: {
    maxRetries: 2,
    baseDelay: 1000,
    retryableErrors: ['TIMEOUT_ERROR', 'EXTERNAL_API_ERROR', 'NETWORK_ERROR']
  }
})

/**
 * 创建带错误处理的axios拦截器
 */
export function setupErrorHandling(axiosInstance, options = {}) {
  // 请求拦截器
  axiosInstance.interceptors.request.use(
    (config) => {
      // 添加请求开始时间戳，用于计算请求耗时
      config.startTime = Date.now()
      return config
    },
    (error) => {
      console.error('请求配置错误:', error)
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  axiosInstance.interceptors.response.use(
    (response) => {
      // 计算请求耗时
      const duration = Date.now() - response.config.startTime
      
      // 记录慢请求
      if (duration > 3000) {
        console.warn(`慢请求检测: ${response.config.url} 耗时 ${duration}ms`)
      }

      return response
    },
    (error) => {
      // 使用统一错误处理器处理错误
      const handlerOptions = {
        showNotification: options.showNotification !== false,
        enableRetry: options.enableRetry === true,
        context: {
          url: error.config?.url,
          method: error.config?.method,
          timestamp: new Date().toISOString()
        },
        ...options
      }

      // 处理错误并返回标准化错误对象
      const normalizedError = errorHandler.handleApiError(error, handlerOptions)
      
      return Promise.reject(normalizedError)
    }
  )

  return axiosInstance
}

/**
 * 包装API方法，添加自动错误处理和重试
 */
export function wrapApiMethod(fn, options = {}) {
  return errorHandler.wrapAsyncOperation(fn, {
    enableRetry: options.enableRetry,
    showNotification: options.showNotification !== false,
    context: options.context,
    notificationOptions: options.notificationOptions
  })
}

/**
 * 手动处理特定错误
 */
export function handleSpecificError(error, options = {}) {
  return errorHandler.handleApiError(error, options)
}

/**
 * 设置全局错误监听
 */
export function setupGlobalErrorHandling() {
  errorHandler.setupGlobalErrorHandlers()
}

export default errorHandler