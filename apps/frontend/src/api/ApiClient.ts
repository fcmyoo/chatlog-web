/**
 * API客户端兼容性桥接
 * 确保现有代码能无缝迁移到新的API架构
 */

import type { 
  ApiResponse, 
  ChatLogParams, 
  ChatLog, 
  Contact, 
  ChatRoom, 
  Session, 
  AnalysisParams, 
  ModelConfig, 
  ScheduleTask, 
  PerformanceMetrics, 
  SystemStats, 
  ApiUsage, 
  HealthStatus, 
  ServiceStatus, 
  ServiceLog, 
  DataStats,
  ExportOptions,
  RequestOptions
} from '@/types/api'

// 直接从TypeScript模块导入，避免循环依赖
import { apiClient } from './UnifiedApiClient'

// 向后兼容的API对象
const chatlogApi = {
  getChatLogs: (params?: ChatLogParams): Promise<ApiResponse<ChatLog[]>> => 
    apiClient.getChatLogs(params),
  getContacts: (): Promise<ApiResponse<Contact[]>> => 
    apiClient.getContacts(),
  searchContacts: (keyword: string): Promise<ApiResponse<Contact[]>> => 
    apiClient.searchContacts(keyword),
  getChatrooms: (): Promise<ApiResponse<ChatRoom[]>> => 
    apiClient.getChatrooms(),
  getSessions: (): Promise<ApiResponse<Session[]>> => 
    apiClient.getSessions(),
  exportChatLogs: (params: ChatLogParams & ExportOptions): Promise<ApiResponse<string>> => 
    apiClient.exportChatLogs({ ...params, format: 'csv' }),
  getImageUrl: (id: string): string => 
    apiClient.getImageUrl(id),
  getVideoUrl: (id: string): string => 
    apiClient.getVideoUrl(id),
  getFileUrl: (id: string): string => 
    apiClient.getFileUrl(id),
  getVoiceUrl: (id: string): string => 
    apiClient.getVoiceUrl(id),
  getDataUrl: (path: string): string => {
    const baseURL = (apiClient as any).chatlogAdapter?.config?.baseURL || ''
    return `${baseURL}/data/${path}`
  }
}

const aiApi = {
  performAnalysis: (params: AnalysisParams): Promise<ApiResponse<any>> => 
    apiClient.performAnalysis(params),
  getAnalysisHistory: (params?: { limit?: number; offset?: number; type?: string }): Promise<ApiResponse<any[]>> => 
    apiClient.getAnalysisHistory(params),
  getAnalysisById: (id: string): Promise<ApiResponse<any>> => 
    apiClient.getAnalysisById(id),
  deleteAnalysis: (id: string): Promise<ApiResponse<void>> => 
    apiClient.deleteAnalysis(id),
  getAnalysisTypes: (): Promise<ApiResponse<string[]>> => 
    apiClient.getAnalysisTypes(),
  
  getModelList: (): Promise<ApiResponse<ModelConfig[]>> => 
    apiClient.getModelList(),
  getModelConfig: (): Promise<ApiResponse<Record<string, ModelConfig>>> => 
    apiClient.getModelConfig(),
  updateModelConfig: (config: Record<string, ModelConfig>): Promise<ApiResponse<void>> => 
    apiClient.updateModelConfig(config),
  testModelConnection: (modelId: string, config: ModelConfig): Promise<ApiResponse<{ success: boolean; latency?: number; error?: string }>> => 
    apiClient.testModelConnection(modelId, config),
  getModelStats: (): Promise<ApiResponse<any>> => 
    apiClient.getModelStats(),
  
  getScheduleConfig: (): Promise<ApiResponse<any>> => 
    apiClient.getScheduleConfig(),
  updateScheduleConfig: (config: any): Promise<ApiResponse<void>> => 
    apiClient.updateScheduleConfig(config),
  getScheduledTasks: (): Promise<ApiResponse<ScheduleTask[]>> => 
    apiClient.getScheduledTasks(),
  createScheduledTask: (task: Omit<ScheduleTask, 'id'>): Promise<ApiResponse<ScheduleTask>> => 
    apiClient.createScheduledTask(task),
  updateScheduledTask: (taskId: string, task: Partial<ScheduleTask>): Promise<ApiResponse<ScheduleTask>> => 
    apiClient.updateScheduledTask(taskId, task),
  deleteScheduledTask: (taskId: string): Promise<ApiResponse<void>> => 
    apiClient.deleteScheduledTask(taskId),
  triggerScheduledTask: (taskId: string): Promise<ApiResponse<any>> => 
    apiClient.triggerScheduledTask(taskId),
  
  getPerformanceMetrics: (timeRange?: { start: string; end: string }): Promise<ApiResponse<PerformanceMetrics>> => 
    apiClient.getPerformanceMetrics(timeRange),
  getSystemStats: (): Promise<ApiResponse<SystemStats>> => 
    apiClient.getSystemStats(),
  getApiUsage: (period: string = '24h'): Promise<ApiResponse<ApiUsage>> => 
    apiClient.getApiUsage(period),
  
  getHealthStatus: async (): Promise<ApiResponse<any>> => {
    const health = await apiClient.healthCheck()
    return { data: health.ai } as ApiResponse<any>
  },
  
  getServiceStatus: (): Promise<ApiResponse<ServiceStatus>> => 
    apiClient.getServiceStatus(),
  restartService: (): Promise<ApiResponse<void>> => 
    apiClient.restartService(),
  getServiceLogs: (params?: { level?: string; lines?: number; since?: string }): Promise<ApiResponse<ServiceLog[]>> => 
    apiClient.getServiceLogs(params),
  
  getDataStats: (): Promise<ApiResponse<DataStats>> => 
    apiClient.getDataStats(),
  refreshDataCache: (): Promise<ApiResponse<void>> => 
    apiClient.refreshDataCache(),
  clearDataCache: (): Promise<ApiResponse<void>> => 
    apiClient.clearDataCache()
}

