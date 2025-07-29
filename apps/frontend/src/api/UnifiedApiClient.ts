/**
 * 现代化统一API客户端
 * 整合所有服务的API调用，提供类型安全的接口
 */

import { ChatlogHttpAdapter, AIHttpAdapter, HttpResponse, RequestOptions } from './adapters/HttpAdapter'
import { apiConfig } from './config/ApiConfig'
import { apiCacheManager } from './cache/CacheManager'
import { apiMonitor, PerformanceMetrics } from './monitoring/MonitorManager'

// 类型定义
export interface ChatLogParams {
  contactId?: string
  chatroomId?: string
  startTime?: string
  endTime?: string
  keyword?: string
  limit?: number
  offset?: number
}

export interface AnalysisParams {
  type: 'sentiment' | 'keyword' | 'summary' | 'trend'
  data: any
  options?: {
    language?: string
    model?: string
    maxLength?: number
  }
}

export interface ModelConfig {
  id: string
  name: string
  provider: string
  apiKey: string
  baseURL?: string
  parameters?: Record<string, any>
}

export interface ScheduleTask {
  id?: string
  name: string
  type: string
  schedule: string
  config: any
  enabled: boolean
}

/**
 * 统一API客户端
 */
export class UnifiedApiClient {
  private static instance: UnifiedApiClient
  private chatlogAdapter: ChatlogHttpAdapter
  private aiAdapter: AIHttpAdapter
  private initialized = false

  private constructor() {
    this.chatlogAdapter = new ChatlogHttpAdapter()
    this.aiAdapter = new AIHttpAdapter()
  }

  public static getInstance(): UnifiedApiClient {
    if (!UnifiedApiClient.instance) {
      UnifiedApiClient.instance = new UnifiedApiClient()
    }
    return UnifiedApiClient.instance
  }

  /**
   * 初始化客户端
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // 验证配置
      const validation = apiConfig.validateConfig()
      if (!validation.isValid) {
        console.warn('API配置验证失败:', validation.errors)
      }

      // 启动自动缓存清理
      apiCacheManager.startAutoCleanup(60000) // 每分钟清理一次

      // 启动实时监控
      if (apiConfig.getConfig().monitoring.enableMetrics) {
        apiMonitor.startRealTimeMonitoring((metrics) => {
          this.handlePerformanceMetrics(metrics)
        }, 30000)
      }

      // 预热缓存
      await this.preheatCache()

      this.initialized = true
      console.log('🚀 统一API客户端初始化完成')

    } catch (error) {
      console.error('API客户端初始化失败:', error)
      throw error
    }
  }

  // ===================
  // Chatlog API 方法
  // ===================

  /**
   * 获取聊天记录
   */
  public async getChatLogs(params: ChatLogParams = {}, options?: RequestOptions): Promise<HttpResponse<any[]>> {
    const response = await this.chatlogAdapter.get('/api/v1/chatlog', {
      params,
      cache: { ttl: 5 * 60 * 1000 }, // 缓存5分钟
      ...options
    })

    // 解析聊天记录数据
    if (response.data && !response.fromCache) {
      response.data = (this.chatlogAdapter as any).parseChatLogs(response.data)
    }

    return response
  }

  /**
   * 获取联系人列表
   */
  public async getContacts(options?: RequestOptions): Promise<HttpResponse<any[]>> {
    const response = await this.chatlogAdapter.get('/api/v1/contact', {
      cache: { ttl: 10 * 60 * 1000 }, // 缓存10分钟
      ...options
    })

    if (response.data && !response.fromCache) {
      try {
        const parsedData = (this.chatlogAdapter as any).parseCSV(response.data)
        response.data = Array.isArray(parsedData) ? parsedData : []
      } catch (error) {
        console.error('联系人数据解析失败:', error)
        response.data = []
      }
    }

    // 确保data始终是数组
    if (!Array.isArray(response.data)) {
      response.data = []
    }

    return response
  }

  /**
   * 搜索联系人
   */
  public async searchContacts(keyword: string, options?: RequestOptions): Promise<HttpResponse<any[]>> {
    const response = await this.chatlogAdapter.get('/api/v1/contact', {
      params: { keyword },
      cache: { ttl: 2 * 60 * 1000 }, // 搜索结果缓存2分钟
      ...options
    })

    if (response.data && !response.fromCache) {
      try {
        const parsedData = (this.chatlogAdapter as any).parseCSV(response.data)
        response.data = Array.isArray(parsedData) ? parsedData : []
      } catch (error) {
        console.error('搜索联系人数据解析失败:', error)
        response.data = []
      }
    }

    // 确保data始终是数组
    if (!Array.isArray(response.data)) {
      response.data = []
    }

    return response
  }

