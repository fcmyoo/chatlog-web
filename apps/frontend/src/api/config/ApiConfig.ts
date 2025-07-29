/**
 * API配置管理
 * 提供统一的服务配置、环境变量管理和安全配置
 */

export interface ServiceConfig {
  baseURL: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  enableCache: boolean
  cacheTimeout: number  
  headers?: Record<string, string>
}

export interface ApiConfiguration {
  services: {
    chatlog: ServiceConfig
    ai: ServiceConfig
  }
  security: {
    enableEncryption: boolean
    apiKeyHeader: string
    csrfProtection: boolean
  }
  monitoring: {
    enableLogging: boolean
    enableMetrics: boolean
    slowRequestThreshold: number
  }
  cache: {
    defaultTTL: number
    maxSize: number
    enableCompression: boolean
  }
}

// 环境变量配置
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  if (typeof window !== 'undefined') {
    // 浏览器环境 - 从运行时配置获取
    return (window as any).__API_CONFIG__?.[key] || import.meta.env[`VITE_${key}`] || defaultValue
  }
  return defaultValue
}

// 默认API配置
export const DEFAULT_API_CONFIG: ApiConfiguration = {
  services: {
    chatlog: {
      baseURL: getEnvVar('CHATLOG_API_URL', import.meta.env.PROD ? 'http://127.0.0.1:5030' : ''),
      timeout: parseInt(getEnvVar('CHATLOG_TIMEOUT', '10000')),
      retryAttempts: 3,
      retryDelay: 1000,
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5分钟
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/csv, text/plain'
      }
    },
    ai: {
      baseURL: getEnvVar('AI_API_URL', import.meta.env.PROD ? 'http://localhost:3001' : ''),
      timeout: parseInt(getEnvVar('AI_TIMEOUT', '300000')), 
      retryAttempts: 2,
      retryDelay: 2000,
      enableCache: false, // AI响应通常不适合缓存
      cacheTimeout: 0,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  },
  security: {
    enableEncryption: import.meta.env.PROD,
    apiKeyHeader: 'X-API-Key',
    csrfProtection: true
  },
  monitoring: {
    enableLogging: true,
    enableMetrics: process.env.NODE_ENV === 'production',
    slowRequestThreshold: 3000 // 3秒
  },
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5分钟
    maxSize: 100, // 最多缓存100个响应
    enableCompression: true
  }
}

// 配置管理器
export class ApiConfigManager {
  private static instance: ApiConfigManager
  private config: ApiConfiguration

  private constructor(initialConfig: ApiConfiguration = DEFAULT_API_CONFIG) {
    this.config = { ...initialConfig }
  }

  public static getInstance(): ApiConfigManager {
    if (!ApiConfigManager.instance) {
      ApiConfigManager.instance = new ApiConfigManager()
    }
    return ApiConfigManager.instance
  }

  /**
   * 获取完整配置
   */
  public getConfig(): ApiConfiguration {
    return { ...this.config }
  }

  /**
   * 获取服务配置
   */
  public getServiceConfig(serviceName: keyof ApiConfiguration['services']): ServiceConfig {
    return { ...this.config.services[serviceName] }
  }

  /**
   * 更新服务配置
   */
  public updateServiceConfig(
    serviceName: keyof ApiConfiguration['services'], 
    updates: Partial<ServiceConfig>
  ): void {
    this.config.services[serviceName] = {
      ...this.config.services[serviceName],
      ...updates
    }
  }

  /**
   * 更新安全配置
   */
  public updateSecurityConfig(updates: Partial<ApiConfiguration['security']>): void {
    this.config.security = {
      ...this.config.security,
      ...updates
    }
  }

  /**
   * 验证配置有效性
   */
  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 验证服务URL
    Object.entries(this.config.services).forEach(([serviceName, config]) => {
      if (!config.baseURL && process.env.NODE_ENV === 'production') {
        errors.push(`${serviceName} 服务缺少baseURL配置`)
      }

      if (config.timeout <= 0) {
        errors.push(`${serviceName} 服务timeout配置无效`)
      }

      if (config.retryAttempts < 0) {
        errors.push(`${serviceName} 服务retryAttempts配置无效`)
      }
    })

    // 验证缓存配置
    if (this.config.cache.maxSize <= 0) {
      errors.push('缓存maxSize配置无效')
    }

    if (this.config.cache.defaultTTL <= 0) {
      errors.push('缓存defaultTTL配置无效')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 重置为默认配置
   */
  public resetToDefaults(): void {
    this.config = { ...DEFAULT_API_CONFIG }
  }

  /**
   * 从远程配置服务加载配置
   */
  public async loadRemoteConfig(configUrl: string): Promise<void> {
    try {
      const response = await fetch(configUrl)
      if (!response.ok) {
        throw new Error(`配置加载失败: ${response.status}`)
      }
      
      const remoteConfig = await response.json()
      this.config = { ...this.config, ...remoteConfig }
      
      console.log('API配置已从远程更新')
    } catch (error) {
      console.warn('远程配置加载失败，使用默认配置:', error)
    }
  }
}

// 导出配置管理器实例
export const apiConfig = ApiConfigManager.getInstance()