// 为了向后兼容，重新导出为原有的类结构
export class ChatlogClient {
  async getChatLogs(params?: ChatLogParams): Promise<ApiResponse<ChatLog[]>> {
    const response = await chatlogApi.getChatLogs(params)
    return response
  }

  async getContacts(): Promise<ApiResponse<Contact[]>> {
    const response = await chatlogApi.getContacts()
    return response
  }

  async searchContacts(keyword: string): Promise<ApiResponse<Contact[]>> {
    const response = await chatlogApi.searchContacts(keyword)
    return response
  }

  async getChatrooms(): Promise<ApiResponse<ChatRoom[]>> {
    const response = await chatlogApi.getChatrooms()
    return response
  }

  async getSessions(): Promise<ApiResponse<Session[]>> {
    const response = await chatlogApi.getSessions()
    return response
  }

  async getChatLogsRaw(params?: ChatLogParams): Promise<ApiResponse<ChatLog[]>> {
    return this.getChatLogs(params)
  }

  async exportChatLogs(params: ChatLogParams & ExportOptions): Promise<ApiResponse<string>> {
    return chatlogApi.exportChatLogs(params)
  }

  getImageUrl(id: string): string {
    return chatlogApi.getImageUrl(id)
  }

  getVideoUrl(id: string): string {
    return chatlogApi.getVideoUrl(id)
  }

  getFileUrl(id: string): string {
    return chatlogApi.getFileUrl(id)
  }

  getVoiceUrl(id: string): string {
    return chatlogApi.getVoiceUrl(id)
  }

  getDataUrl(path: string): string {
    return chatlogApi.getDataUrl(path)
  }
}

export class AIClient {
  async performAnalysis(params: AnalysisParams): Promise<ApiResponse<any>> {
    return aiApi.performAnalysis(params)
  }

  async getAnalysisHistory(params?: { limit?: number; offset?: number; type?: string }): Promise<ApiResponse<any[]>> {
    return aiApi.getAnalysisHistory(params)
  }

  async getAnalysisById(id: string): Promise<ApiResponse<any>> {
    return aiApi.getAnalysisById(id)
  }

  async deleteAnalysis(id: string): Promise<ApiResponse<void>> {
    return aiApi.deleteAnalysis(id)
  }

  async getAnalysisTypes(): Promise<ApiResponse<string[]>> {
    return aiApi.getAnalysisTypes()
  }

  async getModelList(): Promise<ApiResponse<ModelConfig[]>> {
    return aiApi.getModelList()
  }

  async getModelConfig(): Promise<ApiResponse<Record<string, ModelConfig>>> {
    return aiApi.getModelConfig()
  }

  async updateModelConfig(config: Record<string, ModelConfig>): Promise<ApiResponse<void>> {
    return aiApi.updateModelConfig(config)
  }

