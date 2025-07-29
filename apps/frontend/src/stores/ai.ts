import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { aiApi } from '@/api/ApiClient'
import type { 
  AIModel, 
  ScheduledTask, 
  AIAnalysis,
  AIServiceState,
  ServiceStatus
} from '@/types'

// 分析历史参数接口
interface AnalysisHistoryParams {
  period?: string
  limit?: number
  [key: string]: any
}

/**
 * AI服务Store - 管理AI模型、调度任务、分析历史等
 */
export const useAIStore = defineStore('ai', () => {
  // ===== State =====
  const models = ref<AIModel[]>([])
  const scheduledTasks = ref<ScheduledTask[]>([])
  const analysisHistory = ref<AIAnalysis[]>([])
  
  const serviceStatus = ref<AIServiceState['serviceStatus']>({
    overall: 'unknown',
    models: 'unknown',
    scheduler: 'unknown',
    performance: 'unknown'
  })
  
  const serviceStats = ref<AIServiceState['serviceStats']>({
    activeModels: 0,
    runningTasks: 0,
    todayAnalyses: 0
  })
  
  const performanceMetrics = ref<AIServiceState['performanceMetrics']>({
    avgResponseTime: 0,
    requestsPerMinute: 0,
    errorRate: 0,
    lastUpdateTime: ''
  })

  // ===== Getters =====
  const getAIModels = computed(() => models.value)
  
  const getActiveModels = computed(() => 
    models.value.filter(m => m.status === 'active')
  )
  
  const getScheduledTasks = computed(() => scheduledTasks.value)
  
  const getRunningTasks = computed(() => 
    scheduledTasks.value.filter(t => t.status === 'running')
  )
  
  const getAnalysisHistory = computed(() => analysisHistory.value)
  const getServiceStatus = computed(() => serviceStatus.value)
  const getServiceStats = computed(() => serviceStats.value)
  const getPerformanceData = computed(() => performanceMetrics.value)
  
  const isAIServiceHealthy = computed(() => 
    serviceStatus.value.overall === 'healthy'
  )

  // ===== Actions =====
  
  /**
   * 获取AI模型列表
   */
  const fetchAIModels = async (): Promise<void> => {
    try {
      const response = await aiApi.getModelList()
      models.value = response.data.data || []
    } catch (error) {
      console.error('获取AI模型失败:', error)
      throw error
    }
  }

  /**
   * 获取调度任务列表
   */
  const fetchScheduledTasks = async (): Promise<void> => {
    try {
      const response = await aiApi.getScheduledTasks()
      scheduledTasks.value = response.data.data || []
    } catch (error) {
      console.error('获取调度任务失败:', error)
      throw error
    }
  }

  /**
   * 获取分析历史
   */
  const fetchAnalysisHistory = async (params: AnalysisHistoryParams = {}): Promise<void> => {
    try {
      const response = await aiApi.getAnalysisHistory(params)
      analysisHistory.value = response.data.data || []
    } catch (error) {
      console.error('获取分析历史失败:', error)
      throw error
    }
  }

  /**
   * 获取服务状态
   */
  const fetchServiceStatus = async (): Promise<void> => {
    try {
      const response = await aiApi.getServiceStatus()
      serviceStatus.value = { ...serviceStatus.value, ...(response.data.data || {}) }
    } catch (error) {
      console.error('获取服务状态失败:', error)
      serviceStatus.value = { ...serviceStatus.value, overall: 'error' }
      throw error
    }
  }

  /**
   * 获取服务统计信息
   */
  const fetchServiceStats = async (): Promise<void> => {
    try {
      const [modelsRes, tasksRes, analysesRes] = await Promise.all([
        aiApi.getModelList(),
        aiApi.getScheduledTasks(),
        aiApi.getAnalysisHistory({ period: 'today', limit: 1 })
      ])
      
      const modelsData = modelsRes.data.data || []
      const tasksData = tasksRes.data.data || []
      const analysesData = analysesRes.data.data || { total: 0 }
      
      serviceStats.value = {
        activeModels: modelsData.filter((m: AIModel) => m.status === 'active').length,
        runningTasks: tasksData.filter((t: ScheduledTask) => t.status === 'running').length,
        todayAnalyses: analysesData.total || 0
      }
    } catch (error) {
      console.error('获取服务统计失败:', error)
      throw error
    }
  }

  /**
   * 获取性能数据
   */
  const fetchPerformanceData = async (timeRange: string = '1h'): Promise<void> => {
    try {
      const [metricsRes, apiRes, modelRes] = await Promise.all([
        aiApi.getPerformanceMetrics({ timeRange }),
        aiApi.getApiUsage(timeRange),
        aiApi.getModelStats()
      ])
      
      performanceMetrics.value = {
        ...performanceMetrics.value,
        systemStats: metricsRes.data.data?.system || {},
        apiMetrics: apiRes.data.data || [],
        modelMetrics: modelRes.data.data || []
      }
    } catch (error) {
      console.error('获取性能数据失败:', error)
      throw error
    }
  }

  /**
   * 更新模型状态
   */
  const updateModelStatus = (modelId: string, status: AIModel['status']): void => {
    const model = models.value.find(m => m.id === modelId)
    if (model) {
      model.status = status
    }
  }

  /**
   * 更新任务状态
   */
  const updateTaskStatus = (taskId: string, status: ScheduledTask['status']): void => {
    const task = scheduledTasks.value.find(t => t.id === taskId)
    if (task) {
      task.status = status
    }
  }

  /**
   * 刷新所有AI服务数据
   */
  const refreshAIServiceData = async (): Promise<void> => {
    await Promise.all([
      fetchAIModels(),
      fetchScheduledTasks(),
      fetchServiceStatus(),
      fetchServiceStats(),
      fetchPerformanceData()
    ])
  }

  /**
   * 清空所有AI数据
   */
  const clearAllAIData = (): void => {
    models.value = []
    scheduledTasks.value = []
    analysisHistory.value = []
    serviceStatus.value = {
      overall: 'unknown',
      models: 'unknown',
      scheduler: 'unknown',
      performance: 'unknown'
    }
    serviceStats.value = {
      activeModels: 0,
      runningTasks: 0,
      todayAnalyses: 0
    }
    performanceMetrics.value = {
      avgResponseTime: 0,
      requestsPerMinute: 0,
      errorRate: 0,
      lastUpdateTime: ''
    }
  }

  // 返回store接口
  return {
    // State
    models: readonly(models),
    scheduledTasks: readonly(scheduledTasks),
    analysisHistory: readonly(analysisHistory),
    serviceStatus: readonly(serviceStatus),
    serviceStats: readonly(serviceStats),
    performanceMetrics: readonly(performanceMetrics),
    
    // Getters
    getAIModels,
    getActiveModels,
    getScheduledTasks,
    getRunningTasks,
    getAnalysisHistory,
    getServiceStatus,
    getServiceStats,
    getPerformanceData,
    isAIServiceHealthy,
    
    // Actions
    fetchAIModels,
    fetchScheduledTasks,
    fetchAnalysisHistory,
    fetchServiceStatus,
    fetchServiceStats,
    fetchPerformanceData,
    updateModelStatus,
    updateTaskStatus,
    refreshAIServiceData,
    clearAllAIData
  }
})