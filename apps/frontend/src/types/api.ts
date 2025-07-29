/**
 * API 相关类型定义
 * 集中管理所有API接口的TypeScript类型
 */

// 基础响应类型
export interface ApiResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  config?: any
}

// 聊天记录参数
export interface ChatLogParams {
  contactId?: string
  chatroomId?: string
  startTime?: string
  endTime?: string
  keyword?: string
  limit?: number
  offset?: number
}

// 聊天记录项
export interface ChatLog {
  senderName: string
  senderId: string
  time: string
  content: string
  timestamp: number
}

// 联系人信息
export interface Contact {
  username: string
  nickname: string
  remark: string
  avatar: string
}

// 聊天群信息
export interface ChatRoom {
  id: string
  name: string
  memberCount?: number
  avatar?: string
}

// 会话信息
export interface Session {
  id: string
  name: string
  lastMessageTime: string
  displayName: string
}

// AI分析参数
export interface AnalysisParams {
  type: 'sentiment' | 'keyword' | 'summary' | 'trend'
  data: any
  options?: {
    language?: string
    model?: string
    maxLength?: number
  }
}

// AI模型配置
export interface ModelConfig {
  id: string
  name: string
  provider: string
  apiKey: string
  baseURL?: string
  parameters?: Record<string, any>
}

// 定时任务
export interface ScheduleTask {
  id?: string
  name: string
  type: string
  schedule: string
  config: any
  enabled: boolean
}

// 性能指标
export interface PerformanceMetrics {
  totalRequests: number
  successRate: number
  averageResponseTime: number
  slowRequestCount: number
  errorCount: number
  cacheHitRate: number
  topSlowEndpoints: Array<{ url: string; averageTime: number; count: number }>
  errorsByType: Record<string, number>
  requestsByHour: number[]
}

// 系统状态
export interface SystemStats {
  cpu: number
  memory: number
  disk: number
  uptime: number
  activeConnections: number
}

// API使用统计
export interface ApiUsage {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  requestsByEndpoint: Record<string, number>
}

// 健康检查结果
export interface HealthStatus {
  chatlog: {
    healthy: boolean
    latency?: number
    error?: string
  }
  ai: {
    healthy: boolean
    latency?: number
    error?: string
  }
}

// 服务状态
export interface ServiceStatus {
  status: 'running' | 'stopped' | 'error'
  uptime: number
  version: string
  lastRestart?: string
}

// 服务日志
export interface ServiceLog {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: any
}

// 数据统计
export interface DataStats {
  totalContacts: number
  totalChatrooms: number
  totalSessions: number
  totalMessages: number
  lastUpdate: string
}

// 错误信息
export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

// 请求选项
export interface RequestOptions {
  timeout?: number
  retry?: boolean | {
    attempts?: number
    delay?: number
  }
  cache?: boolean | {
    ttl?: number
    key?: string
  }
  headers?: Record<string, string>
  params?: Record<string, any>
  data?: any
}

// 导出选项
export interface ExportOptions {
  format: 'csv' | 'json' | 'excel'
  filename?: string
  includeHeaders?: boolean
}

// API客户端接口
export interface ApiClientInterface {
  // Chatlog API
  getChatLogs(params?: ChatLogParams): Promise<ApiResponse<ChatLog[]>>
  getContacts(): Promise<ApiResponse<Contact[]>>
  searchContacts(keyword: string): Promise<ApiResponse<Contact[]>>
  getChatrooms(): Promise<ApiResponse<ChatRoom[]>>
  getSessions(): Promise<ApiResponse<Session[]>>
  exportChatLogs(params: ChatLogParams & ExportOptions): Promise<ApiResponse<string>>
  
  // 媒体资源URL
  getImageUrl(id: string): string
  getVideoUrl(id: string): string
  getFileUrl(id: string): string
  getVoiceUrl(id: string): string
  getDataUrl(path: string): string
  
  // AI API
  performAnalysis(params: AnalysisParams): Promise<ApiResponse<any>>
  getAnalysisHistory(params?: { limit?: number; offset?: number; type?: string }): Promise<ApiResponse<any[]>>
  getAnalysisById(id: string): Promise<ApiResponse<any>>
  deleteAnalysis(id: string): Promise<ApiResponse<void>>
  getAnalysisTypes(): Promise<ApiResponse<string[]>>
  
  // 模型管理
  getModelList(): Promise<ApiResponse<ModelConfig[]>>
  getModelConfig(): Promise<ApiResponse<Record<string, ModelConfig>>>
  updateModelConfig(config: Record<string, ModelConfig>): Promise<ApiResponse<void>>
  testModelConnection(modelId: string, config: ModelConfig): Promise<ApiResponse<{ success: boolean; latency?: number; error?: string }>>
  getModelStats(): Promise<ApiResponse<any>>
  
  // 定时任务
  getScheduleConfig(): Promise<ApiResponse<any>>
  updateScheduleConfig(config: any): Promise<ApiResponse<void>>
  getScheduledTasks(): Promise<ApiResponse<ScheduleTask[]>>
  createScheduledTask(task: Omit<ScheduleTask, 'id'>): Promise<ApiResponse<ScheduleTask>>
  updateScheduledTask(taskId: string, task: Partial<ScheduleTask>): Promise<ApiResponse<ScheduleTask>>
  deleteScheduledTask(taskId: string): Promise<ApiResponse<void>>
  triggerScheduledTask(taskId: string): Promise<ApiResponse<any>>
  
  // 监控和统计
  getPerformanceMetrics(timeRange?: { start: string; end: string }): Promise<ApiResponse<PerformanceMetrics>>
  getSystemStats(): Promise<ApiResponse<SystemStats>>
  getApiUsage(period?: string): Promise<ApiResponse<ApiUsage>>
  healthCheck(): Promise<HealthStatus>
  
  // 服务管理
  getServiceStatus(): Promise<ApiResponse<ServiceStatus>>
  restartService(): Promise<ApiResponse<void>>
  getServiceLogs(params?: { level?: string; lines?: number; since?: string }): Promise<ApiResponse<ServiceLog[]>>
  
  // 数据管理
  getDataStats(): Promise<ApiResponse<DataStats>>
  refreshDataCache(): Promise<ApiResponse<void>>
  clearDataCache(): Promise<ApiResponse<void>>
} 