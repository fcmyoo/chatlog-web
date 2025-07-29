/**
 * 现代化HTTP适配器
 * 提供统一的HTTP请求处理、重试机制、缓存集成和监控
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { apiConfig, ServiceConfig } from '../config/ApiConfig'
import { apiCacheManager, CacheOptions } from '../cache/CacheManager'
import { apiMonitor } from '../monitoring/MonitorManager'
import { apiSecurity } from '../security/SecurityManager'
import { inputValidator, ValidationRules } from '../security/ValidationManager'
import { handleError } from '@/utils/errorHandler'

export interface RequestOptions extends AxiosRequestConfig {
  // 缓存选项
  cache?: boolean | CacheOptions
  cacheKey?: string
  
  // 重试选项
  retry?: boolean | {
    attempts?: number
    delay?: number
    condition?: (error: AxiosError) => boolean
  }
  
  // 监控选项
  monitor?: boolean
  silent?: boolean // 静默模式，不显示错误通知
  
  // 超时选项
  timeout?: number
  
  // 安全选项
  requireAuth?: boolean
  apiKey?: string
  validateInput?: boolean
  sanitizeInput?: boolean
  bypassSecurity?: boolean // 仅用于系统内部调用
  
  // 输入验证选项
  inputSchema?: Record<string, any> // 验证规则
  validateParams?: boolean
  validateData?: boolean
}

export interface HttpResponse<T = any> extends AxiosResponse<T> {
  fromCache?: boolean
  requestDuration?: number
  retryCount?: number
}

/**
 * HTTP适配器基类
 */
export abstract class BaseHttpAdapter {
  protected client: AxiosInstance
  protected serviceName: string
  protected config: ServiceConfig

  constructor(serviceName: string, config: ServiceConfig) {
    this.serviceName = serviceName
    this.config = config
    this.client = this.createAxiosInstance()
    this.setupInterceptors()
  }

