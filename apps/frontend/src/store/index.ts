import { createStore, Store } from 'vuex'
import api from '@/api/unified'
import { aiApi } from '@/api/ApiClient'
import type { 
  RootState, 
  Contact, 
  ChatRoom, 
  Session, 
  ChatMessage, 
  AIModel, 
  ScheduledTask, 
  AIAnalysis,
  AIServiceState
} from '@/types'

// Vuex mutations类型
export enum MutationTypes {
  SET_LOADING = 'SET_LOADING',
  SET_CONTACTS = 'SET_CONTACTS',
  SET_CHATROOMS = 'SET_CHATROOMS',
  SET_SESSIONS = 'SET_SESSIONS',
  SET_CHAT_LOGS = 'SET_CHAT_LOGS',
  SET_PAGINATION = 'SET_PAGINATION',
  SET_AI_MODELS = 'SET_AI_MODELS',
  SET_SCHEDULED_TASKS = 'SET_SCHEDULED_TASKS',
  SET_ANALYSIS_HISTORY = 'SET_ANALYSIS_HISTORY',
  SET_SERVICE_STATUS = 'SET_SERVICE_STATUS',
  SET_SERVICE_STATS = 'SET_SERVICE_STATS',
  SET_PERFORMANCE_DATA = 'SET_PERFORMANCE_DATA',
  UPDATE_MODEL_STATUS = 'UPDATE_MODEL_STATUS',
  UPDATE_TASK_STATUS = 'UPDATE_TASK_STATUS'
}

// Vuex actions类型
export enum ActionTypes {
  FETCH_CONTACTS = 'fetchContacts',
  FETCH_CHATROOMS = 'fetchChatrooms',
  FETCH_SESSIONS = 'fetchSessions',
  FETCH_CHAT_LOGS = 'fetchChatLogs',
  FETCH_AI_MODELS = 'fetchAIModels',
  FETCH_SCHEDULED_TASKS = 'fetchScheduledTasks',
  FETCH_ANALYSIS_HISTORY = 'fetchAnalysisHistory',
  FETCH_SERVICE_STATUS = 'fetchServiceStatus',
  FETCH_SERVICE_STATS = 'fetchServiceStats',
  FETCH_PERFORMANCE_DATA = 'fetchPerformanceData',
  REFRESH_AI_SERVICE_DATA = 'refreshAIServiceData'
}

// 分页参数接口
interface PaginationParams {
  page: number
  pageSize: number
  total: number
}

// 获取聊天记录参数接口
interface FetchChatLogsParams {
  talker?: string
  time?: string
  limit?: number
  offset?: number
  [key: string]: any
}

// 分析历史参数接口
interface AnalysisHistoryParams {
  period?: string
  limit?: number
  [key: string]: any
}

// 初始状态
const initialState: RootState = {
  loading: false,
  contacts: [],
  chatrooms: [],
  sessions: [],
  chatLogs: [],
  currentPage: 1,
  pageSize: 20,
  total: 0,
  aiService: {
    models: [],
    scheduledTasks: [],
    analysisHistory: [],
    serviceStatus: {
      overall: 'unknown',
      models: 'unknown',
      scheduler: 'unknown',
      performance: 'unknown'
    },
    serviceStats: {
      activeModels: 0,
      runningTasks: 0,
      todayAnalyses: 0
    },
    performanceMetrics: {
      avgResponseTime: 0,
      requestsPerMinute: 0,
      errorRate: 0,
      lastUpdateTime: ''
    }
  }
}

