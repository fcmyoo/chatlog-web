import { ElMessage, ElNotification } from 'element-plus'

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

/**
 * 错误级别枚举
 */
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 应用错误类型
 */
export interface AppError {
  type: ErrorType
  level: ErrorLevel
  message: string
  code?: string | number
  details?: any
  timestamp?: Date
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorHistory: AppError[] = []
  private maxHistorySize = 100

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * 处理错误
   * @param error 错误信息
   * @param context 错误上下文
   */
  public handle(error: any, context?: string): void {
    const appError = this.normalizeError(error, context)
    this.logError(appError)
    this.showUserFeedback(appError)
    this.addToHistory(appError)
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: any, context?: string): AppError {
    let appError: AppError = {
      type: ErrorType.UNKNOWN,
      level: ErrorLevel.ERROR,
      message: '未知错误',
      timestamp: new Date()
    }

    if (error instanceof Error) {
      appError.message = error.message
      appError.details = {
        stack: error.stack,
        name: error.name,
        context
      }
    } else if (typeof error === 'string') {
      appError.message = error
      appError.details = { context }
    } else if (error?.response) {
      // Axios错误
      appError.type = ErrorType.API
      appError.code = error.response.status
      appError.message = error.response.data?.message || error.message || '请求失败'
      appError.details = {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response.status,
        statusText: error.response.statusText,
        context
      }

      // 根据HTTP状态码设置错误级别
      if (error.response.status >= 500) {
        appError.level = ErrorLevel.CRITICAL
      } else if (error.response.status >= 400) {
        appError.level = ErrorLevel.ERROR
      }
    } else if (error?.code === 'NETWORK_ERROR') {
      appError.type = ErrorType.NETWORK
      appError.level = ErrorLevel.CRITICAL
      appError.message = '网络连接失败，请检查网络设置'
      appError.details = { context }
    }

    return appError
  }

  /**
   * 记录错误日志
   */
  private logError(error: AppError): void {
    const logLevel = error.level === ErrorLevel.CRITICAL ? 'error' : 
                    error.level === ErrorLevel.ERROR ? 'error' :
                    error.level === ErrorLevel.WARNING ? 'warn' : 'info'

    console[logLevel](`[${error.type.toUpperCase()}] ${error.message}`, {
      code: error.code,
      timestamp: error.timestamp,
      details: error.details
    })
  }

  /**
   * 显示用户反馈
   */
  private showUserFeedback(error: AppError): void {
    switch (error.level) {
      case ErrorLevel.CRITICAL:
        ElNotification({
          title: '严重错误',
          message: error.message,
          type: 'error',
          duration: 0, // 不自动关闭
          showClose: true
        })
        break

      case ErrorLevel.ERROR:
        ElMessage.error(error.message)
        break

      case ErrorLevel.WARNING:
        ElMessage.warning(error.message)
        break

      case ErrorLevel.INFO:
        ElMessage.info(error.message)
        break
    }
  }

  /**
   * 添加到错误历史
   */
  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error)
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.pop()
    }
  }

  /**
   * 获取错误历史
   */
  public getErrorHistory(): AppError[] {
    return [...this.errorHistory]
  }

  /**
   * 清空错误历史
   */
  public clearHistory(): void {
    this.errorHistory = []
  }

  /**
   * 获取错误统计
   */
  public getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    this.errorHistory.forEach(error => {
      const key = `${error.type}_${error.level}`
      stats[key] = (stats[key] || 0) + 1
    })
    return stats
  }
}

/**
 * 全局错误处理函数
 */
export const handleError = (error: any, context?: string): void => {
  ErrorHandler.getInstance().handle(error, context)
}

/**
 * API错误处理装饰器
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      handleError(error, context)
      throw error
    }
  }) as T
}

// 全局错误监听
if (typeof window !== 'undefined') {
  // 捕获未处理的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, 'unhandledrejection')
  })

  // 捕获未处理的JavaScript错误
  window.addEventListener('error', (event) => {
    handleError(event.error || event.message, 'global_error')
  })
}