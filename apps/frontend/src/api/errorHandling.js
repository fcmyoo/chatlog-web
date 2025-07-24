/**
 * 前端API客户端错误处理器集成
 * 为统一ApiClient添加错误处理支持
 */

import { ErrorHandler, handleError, withErrorHandling } from '@/utils/errorHandler'

/**
 * 创建错误处理器实例
 */
const errorHandler = ErrorHandler.getInstance()

/**
 * 创建带错误处理的axios拦截器
 */
export function setupErrorHandling (axiosInstance, options = {}) {
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
      const context = `API请求: ${error.config?.method?.toUpperCase()} ${error.config?.url}`

      // 处理错误
      errorHandler.handle(error, context)

      return Promise.reject(error)
    }
  )

  return axiosInstance
}

/**
 * 包装API方法，添加自动错误处理和重试
 */
export function wrapApiMethod (fn, context = 'API操作') {
  return withErrorHandling(fn, context)
}

/**
 * 手动处理特定错误
 */
export function handleSpecificError (error, context = '特定错误') {
  return handleError(error, context)
}

/**
 * 设置全局错误监听
 */
export function setupGlobalErrorHandling () {
  // 设置全局错误监听
  window.addEventListener('error', (event) => {
    handleError(event.error, '全局JS错误')
  })

  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, '未处理的Promise拒绝')
  })
}

export default errorHandler