// 创建类型化的Store
const store = createStore<RootState>({
  state: initialState,
  
  mutations: {
    [MutationTypes.SET_LOADING](state: RootState, loading: boolean): void {
      state.loading = loading
    },
    
    [MutationTypes.SET_CONTACTS](state: RootState, contacts: Contact[]): void {
      state.contacts = contacts
    },
    
    [MutationTypes.SET_CHATROOMS](state: RootState, chatrooms: ChatRoom[]): void {
      state.chatrooms = chatrooms
    },
    
    [MutationTypes.SET_SESSIONS](state: RootState, sessions: Session[]): void {
      state.sessions = sessions
    },
    
    [MutationTypes.SET_CHAT_LOGS](state: RootState, logs: ChatMessage[]): void {
      state.chatLogs = logs
    },
    
    [MutationTypes.SET_PAGINATION](state: RootState, pagination: PaginationParams): void {
      state.currentPage = pagination.page
      state.pageSize = pagination.pageSize
      state.total = pagination.total
    },
    
    // AI服务相关mutations
    [MutationTypes.SET_AI_MODELS](state: RootState, models: AIModel[]): void {
      state.aiService.models = models
    },
    
    [MutationTypes.SET_SCHEDULED_TASKS](state: RootState, tasks: ScheduledTask[]): void {
      state.aiService.scheduledTasks = tasks
    },
    
    [MutationTypes.SET_ANALYSIS_HISTORY](state: RootState, history: AIAnalysis[]): void {
      state.aiService.analysisHistory = history
    },
    
    [MutationTypes.SET_SERVICE_STATUS](state: RootState, status: Partial<AIServiceState['serviceStatus']>): void {
      state.aiService.serviceStatus = { ...state.aiService.serviceStatus, ...status }
    },
    
    [MutationTypes.SET_SERVICE_STATS](state: RootState, stats: Partial<AIServiceState['serviceStats']>): void {
      state.aiService.serviceStats = { ...state.aiService.serviceStats, ...stats }
    },
    
    [MutationTypes.SET_PERFORMANCE_DATA](state: RootState, performance: Partial<AIServiceState['performanceMetrics']>): void {
      state.aiService.performanceMetrics = { ...state.aiService.performanceMetrics, ...performance }
    },
    
    [MutationTypes.UPDATE_MODEL_STATUS](state: RootState, { modelId, status }: { modelId: string, status: AIModel['status'] }): void {
      const model = state.aiService.models.find(m => m.id === modelId)
      if (model) {
        model.status = status
      }
    },
    
    [MutationTypes.UPDATE_TASK_STATUS](state: RootState, { taskId, status }: { taskId: string, status: ScheduledTask['status'] }): void {
      const task = state.aiService.scheduledTasks.find(t => t.id === taskId)
      if (task) {
        task.status = status
      }
    }
  },
  
  actions: {
    async [ActionTypes.FETCH_CONTACTS]({ commit }): Promise<void> {
      commit(MutationTypes.SET_LOADING, true)
      try {
        const response = await api.getContacts()
        commit(MutationTypes.SET_CONTACTS, response.data || [])
      } catch (error) {
        console.error('获取联系人失败:', error)
      } finally {
        commit(MutationTypes.SET_LOADING, false)
      }
    },
    
    async [ActionTypes.FETCH_CHATROOMS]({ commit }): Promise<void> {
      commit(MutationTypes.SET_LOADING, true)
      try {
        const response = await api.getChatrooms()
        commit(MutationTypes.SET_CHATROOMS, response.data || [])
      } catch (error) {
        console.error('获取群聊失败:', error)
      } finally {
        commit(MutationTypes.SET_LOADING, false)
      }
    },
    
    async [ActionTypes.FETCH_SESSIONS]({ commit }): Promise<void> {
      commit(MutationTypes.SET_LOADING, true)
      try {
        const response = await api.getSessions()
        commit(MutationTypes.SET_SESSIONS, response.data || [])
      } catch (error) {
        console.error('获取会话失败:', error)
      } finally {
        commit(MutationTypes.SET_LOADING, false)
      }
    },
    
    async [ActionTypes.FETCH_CHAT_LOGS]({ commit, state }, params: FetchChatLogsParams = {}): Promise<void> {
      commit(MutationTypes.SET_LOADING, true)
      try {
        const response = await api.getChatLogs({
          ...params,
          limit: state.pageSize,
          offset: (state.currentPage - 1) * state.pageSize
        })
        commit(MutationTypes.SET_CHAT_LOGS, response.data || [])
        commit(MutationTypes.SET_PAGINATION, {
          page: state.currentPage,
          pageSize: state.pageSize,
          total: response.total || 0
        })
      } catch (error) {
        console.error('获取聊天记录失败:', error)
      } finally {
        commit(MutationTypes.SET_LOADING, false)
      }
    },
    
    // AI服务相关actions
    async [ActionTypes.FETCH_AI_MODELS]({ commit }): Promise<void> {
      try {
        const response = await aiApi.getModelList()
        commit(MutationTypes.SET_AI_MODELS, response.data.data || [])
      } catch (error) {
        console.error('获取AI模型失败:', error)
      }
    },
    
    async [ActionTypes.FETCH_SCHEDULED_TASKS]({ commit }): Promise<void> {
      try {
        const response = await aiApi.getScheduledTasks()
        commit(MutationTypes.SET_SCHEDULED_TASKS, response.data.data || [])
      } catch (error) {
        console.error('获取调度任务失败:', error)
      }
    },
    
    async [ActionTypes.FETCH_ANALYSIS_HISTORY]({ commit }, params: AnalysisHistoryParams = {}): Promise<void> {
      try {
        const response = await aiApi.getAnalysisHistory(params)
        commit(MutationTypes.SET_ANALYSIS_HISTORY, response.data.data || [])
      } catch (error) {
        console.error('获取分析历史失败:', error)
      }
    },
    
    async [ActionTypes.FETCH_SERVICE_STATUS]({ commit }): Promise<void> {
      try {
        const response = await aiApi.getServiceStatus()
        commit(MutationTypes.SET_SERVICE_STATUS, response.data.data || {})
      } catch (error) {
        console.error('获取服务状态失败:', error)
        commit(MutationTypes.SET_SERVICE_STATUS, { overall: 'error' })
      }
    },
    
    async [ActionTypes.FETCH_SERVICE_STATS]({ commit }): Promise<void> {
      try {
        const [modelsRes, tasksRes, analysesRes] = await Promise.all([
          aiApi.getModelList(),
          aiApi.getScheduledTasks(),
          aiApi.getAnalysisHistory({ period: 'today', limit: 1 })
        ])
        
        const models = modelsRes.data.data || []
        const tasks = tasksRes.data.data || []
        const analyses = analysesRes.data.data || { total: 0 }
        
        commit(MutationTypes.SET_SERVICE_STATS, {
          activeModels: models.filter((m: AIModel) => m.status === 'active').length,
          runningTasks: tasks.filter((t: ScheduledTask) => t.status === 'running').length,
          todayAnalyses: analyses.total || 0
        })
      } catch (error) {
        console.error('获取服务统计失败:', error)
      }
    },
    
    async [ActionTypes.FETCH_PERFORMANCE_DATA]({ commit }, timeRange: string = '1h'): Promise<void> {
      try {
        const [metricsRes, apiRes, modelRes] = await Promise.all([
          aiApi.getPerformanceMetrics({ timeRange }),
          aiApi.getApiUsage(timeRange),
          aiApi.getModelStats()
        ])
        
        commit(MutationTypes.SET_PERFORMANCE_DATA, {
          systemStats: metricsRes.data.data?.system || {},
          apiMetrics: apiRes.data.data || [],
          modelMetrics: modelRes.data.data || []
        })
      } catch (error) {
        console.error('获取性能数据失败:', error)
      }
    },
    
    async [ActionTypes.REFRESH_AI_SERVICE_DATA]({ dispatch }): Promise<void> {
      await Promise.all([
        dispatch(ActionTypes.FETCH_AI_MODELS),
        dispatch(ActionTypes.FETCH_SCHEDULED_TASKS),
        dispatch(ActionTypes.FETCH_SERVICE_STATUS),
        dispatch(ActionTypes.FETCH_SERVICE_STATS),
        dispatch(ActionTypes.FETCH_PERFORMANCE_DATA)
      ])
    }
  },
  
  getters: {
    isLoading: (state: RootState): boolean => state.loading,
    getContacts: (state: RootState): Contact[] => state.contacts,
    getChatrooms: (state: RootState): ChatRoom[] => state.chatrooms,
    getSessions: (state: RootState): Session[] => state.sessions,
    getChatLogs: (state: RootState): ChatMessage[] => state.chatLogs,
    getPagination: (state: RootState) => ({
      current: state.currentPage,
      pageSize: state.pageSize,
      total: state.total
    }),
    
    // AI服务相关getters
    getAIModels: (state: RootState): AIModel[] => state.aiService.models,
    getActiveModels: (state: RootState): AIModel[] => 
      state.aiService.models.filter(m => m.status === 'active'),
    getScheduledTasks: (state: RootState): ScheduledTask[] => state.aiService.scheduledTasks,
    getRunningTasks: (state: RootState): ScheduledTask[] => 
      state.aiService.scheduledTasks.filter(t => t.status === 'running'),
    getAnalysisHistory: (state: RootState): AIAnalysis[] => state.aiService.analysisHistory,
    getServiceStatus: (state: RootState): AIServiceState['serviceStatus'] => state.aiService.serviceStatus,
    getServiceStats: (state: RootState): AIServiceState['serviceStats'] => state.aiService.serviceStats,
    getPerformanceData: (state: RootState): AIServiceState['performanceMetrics'] => state.aiService.performanceMetrics,
    isAIServiceHealthy: (state: RootState): boolean => state.aiService.serviceStatus.overall === 'healthy'
  }
})

export default store

// 导出类型化的store类型
export type AppStore = typeof store