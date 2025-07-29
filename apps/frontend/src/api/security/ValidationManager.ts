/**
 * 输入验证管理器
 * 提供全面的输入数据验证、清理和安全检查
 */

export interface ValidationRule {
  type: 'required' | 'string' | 'number' | 'email' | 'url' | 'date' | 'array' | 'object' | 'custom'
  message?: string
  // 字符串验证
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  // 数字验证
  min?: number
  max?: number
  integer?: boolean
  // 数组验证
  minItems?: number
  maxItems?: number
  itemType?: ValidationRule
  // 对象验证
  properties?: Record<string, ValidationRule>
  // 自定义验证
  validator?: (value: any) => boolean | string
  // 安全选项
  sanitize?: boolean
  allowHTML?: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: Array<{
    field: string
    message: string
    value?: any
  }>
  sanitizedData?: any
}

export interface SecurityCheckResult {
  isSafe: boolean
  threats: Array<{
    type: 'xss' | 'sql_injection' | 'path_traversal' | 'malicious_script' | 'data_exfiltration'
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    location?: string
  }>
  sanitizedData?: any
}

/**
 * 输入验证管理器
 */
export class InputValidationManager {
  private static instance: InputValidationManager
  private validationCache = new Map<string, ValidationResult>()
  private readonly cacheTimeout = 5 * 60 * 1000 // 5分钟