  /**
   * GET请求
   */
  public async get<T = any>(url: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'GET', url })
  }

  /**
   * POST请求
   */
  public async post<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'POST', url, data })
  }

  /**
   * PUT请求
   */
  public async put<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'PUT', url, data })
  }

  /**
   * DELETE请求
   */
  public async delete<T = any>(url: string, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'DELETE', url })
  }

  /**
   * PATCH请求
   */
  public async patch<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<HttpResponse<T>> {
    return this.request<T>({ ...options, method: 'PATCH', url, data })
  }

  /**
   * 核心请求方法
   */
  public async request<T = any>(options: RequestOptions): Promise<HttpResponse<T>> {
    const startTime = performance.now()
    let requestId: string | null = null
    let retryCount = 0

    // 安全验证和输入清理
    if (!options.bypassSecurity) {
      try {
        // 1. 输入验证
        if (options.validateInput !== false) {
          await this.validateRequestInput(options)
        }

        // 2. API密钥验证
        if (options.requireAuth !== false) {
          await this.validateAuthentication(options)
        }

        // 3. 安全检查和数据清理
        if (options.sanitizeInput !== false) {
          options = await this.sanitizeRequestData(options)
        }

      } catch (error) {
        // 安全验证失败，记录并抛出错误
        console.error('🔒 安全验证失败:', error)
        throw new Error(`安全验证失败: ${error.message}`)
      }
    }

    // 生成缓存键
    const cacheKey = this.generateCacheKey(options)
    
    // 检查缓存
    if (this.shouldUseCache(options)) {
      const cachedData = apiCacheManager.get<T>(cacheKey)
      if (cachedData) {
        const response: HttpResponse<T> = {
          data: cachedData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: options,
          fromCache: true,
          requestDuration: 0,
          retryCount: 0
        } as HttpResponse<T>

        if (options.monitor !== false) {
          requestId = apiMonitor.startRequest({
            url: options.url || '',
            method: options.method || 'GET',
            data: options.data,
            fromCache: true
          })
          apiMonitor.completeRequest(requestId, {
            status: 200,
            statusText: 'OK (Cached)',
            data: cachedData
          })
        }

        return response
      }
    }

    // 开始监控
    if (options.monitor !== false) {
      requestId = apiMonitor.startRequest({
        url: options.url || '',
        method: options.method || 'GET',
        data: options.data
      })
    }

    const executeRequest = async (): Promise<HttpResponse<T>> => {
      try {
        const response = await this.client.request<T>(options)
        const duration = performance.now() - startTime
        
        // 缓存成功响应
        if (this.shouldCacheResponse(options, response)) {
          const cacheOptions = this.getCacheOptions(options)
          apiCacheManager.set(cacheKey, response.data, cacheOptions)
        }

        // 完成监控
        if (requestId && options.monitor !== false) {
          apiMonitor.completeRequest(requestId, {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
            headers: response.headers
          })
        }

        const enhancedResponse: HttpResponse<T> = {
          ...response,
          fromCache: false,
          requestDuration: duration,
          retryCount
        }

        return enhancedResponse

      } catch (error) {
        const axiosError = error as AxiosError
        
        // 记录错误监控
        if (requestId && options.monitor !== false) {
          apiMonitor.recordError(requestId, {
            message: axiosError.message,
            code: axiosError.code,
            status: axiosError.response?.status,
            stack: axiosError.stack
          })
        }

        // 检查是否需要重试
        if (this.shouldRetry(options, axiosError, retryCount)) {
          retryCount++
          
          if (requestId && options.monitor !== false) {
            apiMonitor.recordRetry(requestId, retryCount)
          }

          const delay = this.calculateRetryDelay(retryCount, options)
          await this.sleep(delay)
          
          return executeRequest()
        }

        // 处理错误
        if (!options.silent) {
          handleError(axiosError, `${this.serviceName} API请求`)
        }

        throw axiosError
      }
    }

    return executeRequest()
  }

  /**
   * 批量请求
   */
  public async batch<T = any>(requests: RequestOptions[]): Promise<Array<HttpResponse<T> | Error>> {
    const promises = requests.map(request => 
      this.request<T>(request).catch(error => error)
    )
    
    return Promise.all(promises)
  }

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = performance.now()
    
    try {
      await this.get('/health', { 
        timeout: 5000, 
        cache: false, 
        retry: false,
        silent: true 
      })
      
      return {
        healthy: true,
        latency: performance.now() - startTime
      }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // 受保护的方法，子类可以重写
  protected createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers
      }
    })
  }

  protected setupInterceptors(): void {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证头
        const apiKeyHeader = apiConfig.getConfig().security.apiKeyHeader
        if (config.headers && !config.headers[apiKeyHeader]) {
          const apiKey = this.getApiKey()
          if (apiKey) {
            config.headers[apiKeyHeader] = apiKey
          }
        }

        // 添加CSRF保护
        if (apiConfig.getConfig().security.csrfProtection) {
          this.addCSRFProtection(config)
        }

        return config
      },
      (error) => Promise.reject(error)
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // 在这里可以添加全局错误处理逻辑
        return Promise.reject(error)
      }
    )
  }

  // 私有方法
  private generateCacheKey(options: RequestOptions): string {
    const { url, method = 'GET', params, data } = options
    
    if (options.cacheKey) {
      return options.cacheKey
    }

    const paramsStr = params ? JSON.stringify(params) : ''
    const dataStr = data ? JSON.stringify(data) : ''
    
    return `${this.serviceName}:${method}:${url}:${paramsStr}:${dataStr}`
  }

  private shouldUseCache(options: RequestOptions): boolean {
    if (options.cache === false) return false
    if (options.cache === true) return true
    if (typeof options.cache === 'object') return true
    
    // 默认只缓存GET请求
    return this.config.enableCache && (options.method || 'GET').toUpperCase() === 'GET'
  }

  private shouldCacheResponse(options: RequestOptions, response: AxiosResponse): boolean {
    // 只缓存成功响应
    if (response.status < 200 || response.status >= 300) return false
    
    return this.shouldUseCache(options)
  }

  private getCacheOptions(options: RequestOptions): CacheOptions {
    if (typeof options.cache === 'object') {
      return options.cache
    }
    
    return {
      ttl: this.config.cacheTimeout || 5 * 60 * 1000
    }
  }

  private shouldRetry(options: RequestOptions, error: AxiosError, retryCount: number): boolean {
    // 如果明确禁用重试
    if (options.retry === false) return false
    
    // 获取重试配置
    const retryConfig = typeof options.retry === 'object' ? options.retry : {}
    const maxAttempts = retryConfig.attempts || this.config.retryAttempts || 3
    
    // 超过最大重试次数
    if (retryCount >= maxAttempts) return false
    
    // 自定义重试条件
    if (retryConfig.condition) {
      return retryConfig.condition(error)
    }
    
    // 默认重试条件：网络错误或5xx错误
    if (!error.response) return true // 网络错误
    if (error.response.status >= 500) return true // 服务器错误
    if (error.response.status === 408) return true // 请求超时
    if (error.response.status === 429) return true // 限流
    
    return false
  }

  private calculateRetryDelay(retryCount: number, options: RequestOptions): number {
    const retryConfig = typeof options.retry === 'object' ? options.retry : {}
    const baseDelay = retryConfig.delay || this.config.retryDelay || 1000
    
    // 指数退避
    return baseDelay * Math.pow(2, retryCount - 1)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getApiKey(): string | null {
    // 从安全存储中获取API密钥
    // 这里应该从环境变量或安全存储中获取
    return null
  }

  private addCSRFProtection(config: any): void {
    // 从cookie或meta标签中获取CSRF令牌
    const csrfToken = this.getCSRFToken()
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }

  private getCSRFToken(): string | null {
    // 从cookie中获取CSRF令牌
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'csrf_token') {
        return value
      }
    }
    return null
  }
}