  async testModelConnection(modelId: string, config: ModelConfig): Promise<ApiResponse<{ success: boolean; latency?: number; error?: string }>> {
    return aiApi.testModelConnection(modelId, config)
  }

  async getModelStats(): Promise<ApiResponse<any>> {
    return aiApi.getModelStats()
  }

  async getScheduleConfig(): Promise<ApiResponse<any>> {
    return aiApi.getScheduleConfig()
  }

  async updateScheduleConfig(config: any): Promise<ApiResponse<void>> {
    return aiApi.updateScheduleConfig(config)
  }

  async triggerScheduledTask(taskId: string): Promise<ApiResponse<any>> {
    return aiApi.triggerScheduledTask(taskId)
  }

  async getScheduledTasks(): Promise<ApiResponse<ScheduleTask[]>> {
    return aiApi.getScheduledTasks()
  }

  async createScheduledTask(task: Omit<ScheduleTask, 'id'>): Promise<ApiResponse<ScheduleTask>> {
    return aiApi.createScheduledTask(task)
  }

  async updateScheduledTask(taskId: string, task: Partial<ScheduleTask>): Promise<ApiResponse<ScheduleTask>> {
    return aiApi.updateScheduledTask(taskId, task)
  }

  async deleteScheduledTask(taskId: string): Promise<ApiResponse<void>> {
    return aiApi.deleteScheduledTask(taskId)
  }

  async getPerformanceMetrics(timeRange?: { start: string; end: string }): Promise<ApiResponse<PerformanceMetrics>> {
    return aiApi.getPerformanceMetrics(timeRange)
  }

  async getSystemStats(): Promise<ApiResponse<SystemStats>> {
    return aiApi.getSystemStats()
  }

  async getApiUsage(period: string = '24h'): Promise<ApiResponse<ApiUsage>> {
    return aiApi.getApiUsage(period)
  }

  async getHealthStatus(): Promise<ApiResponse<any>> {
    return aiApi.getHealthStatus()
  }

  async getServiceStatus(): Promise<ApiResponse<ServiceStatus>> {
    return aiApi.getServiceStatus()
  }

  async restartService(): Promise<ApiResponse<void>> {
    return aiApi.restartService()
  }

  async getServiceLogs(params?: { level?: string; lines?: number; since?: string }): Promise<ApiResponse<ServiceLog[]>> {
    return aiApi.getServiceLogs(params)
  }

  async getDataStats(): Promise<ApiResponse<DataStats>> {
    return aiApi.getDataStats()
  }

  async refreshDataCache(): Promise<ApiResponse<void>> {
    return aiApi.refreshDataCache()
  }

  async clearDataCache(): Promise<ApiResponse<void>> {
    return aiApi.clearDataCache()
  }
}

// 兼容的ApiClient类
export class ApiClient {
  public chatlog: ChatlogClient
  public ai: AIClient

  constructor() {
    this.chatlog = new ChatlogClient()
    this.ai = new AIClient()
  }

  // 便捷方法 - 向后兼容
  async getChatLogs(params?: ChatLogParams): Promise<ApiResponse<ChatLog[]>> {
    return this.chatlog.getChatLogs(params)
  }

  async getContacts(): Promise<ApiResponse<Contact[]>> {
    return this.chatlog.getContacts()
  }

  async searchContacts(keyword: string): Promise<ApiResponse<Contact[]>> {
    return this.chatlog.searchContacts(keyword)
  }

  async getChatrooms(): Promise<ApiResponse<ChatRoom[]>> {
    return this.chatlog.getChatrooms()
  }

  async getSessions(): Promise<ApiResponse<Session[]>> {
    return this.chatlog.getSessions()
  }

  async performAnalysis(params: AnalysisParams): Promise<ApiResponse<any>> {
    return this.ai.performAnalysis(params)
  }

  async getAnalysisHistory(params?: { limit?: number; offset?: number; type?: string }): Promise<ApiResponse<any[]>> {
    return this.ai.getAnalysisHistory(params)
  }

  // 健康检查
  async healthCheck(): Promise<HealthStatus> {
    return apiClient.healthCheck()
  }
}

// 创建单例实例
const apiClientInstance = new ApiClient()

// 向后兼容的导出
export { apiClientInstance as default }

// 保持原有的导出格式以兼容现有代码
export { chatlogApi, aiApi }

// 注意：ChatlogClient, AIClient, ApiClient 已通过 export class 语句导出 