  /**
   * 获取群聊列表
   */
  public async getChatrooms(options?: RequestOptions): Promise<HttpResponse<any[]>> {
    const response = await this.chatlogAdapter.get('/api/v1/chatroom', {
      cache: { ttl: 10 * 60 * 1000 },
      ...options
    })

    if (response.data && !response.fromCache) {
      try {
        const parsedData = (this.chatlogAdapter as any).parseCSV(response.data)
        response.data = Array.isArray(parsedData) ? parsedData : []
      } catch (error) {
        console.error('群聊数据解析失败:', error)
        response.data = []
      }
    }

    // 确保data始终是数组
    if (!Array.isArray(response.data)) {
      response.data = []
    }

    return response
  }

  /**
   * 获取会话列表
   */
  public async getSessions(options?: RequestOptions): Promise<HttpResponse<any[]>> {
    const response = await this.chatlogAdapter.get('/api/v1/session', {
      cache: { ttl: 5 * 60 * 1000 },
      ...options
    })

    if (response.data && !response.fromCache) {
      try {
        const parsedData = (this.chatlogAdapter as any).parseSessions(response.data)
        response.data = Array.isArray(parsedData) ? parsedData : []
      } catch (error) {
        console.error('会话数据解析失败:', error)
        response.data = []
      }
    }

    // 确保data始终是数组
    if (!Array.isArray(response.data)) {
      response.data = []
    }

    return response
  }

  /**
   * 导出聊天记录
   */
  public async exportChatLogs(params: ChatLogParams & { format: string }, options?: RequestOptions): Promise<HttpResponse<string>> {
    return this.chatlogAdapter.get('/api/v1/chatlog', {
      params,
      cache: false, // 导出不缓存
      ...options
    })
  }

  // 多媒体资源URL生成
  public getImageUrl(id: string): string {
    const baseURL = apiConfig.getServiceConfig('chatlog').baseURL
    return `${baseURL}/image/${id}`
  }

  public getVideoUrl(id: string): string {
    const baseURL = apiConfig.getServiceConfig('chatlog').baseURL
    return `${baseURL}/video/${id}`
  }

  public getFileUrl(id: string): string {
    const baseURL = apiConfig.getServiceConfig('chatlog').baseURL
    return `${baseURL}/file/${id}`
  }

  public getVoiceUrl(id: string): string {
    const baseURL = apiConfig.getServiceConfig('chatlog').baseURL
    return `${baseURL}/voice/${id}`
  }

  // ===================
  // AI API 方法
  // ===================

  /**
   * 执行AI分析
   */
  public async performAnalysis(params: AnalysisParams, options?: RequestOptions): Promise<HttpResponse<any>> {
    return this.aiAdapter.post('/ai-api/analysis', params, {
      cache: false, // AI分析结果不缓存
      timeout: 300000, // 5分钟超时
      ...options
    })
  }

  /**
   * 获取分析历史
   */
  public async getAnalysisHistory(params?: { limit?: number; offset?: number; type?: string }, options?: RequestOptions): Promise<HttpResponse<any[]>> {
    return this.aiAdapter.get('/ai-api/analysis/history', {
      params,
      cache: { ttl: 2 * 60 * 1000 }, // 缓存2分钟
      ...options
    })
  }

  /**
   * 获取分析详情
   */
  public async getAnalysisById(id: string, options?: RequestOptions): Promise<HttpResponse<any>> {
    return this.aiAdapter.get(`/ai-api/analysis/${id}`, {
      cache: { ttl: 10 * 60 * 1000 }, // 缓存10分钟
      ...options
    })
  }

  /**
   * 删除分析记录
   */
  public async deleteAnalysis(id: string, options?: RequestOptions): Promise<HttpResponse<void>> {
    const response = await this.aiAdapter.delete(`/ai-api/analysis/${id}`, options)
    
    // 删除相关缓存
    apiCacheManager.deleteByTag(`analysis-${id}`)
    
    return response
  }

  /**
   * 获取支持的分析类型
   */
  public async getAnalysisTypes(options?: RequestOptions): Promise<HttpResponse<string[]>> {
    return this.aiAdapter.get('/ai-api/analysis/types', {
      cache: { ttl: 30 * 60 * 1000 }, // 缓存30分钟
      ...options
    })
  }

  // ===================
  // 模型管理 API
  // ===================

  /**
   * 获取模型列表
   */
  public async getModelList(options?: RequestOptions): Promise<HttpResponse<ModelConfig[]>> {
    return this.aiAdapter.get('/ai-api/models', {
      cache: { ttl: 5 * 60 * 1000 },
      ...options
    })
  }

