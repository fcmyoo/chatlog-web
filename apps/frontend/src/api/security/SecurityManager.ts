/**
 * API安全管理器
 * 提供API密钥管理、加密存储、访问控制和安全策略
 */

export interface ApiKeyConfig {
  id: string
  name: string
  service: 'chatlog' | 'ai' | 'external'
  key: string
  encrypted: boolean
  expiresAt?: Date
  permissions?: string[]
  rateLimit?: {
    requests: number
    window: number // ms
  }
  lastUsed?: Date
  isActive: boolean
}

export interface SecurityPolicy {
  enableEncryption: boolean
  keyRotationDays: number
  maxFailedAttempts: number
  lockoutDuration: number // ms
  requireHTTPS: boolean
  enableCORS: boolean
  allowedOrigins?: string[]
  enableCSRF: boolean
}

export interface SecurityAuditLog {
  id: string
  timestamp: Date
  action: 'key_created' | 'key_accessed' | 'key_expired' | 'auth_failed' | 'rate_limited'
  keyId?: string
  service?: string
  ip?: string
  userAgent?: string
  success: boolean
  details?: any
}

/**
 * 加密工具类
 */
class CryptoUtils {
  private static readonly ALGORITHM = 'AES-GCM'
  private static readonly KEY_LENGTH = 256