/**
 * Chatlog服务适配器
 */
export class ChatlogHttpAdapter extends BaseHttpAdapter {
  constructor() {
    const config = apiConfig.getServiceConfig('chatlog')
    super('Chatlog', config)
  }

  // CSV解析工具
  protected parseCSV(csvText: string): any[] {
    if (!csvText || typeof csvText !== 'string') {
      console.warn('parseCSV: 输入数据不是字符串', typeof csvText)
      return []
    }

    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim())
    const data = []

    // 字段名映射规则
    const fieldMapping: Record<string, string> = {
      'UserName': 'username',
      'NickName': 'nickname', 
      'Alias': 'alias',
      'Remark': 'remark'
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: any = {}

      headers.forEach((header, index) => {
        // 使用映射后的字段名，如果没有映射则使用原字段名
        const mappedField = fieldMapping[header] || header.toLowerCase()
        row[mappedField] = values[index] || ''
      })

      // 添加id字段（如果没有的话）
      if (!row.id && row.username) {
        row.id = row.username
      }

      data.push(row)
    }

    return data
  }

  // 会话数据解析
  protected parseSessions(sessionText: string): any[] {
    if (!sessionText || typeof sessionText !== 'string') {
      console.warn('parseSessions: 输入数据不是字符串')
      return []
    }

    const lines = sessionText.trim().split('\n').filter(line => line.trim())
    const sessions = []

    for (const line of lines) {
      if (line.trim()) {
        const match = line.match(/^(.+?)\((.+?)\)\s+(.+)$/)
        if (match) {
          const [, name, id, lastMessageTime] = match
          sessions.push({
            name: name.trim(),
            id: id.trim(),
            lastMessageTime: lastMessageTime.trim(),
            displayName: name.trim()
          })
        }
      }
    }

    return sessions
  }

  // 聊天记录解析
  protected parseChatLogs(chatlogText: any): any[] {
    if (!chatlogText) {
      console.warn('parseChatLogs: 输入数据为空')
      return []
    }

    let textData = chatlogText
    if (typeof chatlogText === 'object') {
      if (Array.isArray(chatlogText)) {
        return chatlogText
      } else {
        textData = JSON.stringify(chatlogText)
      }
    } else if (typeof chatlogText !== 'string') {
      textData = String(chatlogText)
    }

    const lines = textData.trim().split('\n')
    const chatLogs = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line) {
        const match = line.match(/^(.+?)\((.+?)\)\s+(.+)$/)
        if (match) {
          const [, senderName, senderId, time] = match
          let content = ''

          if (i + 1 < lines.length) {
            content = lines[i + 1].trim()
            i++
          }

          chatLogs.push({
            senderName: senderName.trim(),
            senderId: senderId.trim(),
            time: time.trim(),
            content,
            timestamp: new Date(time.trim()).getTime()
          })
        }
      }
    }

    return chatLogs
  }

  // 安全验证私有方法
  private async validateRequestInput(options: RequestOptions): Promise<void> {
    // 验证URL
    if (options.url && !this.isValidUrl(options.url)) {
      throw new Error(`无效的请求URL: ${options.url}`)
    }

    // 验证请求参数
    if (options.validateParams !== false && options.params) {
      const paramValidation = inputValidator.performSecurityCheck(options.params)
      if (!paramValidation.isSafe) {
        const threats = paramValidation.threats.map(t => t.message).join(', ')
        throw new Error(`请求参数安全检查失败: ${threats}`)
      }
    }

    // 验证请求数据
    if (options.validateData !== false && options.data) {
      const dataValidation = inputValidator.performSecurityCheck(options.data)
      if (!dataValidation.isSafe) {
        const threats = dataValidation.threats.map(t => t.message).join(', ')
        throw new Error(`请求数据安全检查失败: ${threats}`)
      }
    }

    // 使用自定义验证规则
    if (options.inputSchema) {
      const requestData = {
        params: options.params,
        data: options.data
      }
      
      const validation = inputValidator.validateObject(requestData, options.inputSchema)
      if (!validation.isValid) {
        const errors = validation.errors.map(e => e.message).join(', ')
        throw new Error(`请求验证失败: ${errors}`)
      }
    }
  }

    private async validateAuthentication(options: RequestOptions): Promise<void> {
    const securityConfig = apiConfig.getConfig().security

    // chatlog服务通常不需要API密钥认证（本地服务）
    if (this.serviceName.toLowerCase() === 'chatlog') {
      return
    }

    // 检查是否需要API密钥
    if (securityConfig.apiKeyHeader && !options.apiKey) {
      // 尝试从全局配置获取
      const globalApiKey = await this.getGlobalApiKey()
      if (!globalApiKey) {
        throw new Error('缺少必需的API密钥')
      }
      options.apiKey = globalApiKey
    }

    // 验证API密钥格式
    if (options.apiKey && !this.isValidApiKey(options.apiKey)) {
      throw new Error('API密钥格式无效')
    }
  }

  private async sanitizeRequestData(options: RequestOptions): Promise<RequestOptions> {
    const sanitizedOptions = { ...options }

    // 清理请求参数
    if (sanitizedOptions.params) {
      const paramCheck = inputValidator.performSecurityCheck(sanitizedOptions.params)
      sanitizedOptions.params = paramCheck.sanitizedData || sanitizedOptions.params
    }

    // 清理请求数据
    if (sanitizedOptions.data) {
      const dataCheck = inputValidator.performSecurityCheck(sanitizedOptions.data)
      sanitizedOptions.data = dataCheck.sanitizedData || sanitizedOptions.data
    }

    return sanitizedOptions
  }

  private isValidUrl(url: string): boolean {
    try {
      // 允许相对路径
      if (url.startsWith('/')) return true
      
      // 验证绝对URL
      const urlObj = new URL(url)
      
      // 只允许HTTP和HTTPS协议
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false
      }
      
      // 防止访问内网地址（可选）
      const hostname = urlObj.hostname
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
        // 在开发环境允许，生产环境可能需要禁止
        return process.env.NODE_ENV !== 'production'
      }

      return true
    } catch {
      return false
    }
  }

  private isValidApiKey(apiKey: string): boolean {
    // 基本格式验证
    if (!apiKey || apiKey.length < 10 || apiKey.length > 200) {
      return false
    }

    // 检查是否包含危险字符
    const dangerousChars = /<>"\\'&/
    if (dangerousChars.test(apiKey)) {
      return false
    }

    return true
  }

  private async getGlobalApiKey(): Promise<string | null> {
    try {
      // 从安全管理器获取当前服务的API密钥
      const keys = apiSecurity.getApiKeysList()
      const serviceKey = keys.find(key => key.service === this.serviceName.toLowerCase() && key.isActive)
      
      if (serviceKey) {
        return await apiSecurity.getApiKey(serviceKey.id)
      }
      
      return null
    } catch (error) {
      console.warn('获取全局API密钥失败:', error)
      return null
    }
  }

  private getApiKey(): string | null {
    // 从安全存储中获取API密钥
    // 这里应该从环境变量或安全存储中获取
    return null
  }

  private addCSRFProtection(config: any): void {
    // 从cookie或meta标签中获取CSRF令牌
    const csrfToken = this.getCSRFToken()
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken
    }
  }

  private getCSRFToken(): string | null {
    // 从cookie中获取CSRF令牌
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'csrf_token') {
        return value
      }
    }
    return null
  }
}

/**
 * AI服务适配器
 */
export class AIHttpAdapter extends BaseHttpAdapter {
  constructor() {
    const config = apiConfig.getServiceConfig('ai')
    super('AI', config)
  }

  protected setupInterceptors(): void {
    super.setupInterceptors()

    // AI服务特定的拦截器
    this.client.interceptors.request.use((config) => {
      // 添加AI服务特定的头部
      if (config.headers) {
        config.headers['X-Service-Type'] = 'AI'
        config.headers['X-Client-Version'] = '1.0.0'
      }
      return config
    })
  }
}