  /**
   * 获取模型配置
   */
  public async getModelConfig(options?: RequestOptions): Promise<HttpResponse<Record<string, ModelConfig>>> {
    return this.aiAdapter.get('/ai-api/models/config', {
      cache: { ttl: 5 * 60 * 1000 },
      ...options
    })
  }

  /**
   * 更新模型配置
   */
  public async updateModelConfig(config: Record<string, ModelConfig>, options?: RequestOptions): Promise<HttpResponse<void>> {
    const response = await this.aiAdapter.put('/ai-api/models/config', config, options)
    
    // 清理模型相关缓存
    apiCacheManager.deleteByTag('models')
    
    return response
  }

  /**
   * 测试模型连接
   */
  public async testModelConnection(modelId: string, config: ModelConfig, options?: RequestOptions): Promise<HttpResponse<{ success: boolean; latency?: number; error?: string }>> {
    return this.aiAdapter.post(`/ai-api/models/${modelId}/test`, config, {
      cache: false,
      timeout: 30000,
      ...options
    })
  }

  /**
   * 获取模型统计
   */
  public async getModelStats(options?: RequestOptions): Promise<HttpResponse<any>> {
    return this.aiAdapter.get('/ai-api/models/stats', {
      cache: { ttl: 60 * 1000 }, // 缓存1分钟
      ...options
    })
  }

  // ===================
  // 调度器 API
  // ===================

  /**
   * 获取调度配置
   */
  public async getScheduleConfig(options?: RequestOptions): Promise<HttpResponse<any>> {
    return this.aiAdapter.get('/ai-api/scheduler/config', {
      cache: { ttl: 5 * 60 * 1000 },
      ...options
    })
  }

  /**
   * 更新调度配置
   */
  public async updateScheduleConfig(config: any, options?: RequestOptions): Promise<HttpResponse<void>> {
    return this.aiAdapter.put('/ai-api/scheduler/config', config, options)
  }

  /**
   * 获取调度任务列表
   */
  public async getScheduledTasks(options?: RequestOptions): Promise<HttpResponse<ScheduleTask[]>> {
    return this.aiAdapter.get('/ai-api/scheduler/tasks', {
      cache: { ttl: 2 * 60 * 1000 },
      ...options
    })
  }

  /**
   * 创建调度任务
   */
  public async createScheduledTask(task: Omit<ScheduleTask, 'id'>, options?: RequestOptions): Promise<HttpResponse<ScheduleTask>> {
    const response = await this.aiAdapter.post('/ai-api/scheduler/tasks', task, options)
    
    // 清理调度任务缓存
    apiCacheManager.deleteByTag('scheduler')
    
    return response
  }

  /**
   * 更新调度任务
   */
  public async updateScheduledTask(taskId: string, task: Partial<ScheduleTask>, options?: RequestOptions): Promise<HttpResponse<ScheduleTask>> {
    const response = await this.aiAdapter.put(`/ai-api/scheduler/tasks/${taskId}`, task, options)
    
    apiCacheManager.deleteByTag('scheduler')
    
    return response
  }

  /**
   * 删除调度任务
   */
  public async deleteScheduledTask(taskId: string, options?: RequestOptions): Promise<HttpResponse<void>> {
    const response = await this.aiAdapter.delete(`/ai-api/scheduler/tasks/${taskId}`, options)
    
    apiCacheManager.deleteByTag('scheduler')
    
    return response
  }

  /**
   * 触发调度任务
   */
  public async triggerScheduledTask(taskId: string, options?: RequestOptions): Promise<HttpResponse<any>> {
    return this.aiAdapter.post(`/ai-api/scheduler/tasks/${taskId}/trigger`, {}, {
      cache: false,
      ...options
    })
  }

  // ===================
  // 性能监控 API
  // ===================

  /**
   * 获取性能指标
   */
  public async getPerformanceMetrics(timeRange?: { start: string; end: string }, options?: RequestOptions): Promise<HttpResponse<any>> {
    return this.aiAdapter.get('/ai-api/performance/metrics', {
      params: timeRange,
      cache: { ttl: 30 * 1000 }, // 缓存30秒
      ...options
    })
  }

  /**
   * 获取系统状态
   */
  public async getSystemStats(options?: RequestOptions): Promise<HttpResponse<any>> {
    return this.aiAdapter.get('/ai-api/performance/system', {
      cache: { ttl: 10 * 1000 }, // 缓存10秒
      ...options
    })
  }