  /**
   * 生成加密密钥
   */
  public static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * 加密数据
   */
  public static async encrypt(data: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv,
      },
      key,
      encoder.encode(data)
    )

    return {
      encrypted: Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
    }
  }

  /**
   * 解密数据
   */
  public static async decrypt(encryptedData: string, iv: string, key: CryptoKey): Promise<string> {
    const decoder = new TextDecoder()
    
    const encrypted = new Uint8Array(encryptedData.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
    const ivArray = new Uint8Array(iv.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))

    const decrypted = await crypto.subtle.decrypt(
      {
        name: this.ALGORITHM,
        iv: ivArray,
      },
      key,
      encrypted
    )

    return decoder.decode(decrypted)
  }

  /**
   * 生成安全的随机字符串
   */
  public static generateSecureRandom(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    
    return Array.from(array, byte => chars[byte % chars.length]).join('')
  }

  /**
   * 计算哈希值
   */
  public static async hash(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

/**
 * API安全管理器
 */
export class ApiSecurityManager {
  private static instance: ApiSecurityManager
  private apiKeys = new Map<string, ApiKeyConfig>()
  private auditLogs: SecurityAuditLog[] = []
  private masterKey: CryptoKey | null = null
  private failedAttempts = new Map<string, { count: number; lastAttempt: Date }>()
  private rateLimits = new Map<string, { requests: number[]; window: number }>()
  
  private readonly securityPolicy: SecurityPolicy = {
    enableEncryption: import.meta.env.PROD,
    keyRotationDays: 90,
    maxFailedAttempts: 3,
    lockoutDuration: 15 * 60 * 1000, // 15分钟
    requireHTTPS: import.meta.env.PROD,
    enableCORS: true,
    allowedOrigins: ['http://localhost:8080', 'https://chatlog.example.com'],
    enableCSRF: true
  }

  private constructor() {}

  public static getInstance(): ApiSecurityManager {
    if (!ApiSecurityManager.instance) {
      ApiSecurityManager.instance = new ApiSecurityManager()
    }
    return ApiSecurityManager.instance
  }

  /**
   * 初始化安全管理器
   */
  public async initialize(): Promise<void> {
    try {
      // 生成或加载主密钥
      await this.initializeMasterKey()
      
      // 加载现有API密钥
      await this.loadApiKeys()
      
      // 启动清理定时器
      this.startCleanupTimer()
      
      // 验证安全策略
      this.validateSecurityPolicy()
      
      console.log('🔐 API安全管理器初始化完成')
      
    } catch (error) {
      console.error('安全管理器初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建API密钥
   */
  public async createApiKey(config: {
    name: string
    service: 'chatlog' | 'ai' | 'external'
    permissions?: string[]
    expiresIn?: number // days
    rateLimit?: { requests: number; window: number }
  }): Promise<ApiKeyConfig> {
    const keyId = CryptoUtils.generateSecureRandom(16)
    const rawKey = CryptoUtils.generateSecureRandom(64)
    
    let encryptedKey = rawKey
    let encrypted = false
    
    // 如果启用加密，加密存储密钥
    if (this.securityPolicy.enableEncryption && this.masterKey) {
      const { encrypted: enc, iv } = await CryptoUtils.encrypt(rawKey, this.masterKey)
      encryptedKey = `${enc}:${iv}`
      encrypted = true
    }
    
    const apiKey: ApiKeyConfig = {
      id: keyId,
      name: config.name,
      service: config.service,
      key: encryptedKey,
      encrypted,
      expiresAt: config.expiresIn ? new Date(Date.now() + config.expiresIn * 24 * 60 * 60 * 1000) : undefined,
      permissions: config.permissions || ['read'],
      rateLimit: config.rateLimit,
      isActive: true
    }
    
    this.apiKeys.set(keyId, apiKey)
    await this.persistApiKeys()
    
    // 记录审计日志
    this.logSecurityEvent({
      action: 'key_created',
      keyId,
      service: config.service,
      success: true,
      details: { name: config.name, permissions: config.permissions }
    })
    
    // 返回包含明文密钥的配置（仅此一次）
    return {
      ...apiKey,
      key: rawKey // 返回明文密钥
    }
  }

  /**
   * 获取API密钥
   */
  public async getApiKey(keyId: string): Promise<string | null> {
    const keyConfig = this.apiKeys.get(keyId)
    
    if (!keyConfig || !keyConfig.isActive) {
      this.logSecurityEvent({
        action: 'auth_failed',
        keyId,
        success: false,
        details: { reason: 'key_not_found_or_inactive' }
      })
      return null
    }
    
    // 检查密钥是否过期
    if (keyConfig.expiresAt && keyConfig.expiresAt < new Date()) {
      this.logSecurityEvent({
        action: 'key_expired',
        keyId,
        success: false
      })
      return null
    }
    
    // 检查速率限制
    if (keyConfig.rateLimit && !this.checkRateLimit(keyId, keyConfig.rateLimit)) {
      this.logSecurityEvent({
        action: 'rate_limited',
        keyId,
        success: false
      })
      return null
    }
    
    let rawKey = keyConfig.key
    
    // 如果密钥被加密，解密它
    if (keyConfig.encrypted && this.masterKey) {
      try {
        const [encrypted, iv] = keyConfig.key.split(':')
        rawKey = await CryptoUtils.decrypt(encrypted, iv, this.masterKey)
      } catch (error) {
        this.logSecurityEvent({
          action: 'auth_failed',
          keyId,
          success: false,
          details: { reason: 'decryption_failed', error: error.message }
        })
        return null
      }
    }
    
    // 更新最后使用时间
    keyConfig.lastUsed = new Date()
    
    this.logSecurityEvent({
      action: 'key_accessed',
      keyId,
      service: keyConfig.service,
      success: true
    })
    
    return rawKey
  }

  /**
   * 撤销API密钥
   */
  public async revokeApiKey(keyId: string): Promise<boolean> {
    const keyConfig = this.apiKeys.get(keyId)
    
    if (!keyConfig) {
      return false
    }
    
    keyConfig.isActive = false
    await this.persistApiKeys()
    
    this.logSecurityEvent({
      action: 'key_revoked',
      keyId,
      service: keyConfig.service,
      success: true
    })
    
    return true
  }

  /**
   * 轮换API密钥
   */
  public async rotateApiKey(keyId: string): Promise<ApiKeyConfig | null> {
    const oldConfig = this.apiKeys.get(keyId)
    
    if (!oldConfig) {
      return null
    }
    
    // 创建新密钥
    const newKey = await this.createApiKey({
      name: oldConfig.name + ' (rotated)',
      service: oldConfig.service,
      permissions: oldConfig.permissions,
      rateLimit: oldConfig.rateLimit
    })
    
    // 撤销旧密钥
    await this.revokeApiKey(keyId)
    
    this.logSecurityEvent({
      action: 'key_rotated',
      keyId: newKey.id,
      service: oldConfig.service,
      success: true,
      details: { oldKeyId: keyId }
    })
    
    return newKey
  }

  /**
   * 获取所有API密钥列表（不包含实际密钥）
   */
  public getApiKeysList(): Omit<ApiKeyConfig, 'key'>[] {
    return Array.from(this.apiKeys.values()).map(({ key, ...config }) => config)
  }

  /**
   * 验证权限
   */
  public hasPermission(keyId: string, permission: string): boolean {
    const keyConfig = this.apiKeys.get(keyId)
    
    if (!keyConfig || !keyConfig.isActive) {
      return false
    }
    
    return keyConfig.permissions?.includes(permission) || keyConfig.permissions?.includes('admin') || false
  }

  /**
   * 获取安全审计日志
   */
  public getAuditLogs(options?: {
    limit?: number
    service?: string
    action?: string
    startDate?: Date
    endDate?: Date
  }): SecurityAuditLog[] {
    let logs = this.auditLogs
    
    if (options?.service) {
      logs = logs.filter(log => log.service === options.service)
    }
    
    if (options?.action) {
      logs = logs.filter(log => log.action === options.action)
    }
    
    if (options?.startDate) {
      logs = logs.filter(log => log.timestamp >= options.startDate!)
    }
    
    if (options?.endDate) {
      logs = logs.filter(log => log.timestamp <= options.endDate!)
    }
    
    // 按时间倒序排列
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    if (options?.limit) {
      logs = logs.slice(0, options.limit)
    }
    
    return logs
  }

  /**
   * 获取安全统计
   */
  public getSecurityStats(): {
    totalKeys: number
    activeKeys: number
    expiredKeys: number
    totalEvents: number
    failedAttempts: number
    rateListedEvents: number
    lastWeekEvents: SecurityAuditLog[]
  } {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const keys = Array.from(this.apiKeys.values())
    const lastWeekEvents = this.auditLogs.filter(log => log.timestamp >= oneWeekAgo)
    
    return {
      totalKeys: keys.length,
      activeKeys: keys.filter(k => k.isActive).length,
      expiredKeys: keys.filter(k => k.expiresAt && k.expiresAt < now).length,
      totalEvents: this.auditLogs.length,
      failedAttempts: this.auditLogs.filter(log => log.action === 'auth_failed').length,
      rateListedEvents: this.auditLogs.filter(log => log.action === 'rate_limited').length,
      lastWeekEvents
    }
  }

  /**
   * 清理过期数据
   */
  public cleanup(): void {
    const now = new Date()
    
    // 清理过期的失败尝试记录
    for (const [key, attempts] of this.failedAttempts.entries()) {
      if (now.getTime() - attempts.lastAttempt.getTime() > this.securityPolicy.lockoutDuration) {
        this.failedAttempts.delete(key)
      }
    }
    
    // 清理旧的审计日志（保留90天）
    const retentionDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    this.auditLogs = this.auditLogs.filter(log => log.timestamp >= retentionDate)
    
    // 清理速率限制记录
    for (const [key, limit] of this.rateLimits.entries()) {
      const cutoff = now.getTime() - limit.window
      limit.requests = limit.requests.filter(time => time > cutoff)
      
      if (limit.requests.length === 0) {
        this.rateLimits.delete(key)
      }
    }
  }

  // 私有方法
  private async initializeMasterKey(): Promise<void> {
    try {
      // 尝试从安全存储加载主密钥
      const storedKey = this.getStoredMasterKey()
      
      if (storedKey) {
        this.masterKey = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(storedKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))),
          { name: 'AES-GCM' },
          true,
          ['encrypt', 'decrypt']
        )
      } else {
        // 生成新的主密钥
        this.masterKey = await CryptoUtils.generateKey()
        await this.storeMasterKey()
      }
    } catch (error) {
      console.warn('主密钥初始化失败，将在不加密模式下运行:', error)
      this.masterKey = null
    }
  }

  private getStoredMasterKey(): string | null {
    try {
      return localStorage.getItem('api_master_key')
    } catch {
      return null
    }
  }

  private async storeMasterKey(): Promise<void> {
    if (!this.masterKey) return
    
    try {
      const keyData = await crypto.subtle.exportKey('raw', this.masterKey)
      const keyHex = Array.from(new Uint8Array(keyData)).map(b => b.toString(16).padStart(2, '0')).join('')
      localStorage.setItem('api_master_key', keyHex)
    } catch (error) {
      console.warn('主密钥存储失败:', error)
    }
  }

  private async loadApiKeys(): Promise<void> {
    try {
      const storedKeys = localStorage.getItem('api_keys')
      if (storedKeys) {
        const keys: ApiKeyConfig[] = JSON.parse(storedKeys)
        keys.forEach(key => {
          if (key.expiresAt) {
            key.expiresAt = new Date(key.expiresAt)
          }
          if (key.lastUsed) {
            key.lastUsed = new Date(key.lastUsed)
          }
          this.apiKeys.set(key.id, key)
        })
      }
    } catch (error) {
      console.warn('API密钥加载失败:', error)
    }
  }

  private async persistApiKeys(): Promise<void> {
    try {
      const keys = Array.from(this.apiKeys.values())
      localStorage.setItem('api_keys', JSON.stringify(keys))
    } catch (error) {
      console.warn('API密钥持久化失败:', error)
    }
  }

  private checkRateLimit(keyId: string, rateLimit: { requests: number; window: number }): boolean {
    const now = Date.now()
    const limit = this.rateLimits.get(keyId) || { requests: [], window: rateLimit.window }
    
    // 清理过期的请求记录
    const cutoff = now - rateLimit.window
    limit.requests = limit.requests.filter(time => time > cutoff)
    
    // 检查是否超过限制
    if (limit.requests.length >= rateLimit.requests) {
      return false
    }
    
    // 记录当前请求
    limit.requests.push(now)
    this.rateLimits.set(keyId, limit)
    
    return true
  }

  private logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'timestamp'>): void {
    const logEntry: SecurityAuditLog = {
      id: CryptoUtils.generateSecureRandom(16),
      timestamp: new Date(),
      ip: this.getClientIP(),
      userAgent: navigator.userAgent,
      ...event
    }
    
    this.auditLogs.push(logEntry)
    
    // 在控制台输出安全事件
    if (!event.success) {
      console.warn('🔒 安全事件:', logEntry)
    }
  }

  private getClientIP(): string {
    // 在实际应用中，应从请求头获取真实IP
    return 'unknown'
  }

  private startCleanupTimer(): void {
    // 每小时清理一次
    setInterval(() => {
      this.cleanup()
    }, 60 * 60 * 1000)
  }

  private validateSecurityPolicy(): void {
    if (this.securityPolicy.requireHTTPS && location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.warn('🔒 安全警告: 在生产环境中需要HTTPS')
    }
    
    if (!this.securityPolicy.enableEncryption) {
      console.warn('🔒 安全警告: API密钥加密已禁用')
    }
  }
}

// 创建全局安全管理器实例
export const apiSecurity = ApiSecurityManager.getInstance()