  // XSS 攻击模式
  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*>/gi,
    /<meta\b[^<]*>/gi
  ]

  // SQL注入模式
  private readonly sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|OR|AND)\b)/gi,
    /'[^']*'/g,
    /--/g,
    /\/\*.*?\*\//g,
    /;\s*(DROP|DELETE|INSERT|UPDATE)/gi
  ]

  // 路径遍历模式
  private readonly pathTraversalPatterns = [
    /\.\.\//g,
    /\.\.\\{1,2}/g,
    /%2e%2e%2f/gi,
    /%2e%2e\\{1,2}/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi
  ]

  // 恶意脚本模式
  private readonly maliciousScriptPatterns = [
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /document\.write/gi,
    /document\.writeln/gi,
    /window\.location/gi,
    /document\.location/gi
  ]

  private constructor() {}

  public static getInstance(): InputValidationManager {
    if (!InputValidationManager.instance) {
      InputValidationManager.instance = new InputValidationManager()
    }
    return InputValidationManager.instance
  }

  /**
   * 验证单个值
   */
  public validateValue(value: any, rule: ValidationRule, fieldName: string = 'field'): ValidationResult {
    const errors: Array<{ field: string; message: string; value?: any }> = []
    let sanitizedValue = value

    try {
      // 必填验证
      if (rule.type === 'required' && (value === null || value === undefined || value === '')) {
        errors.push({
          field: fieldName,
          message: rule.message || `${fieldName} 是必填项`,
          value
        })
        return { isValid: false, errors }
      }

      // 如果值为空且不是必填，直接返回有效
      if (value === null || value === undefined || value === '') {
        return { isValid: true, errors: [], sanitizedData: sanitizedValue }
      }

      // 根据类型进行验证
      switch (rule.type) {
        case 'string':
          sanitizedValue = this.validateString(value, rule, fieldName, errors)
          break

        case 'number':
          sanitizedValue = this.validateNumber(value, rule, fieldName, errors)
          break

        case 'email':
          sanitizedValue = this.validateEmail(value, rule, fieldName, errors)
          break

        case 'url':
          sanitizedValue = this.validateUrl(value, rule, fieldName, errors)
          break

        case 'date':
          sanitizedValue = this.validateDate(value, rule, fieldName, errors)
          break

        case 'array':
          sanitizedValue = this.validateArray(value, rule, fieldName, errors)
          break

        case 'object':
          sanitizedValue = this.validateObjectValue(value, rule, fieldName, errors)
          break

        case 'custom':
          sanitizedValue = this.validateCustom(value, rule, fieldName, errors)
          break
      }

      // 安全验证和清理
      if (rule.sanitize !== false) {
        const securityCheck = this.performSecurityCheck(sanitizedValue, rule.allowHTML || false)
        if (!securityCheck.isSafe) {
          errors.push(...securityCheck.threats.map(threat => ({
            field: fieldName,
            message: `安全威胁: ${threat.message}`,
            value
          })))
        } else {
          sanitizedValue = securityCheck.sanitizedData || sanitizedValue
        }
      }

    } catch (error) {
      errors.push({
        field: fieldName,
        message: `验证过程中发生错误: ${error.message}`,
        value
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: sanitizedValue
    }
  }

  /**
   * 验证对象
   */
  public validateObject(data: any, schema: Record<string, ValidationRule>): ValidationResult {
    // 生成缓存键
    const cacheKey = this.generateCacheKey(data, schema)
    const cached = this.validationCache.get(cacheKey)
    
    if (cached && Date.now() - (cached as any).timestamp < this.cacheTimeout) {
      return cached
    }

    const errors: Array<{ field: string; message: string; value?: any }> = []
    const sanitizedData: any = {}

    // 验证所有定义的字段
    for (const [fieldName, rule] of Object.entries(schema)) {
      const fieldValue = data[fieldName]
      const result = this.validateValue(fieldValue, rule, fieldName)
      
      if (!result.isValid) {
        errors.push(...result.errors)
      } else {
        sanitizedData[fieldName] = result.sanitizedData
      }
    }

    // 检查是否有未定义的字段（可能的安全风险）
    if (typeof data === 'object' && data !== null) {
      for (const key of Object.keys(data)) {
        if (!schema.hasOwnProperty(key)) {
          console.warn(`未定义的字段: ${key}，值:`, data[key])
          // 可以选择忽略、报错或包含到清理后的数据中
          // 这里选择忽略以提高安全性
        }
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    }

    // 缓存结果
    this.validationCache.set(cacheKey, { ...result, timestamp: Date.now() } as any)

    return result
  }

  /**
   * 执行安全检查
   */
  public performSecurityCheck(data: any, allowHTML: boolean = false): SecurityCheckResult {
    const threats: SecurityCheckResult['threats'] = []
    let sanitizedData = data

    if (typeof data === 'string') {
      // XSS 检查
      if (!allowHTML) {
        for (const pattern of this.xssPatterns) {
          if (pattern.test(data)) {
            threats.push({
              type: 'xss',
              severity: 'high',
              message: 'XSS攻击模式检测',
              location: 'string_content'
            })
            // 移除或转义危险内容
            sanitizedData = data.replace(pattern, '')
          }
        }

        // 转义HTML标签
        sanitizedData = this.escapeHtml(sanitizedData)
      }

      // SQL注入检查
      for (const pattern of this.sqlInjectionPatterns) {
        if (pattern.test(data)) {
          threats.push({
            type: 'sql_injection',
            severity: 'critical',
            message: 'SQL注入攻击模式检测',
            location: 'string_content'
          })
        }
      }

      // 路径遍历检查
      for (const pattern of this.pathTraversalPatterns) {
        if (pattern.test(data)) {
          threats.push({
            type: 'path_traversal',
            severity: 'high',
            message: '路径遍历攻击模式检测',
            location: 'string_content'
          })
          // 清理路径遍历字符
          sanitizedData = sanitizedData.replace(pattern, '')
        }
      }

      // 恶意脚本检查
      for (const pattern of this.maliciousScriptPatterns) {
        if (pattern.test(data)) {
          threats.push({
            type: 'malicious_script',
            severity: 'high',
            message: '恶意脚本模式检测',
            location: 'string_content'
          })
        }
      }

      // 数据泄露检查（检查是否包含敏感信息）
      if (this.containsSensitiveData(data)) {
        threats.push({
          type: 'data_exfiltration',
          severity: 'medium',
          message: '可能包含敏感数据',
          location: 'string_content'
        })
      }

    } else if (typeof data === 'object' && data !== null) {
      // 递归检查对象的所有属性
      const sanitizedObject: any = Array.isArray(data) ? [] : {}
      
      for (const [key, value] of Object.entries(data)) {
        const result = this.performSecurityCheck(value, allowHTML)
        threats.push(...result.threats.map(threat => ({
          ...threat,
          location: `${key}.${threat.location || 'value'}`
        })))
        sanitizedObject[key] = result.sanitizedData
      }
      
      sanitizedData = sanitizedObject
    }

    return {
      isSafe: threats.length === 0,
      threats,
      sanitizedData
    }
  }

  /**
   * 创建常用验证规则
   */
  public static createRules() {
    return {
      // 基本规则
      required: (message?: string): ValidationRule => ({
        type: 'required',
        message
      }),

      string: (options?: {
        minLength?: number
        maxLength?: number
        pattern?: RegExp
        message?: string
      }): ValidationRule => ({
        type: 'string',
        minLength: options?.minLength,
        maxLength: options?.maxLength,
        pattern: options?.pattern,
        message: options?.message
      }),

      number: (options?: {
        min?: number
        max?: number
        integer?: boolean
        message?: string
      }): ValidationRule => ({
        type: 'number',
        min: options?.min,
        max: options?.max,
        integer: options?.integer,
        message: options?.message
      }),

      email: (message?: string): ValidationRule => ({
        type: 'email',
        message
      }),

      url: (message?: string): ValidationRule => ({
        type: 'url',
        message
      }),

      // 安全规则
      safeString: (maxLength: number = 1000): ValidationRule => ({
        type: 'string',
        maxLength,
        sanitize: true,
        allowHTML: false
      }),

      htmlString: (maxLength: number = 10000): ValidationRule => ({
        type: 'string',
        maxLength,
        sanitize: true,
        allowHTML: true
      }),

      // API参数规则
      apiParams: {
        chatlogParams: (): Record<string, ValidationRule> => ({
          contactId: { type: 'string', maxLength: 100, sanitize: true },
          chatroomId: { type: 'string', maxLength: 100, sanitize: true },
          startTime: { type: 'date' },
          endTime: { type: 'date' },
          keyword: { type: 'string', maxLength: 200, sanitize: true },
          limit: { type: 'number', min: 1, max: 1000, integer: true },
          offset: { type: 'number', min: 0, integer: true }
        }),

        analysisParams: (): Record<string, ValidationRule> => ({
          type: {
            type: 'string',
            pattern: /^(sentiment|keyword|summary|trend)$/,
            message: '分析类型必须是: sentiment, keyword, summary, trend'
          },
          data: { type: 'object', sanitize: true },
          options: { type: 'object', sanitize: true }
        }),

        modelConfig: (): Record<string, ValidationRule> => ({
          id: { type: 'string', pattern: /^[a-zA-Z0-9_-]+$/, maxLength: 50 },
          name: { type: 'string', maxLength: 100, sanitize: true },
          provider: { type: 'string', maxLength: 50, sanitize: true },
          apiKey: { type: 'string', minLength: 10, maxLength: 200 },
          baseURL: { type: 'url' },
          parameters: { type: 'object', sanitize: true }
        })
      }
    }
  }

  /**
   * 清理缓存
   */
  public clearCache(): void {
    this.validationCache.clear()
  }

  /**
   * 获取验证统计
   */
  public getValidationStats(): {
    cacheSize: number
    cacheHitRate: number
    totalValidations: number
    securityThreats: number
  } {
    // 这里应该实现统计逻辑
    return {
      cacheSize: this.validationCache.size,
      cacheHitRate: 0, // TODO: 实现缓存命中率统计
      totalValidations: 0, // TODO: 实现总验证次数统计
      securityThreats: 0 // TODO: 实现安全威胁统计
    }
  }

  // 私有方法
  private validateString(value: any, rule: ValidationRule, fieldName: string, errors: Array<any>): string {
    const stringValue = String(value)

    if (rule.minLength && stringValue.length < rule.minLength) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 长度不能少于 ${rule.minLength} 个字符`,
        value
      })
    }

    if (rule.maxLength && stringValue.length > rule.maxLength) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 长度不能超过 ${rule.maxLength} 个字符`,
        value
      })
    }

    if (rule.pattern && !rule.pattern.test(stringValue)) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 格式不正确`,
        value
      })
    }

    return stringValue
  }

  private validateNumber(value: any, rule: ValidationRule, fieldName: string, errors: Array<any>): number {
    const numValue = Number(value)

    if (isNaN(numValue)) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 必须是数字`,
        value
      })
      return numValue
    }

    if (rule.integer && !Number.isInteger(numValue)) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 必须是整数`,
        value
      })
    }

    if (rule.min !== undefined && numValue < rule.min) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 不能小于 ${rule.min}`,
        value
      })
    }

    if (rule.max !== undefined && numValue > rule.max) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 不能大于 ${rule.max}`,
        value
      })
    }

    return numValue
  }

  private validateEmail(value: any, rule: ValidationRule, fieldName: string, errors: Array<any>): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const stringValue = String(value)

    if (!emailRegex.test(stringValue)) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 邮箱格式不正确`,
        value
      })
    }

    return stringValue
  }

  private validateUrl(value: any, rule: ValidationRule, fieldName: string, errors: Array<any>): string {
    const stringValue = String(value)

    try {
      new URL(stringValue)
    } catch {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} URL格式不正确`,
        value
      })
    }

    return stringValue
  }

  private validateDate(value: any, rule: ValidationRule, fieldName: string, errors: Array<any>): Date {
    let dateValue: Date

    if (value instanceof Date) {
      dateValue = value
    } else {
      dateValue = new Date(value)
    }

    if (isNaN(dateValue.getTime())) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 日期格式不正确`,
        value
      })
    }

    return dateValue
  }

  private validateArray(value: any, rule: ValidationRule, fieldName: string, errors: Array<any>): any[] {
    if (!Array.isArray(value)) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 必须是数组`,
        value
      })
      return []
    }

    if (rule.minItems && value.length < rule.minItems) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 至少需要 ${rule.minItems} 个元素`,
        value
      })
    }

    if (rule.maxItems && value.length > rule.maxItems) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 最多只能有 ${rule.maxItems} 个元素`,
        value
      })
    }

    // 验证数组元素
    if (rule.itemType) {
      return value.map((item, index) => {
        const result = this.validateValue(item, rule.itemType!, `${fieldName}[${index}]`)
        if (!result.isValid) {
          errors.push(...result.errors)
        }
        return result.sanitizedData
      })
    }

    return value
  }

  private validateObjectValue(value: any, rule: ValidationRule, fieldName: string, errors: Array<any>): any {
    if (typeof value !== 'object' || value === null) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName} 必须是对象`,
        value
      })
      return {}
    }

    // 验证对象属性
    if (rule.properties) {
      const sanitizedObject: any = {}
      
      for (const [propName, propRule] of Object.entries(rule.properties)) {
        const propValue = value[propName]
        const result = this.validateValue(propValue, propRule, `${fieldName}.${propName}`)
        
        if (!result.isValid) {
          errors.push(...result.errors)
        } else {
          sanitizedObject[propName] = result.sanitizedData
        }
      }
      
      return sanitizedObject
    }

    return value
  }

  private validateCustom(value: any, rule: ValidationRule, fieldName: string, errors: Array<any>): any {
    if (rule.validator) {
      const result = rule.validator(value)
      
      if (result === false) {
        errors.push({
          field: fieldName,
          message: rule.message || `${fieldName} 验证失败`,
          value
        })
      } else if (typeof result === 'string') {
        errors.push({
          field: fieldName,
          message: result,
          value
        })
      }
    }

    return value
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  private containsSensitiveData(data: string): boolean {
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // 信用卡号
      /\b\d{3}-\d{2}-\d{4}\b/, // 社会保险号
      /password\s*[:=]\s*\S+/i, // 密码
      /api[_-]?key\s*[:=]\s*\S+/i, // API密钥
      /token\s*[:=]\s*\S+/i // 令牌
    ]

    return sensitivePatterns.some(pattern => pattern.test(data))
  }

  private generateCacheKey(data: any, schema: any): string {
    try {
      return btoa(JSON.stringify({ data, schema })).substring(0, 32)
    } catch {
      return Math.random().toString(36).substring(2)
    }
  }
}

// 创建全局验证管理器实例
export const inputValidator = InputValidationManager.getInstance()

// 导出验证规则创建器
export const ValidationRules = InputValidationManager.createRules()