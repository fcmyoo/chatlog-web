/**
 * 统一错误处理中间件
 * 提供标准化的错误响应格式和错误分类处理
 */

/**
 * 错误类型分类
 */
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BUSINESS_ERROR: 'BUSINESS_ERROR', 
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR'
}

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, type = ErrorTypes.SYSTEM_ERROR, statusCode = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
    
    // 保持堆栈跟踪
    Error.captureStackTrace(this, AppError)
  }
}

/**
 * 预定义的错误类别
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, ErrorTypes.VALIDATION_ERROR, 400, details)
  }
}

class BusinessError extends AppError {
  constructor(message, details = null) {
    super(message, ErrorTypes.BUSINESS_ERROR, 422, details)
  }
}

class ExternalApiError extends AppError {
  constructor(message, details = null) {
    super(message, ErrorTypes.EXTERNAL_API_ERROR, 502, details)
  }
}

class TimeoutError extends AppError {
  constructor(message = '请求超时', details = null) {
    super(message, ErrorTypes.TIMEOUT_ERROR, 408, details)
  }
}

class RateLimitError extends AppError {
  constructor(message = '请求频率过高，请稍后重试', details = null) {
    super(message, ErrorTypes.RATE_LIMIT_ERROR, 429, details)
  }
}

/**
 * 错误处理工具函数
 */
class ErrorHandler {
  /**
   * 标准化错误信息
   */
  static normalizeError(error) {
    // 如果已经是AppError，直接返回
    if (error instanceof AppError) {
      return error
    }

    // 处理Axios错误
    if (error.response) {
      const { status, data } = error.response
      let message = '外部服务调用失败'
      let details = null

      if (data && typeof data === 'object') {
        message = data.message || data.error || message
        details = data
      } else if (typeof data === 'string') {
        message = data
      }

      return new ExternalApiError(message, {
        status,
        originalError: error.message,
        url: error.config?.url,
        method: error.config?.method,
        ...details
      })
    }

    // 处理网络错误
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new ExternalApiError('外部服务连接失败', {
        code: error.code,
        originalError: error.message
      })
    }

    // 处理超时错误
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return new TimeoutError('请求超时', {
        originalError: error.message
      })
    }

    // 处理验证错误
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, {
        originalError: error.message
      })
    }

    // 默认系统错误
    return new AppError(error.message || '系统内部错误', ErrorTypes.SYSTEM_ERROR, 500, {
      originalError: error.message,
      stack: error.stack
    })
  }

  /**
   * 生成标准错误响应
   */
  static generateErrorResponse(error) {
    const normalizedError = this.normalizeError(error)
    
    const response = {
      success: false,
      error: {
        type: normalizedError.type,
        message: normalizedError.message,
        timestamp: normalizedError.timestamp
      }
    }

    // 在开发环境中包含更多调试信息
    if (process.env.NODE_ENV === 'development') {
      response.error.details = normalizedError.details
      response.error.stack = normalizedError.stack
    } else if (normalizedError.details && !normalizedError.details.stack) {
      // 生产环境中只包含安全的详情信息
      response.error.details = normalizedError.details
    }

    return {
      statusCode: normalizedError.statusCode,
      response
    }
  }

  /**
   * 记录错误日志
   */
  static logError(error, req = null) {
    const normalizedError = this.normalizeError(error)
    
    const logData = {
      timestamp: normalizedError.timestamp,
      type: normalizedError.type,
      message: normalizedError.message,
      statusCode: normalizedError.statusCode
    }

    // 添加请求上下文信息
    if (req) {
      logData.request = {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      }
    }

    // 添加错误详情
    if (normalizedError.details) {
      logData.details = normalizedError.details
    }

    // 根据错误类型选择不同的日志级别
    switch (normalizedError.type) {
      case ErrorTypes.VALIDATION_ERROR:
        console.warn('⚠️ 验证错误:', JSON.stringify(logData, null, 2))
        break
      case ErrorTypes.BUSINESS_ERROR:
        console.warn('💼 业务错误:', JSON.stringify(logData, null, 2))
        break
      case ErrorTypes.EXTERNAL_API_ERROR:
        console.error('🌐 外部API错误:', JSON.stringify(logData, null, 2))
        break
      case ErrorTypes.TIMEOUT_ERROR:
        console.warn('⏱️ 超时错误:', JSON.stringify(logData, null, 2))
        break
      case ErrorTypes.RATE_LIMIT_ERROR:
        console.warn('🚦 限流错误:', JSON.stringify(logData, null, 2))
        break
      default:
        console.error('🚨 系统错误:', JSON.stringify(logData, null, 2))
    }
  }

  /**
   * 生成用户友好的错误建议
   */
  static generateSuggestions(error) {
    const normalizedError = this.normalizeError(error)
    const suggestions = []

    switch (normalizedError.type) {
      case ErrorTypes.VALIDATION_ERROR:
        suggestions.push('请检查输入参数是否正确')
        suggestions.push('确认所有必填字段都已提供')
        break
        
      case ErrorTypes.BUSINESS_ERROR:
        suggestions.push('请检查业务逻辑是否符合要求')
        break
        
      case ErrorTypes.EXTERNAL_API_ERROR:
        suggestions.push('请检查外部服务是否正常运行')
        suggestions.push('稍后重试或联系系统管理员')
        break
        
      case ErrorTypes.TIMEOUT_ERROR:
        suggestions.push('请稍后重试')
        suggestions.push('如果问题持续存在，请联系技术支持')
        break
        
      case ErrorTypes.RATE_LIMIT_ERROR:
        suggestions.push('请降低请求频率')
        suggestions.push('等待一段时间后重试')
        break
        
      default:
        suggestions.push('请联系技术支持')
        suggestions.push('提供错误发生时间以便快速定位问题')
    }

    return suggestions
  }
}

/**
 * Express错误处理中间件
 */
function errorMiddleware(error, req, res, next) {
  // 记录错误日志
  ErrorHandler.logError(error, req)
  
  // 生成标准化错误响应
  const { statusCode, response } = ErrorHandler.generateErrorResponse(error)
  
  // 添加用户友好的建议
  response.suggestions = ErrorHandler.generateSuggestions(error)
  
  // 发送错误响应
  res.status(statusCode).json(response)
}

/**
 * 异步错误捕获装饰器
 */
function asyncErrorHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * 404错误处理中间件
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `路由 ${req.method} ${req.url} 不存在`,
    ErrorTypes.VALIDATION_ERROR,
    404,
    {
      method: req.method,
      url: req.url
    }
  )
  next(error)
}

module.exports = {
  // 错误类
  AppError,
  ValidationError,
  BusinessError,
  ExternalApiError,
  TimeoutError,
  RateLimitError,
  
  // 错误类型常量
  ErrorTypes,
  
  // 错误处理器
  ErrorHandler,
  
  // 中间件
  errorMiddleware,
  asyncErrorHandler,
  notFoundHandler
}