  /**
   * 获取API使用情况
   */
  public async getApiUsage(period: string = '24h', options?: RequestOptions): Promise<HttpResponse<any>> {
    return this.aiAdapter.get('/ai-api/performance/usage', {
      params: { period },
      cache: { ttl: 5 * 60 * 1000 },
      ...options
    })
  }

  // ===================
  // 服务管理 API
  // ===================

  /**
   * 健康检查
   */
  public async healthCheck(): Promise<{ chatlog: any; ai: any }> {
    const [chatlogHealth, aiHealth] = await Promise.allSettled([
      this.chatlogAdapter.healthCheck(),
      this.aiAdapter.healthCheck()
    ])

    return {
      chatlog: chatlogHealth.status === 'fulfilled' ? chatlogHealth.value : { healthy: false, error: 'Service unavailable' },
      ai: aiHealth.status === 'fulfilled' ? aiHealth.value : { healthy: false, error: 'Service unavailable' }
    }
  }

  /**
   * 获取服务状态
   */
  public async getServiceStatus(options?: RequestOptions): Promise<HttpResponse<any>> {
    return this.aiAdapter.get('/ai-api/status', {
      cache: { ttl: 10 * 1000 },
      ...options
    })
  }

  /**
   * 重启服务
   */
  public async restartService(options?: RequestOptions): Promise<HttpResponse<void>> {
    return this.aiAdapter.post('/ai-api/service/restart', {}, {
      cache: false,
      timeout: 60000,
      ...options
    })
  }

  /**
   * 获取服务日志
   */
  public async getServiceLogs(params?: { level?: string; lines?: number; since?: string }, options?: RequestOptions): Promise<HttpResponse<string[]>> {
    return this.aiAdapter.get('/ai-api/service/logs', {
      params,
      cache: false,
      ...options
    })
  }

  // ===================
  // 数据管理 API
  // ===================

  /**
   * 获取数据统计
   */
  public async getDataStats(options?: RequestOptions): Promise<HttpResponse<any>> {
    return this.aiAdapter.get('/ai-api/data/stats', {
      cache: { ttl: 5 * 60 * 1000 },
      ...options
    })
  }

  /**
   * 刷新数据缓存
   */
  public async refreshDataCache(options?: RequestOptions): Promise<HttpResponse<void>> {
    const response = await this.aiAdapter.post('/ai-api/data/cache/refresh', {}, options)
    
    // 同时清理本地缓存
    apiCacheManager.clear()
    
    return response
  }

  /**
   * 清空数据缓存
   */
  public async clearDataCache(options?: RequestOptions): Promise<HttpResponse<void>> {
    const response = await this.aiAdapter.delete('/ai-api/data/cache', options)
    
    // 同时清理本地缓存
    apiCacheManager.clear()
    
    return response
  }

  // ===================
  // 工具方法
  // ===================

  /**
   * 批量请求
   */
  public async batchRequest<T>(requests: Array<{ adapter: 'chatlog' | 'ai'; options: RequestOptions }>): Promise<Array<HttpResponse<T> | Error>> {
    const promises = requests.map(({ adapter, options }) => {
      const client = adapter === 'chatlog' ? this.chatlogAdapter : this.aiAdapter
      return client.request<T>(options).catch(error => error)
    })

    return Promise.all(promises)
  }

  /**
   * 获取客户端性能指标
   */
  public getClientMetrics(): PerformanceMetrics {
    return apiMonitor.getPerformanceMetrics()
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats() {
    return apiCacheManager.getStats()
  }

  /**
   * 清理所有缓存
   */
  public clearAllCache(): void {
    apiCacheManager.clear()
  }

  /**
   * 导出监控数据
   */
  public exportMonitoringData(format: 'json' | 'csv' = 'json'): string {
    return apiMonitor.exportMetrics(format)
  }

  // 私有方法
  private async preheatCache(): Promise<void> {
    const commonRequests = [
      {
        key: 'analysis-types',
        fetcher: () => this.getAnalysisTypes({ cache: false }),
        options: { ttl: 30 * 60 * 1000 }
      }
    ]

    await apiCacheManager.preheat(commonRequests)
  }

  private handlePerformanceMetrics(metrics: PerformanceMetrics): void {
    // 性能指标处理逻辑
    if (metrics.errorCount > 10) {
      console.warn('🚨 错误数量过多:', metrics.errorCount)
    }

    if (metrics.averageResponseTime > 5000) {
      console.warn('🐌 平均响应时间过长:', metrics.averageResponseTime + 'ms')
    }

    if (metrics.successRate < 95) {
      console.warn('📉 成功率过低:', metrics.successRate + '%')
    }
  }
}

// 创建并导出全局实例
export const apiClient = UnifiedApiClient.getInstance()

// 向后兼容的导出
export default apiClient