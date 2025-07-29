/**
 * API安全模块入口文件
 * 导出所有安全相关组件和工具
 */

import { apiSecurity, ApiSecurityManager } from './SecurityManager'
import { inputValidator, ValidationRules, InputValidationManager } from './ValidationManager'

// 导出安全管理器
export { apiSecurity, inputValidator }

// 导出类型定义
export type {
  ApiKeyConfig,
  SecurityPolicy,
  SecurityAuditLog
} from './SecurityManager'

export type {
  ValidationRule,
  ValidationResult,
  SecurityCheckResult
} from './ValidationManager'

// 导出管理器类
export {
  ApiSecurityManager,
  InputValidationManager,
  ValidationRules
}

/**
 * 安全组件初始化
 */
export async function initializeSecurity(): Promise<void> {
  try {
    // 初始化安全管理器
    await apiSecurity.initialize()
    
    console.log('🔐 API安全系统初始化完成')
    
    // 输出安全状态摘要
    const stats = apiSecurity.getSecurityStats()
    console.log('📊 安全状态:', {
      总密钥数: stats.totalKeys,
      活跃密钥: stats.activeKeys,
      过期密钥: stats.expiredKeys,
      安全事件: stats.totalEvents
    })
    
  } catch (error) {
    console.error('🚨 安全系统初始化失败:', error)
    throw error
  }
}

/**
 * 安全工具函数
 */
export const securityUtils = {
  /**
   * 创建API密钥
   */
  async createApiKey(config: {
    name: string
    service: 'chatlog' | 'ai' | 'external'
    permissions?: string[]
    expiresIn?: number
  }) {
    return apiSecurity.createApiKey(config)
  },

  /**
   * 验证输入数据
   */
  validateInput(data: any, schema: Record<string, any>) {
    return inputValidator.validateObject(data, schema)
  },

  /**
   * 安全检查
   */
  securityCheck(data: any, allowHTML: boolean = false) {
    return inputValidator.performSecurityCheck(data, allowHTML)
  },

  /**
   * 获取安全统计
   */
  getSecurityStats() {
    return {
      apiKeys: apiSecurity.getSecurityStats(),
      validation: inputValidator.getValidationStats()
    }
  },

  /**
   * 获取审计日志
   */
  getAuditLogs(options?: any) {
    return apiSecurity.getAuditLogs(options)
  },

  /**
   * 清理安全数据
   */
  cleanup() {
    apiSecurity.cleanup()
    inputValidator.clearCache()
  }
}

// 预定义的验证规则集
export const securityRules = {
  // API参数验证
  chatlogParams: ValidationRules.apiParams.chatlogParams(),
  analysisParams: ValidationRules.apiParams.analysisParams(),
  modelConfig: ValidationRules.apiParams.modelConfig(),
  
  // 通用规则
  safeString: (maxLength: number = 1000) => ValidationRules.safeString(maxLength),
  email: () => ValidationRules.email(),
  url: () => ValidationRules.url(),
  required: (message?: string) => ValidationRules.required(message),
  
  // 数值规则
  positiveNumber: () => ValidationRules.number({ min: 0 }),
  pageSize: () => ValidationRules.number({ min: 1, max: 1000, integer: true }),
  pageOffset: () => ValidationRules.number({ min: 0, integer: true })
}

console.log('🔐 API安全模块已加载')