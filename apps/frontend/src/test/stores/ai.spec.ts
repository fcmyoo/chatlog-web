import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAIStore } from '@/stores/ai'
import type { AIModel, AITask, AIAnalytics } from '@/types'

// 模拟API
vi.mock('@/api/unified', () => ({
  default: {
    getAIModels: vi.fn(),
    createAITask: vi.fn(),
    getAITasks: vi.fn(),
    getAIAnalytics: vi.fn(),
    deleteAITask: vi.fn(),
  }
}))

describe('AI Store', () => {
  beforeEach(() => {
    // 创建新的Pinia实例
    setActivePinia(createPinia())
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useAIStore()
      
      expect(store.loading).toBe(false)
      expect(store.models).toEqual([])
      expect(store.tasks).toEqual([])
      expect(store.analytics).toBeNull()
      expect(store.selectedModel).toBeNull()
      expect(store.taskHistory).toEqual([])
    })
  })

  describe('Getters', () => {
    it('isLoading 应该反映loading状态', () => {
      const store = useAIStore()
      
      expect(store.isLoading).toBe(false)
      
      store.setLoading(true)
      expect(store.isLoading).toBe(true)
    })

    it('getAvailableModels 应该返回可用模型列表', () => {
      const store = useAIStore()
      const mockModels: AIModel[] = [
        {
          id: 'model1',
          name: 'GPT-4',
          provider: 'openai',
          status: 'active',
          capabilities: ['text-generation'],
          config: {}
        },
        {
          id: 'model2',
          name: 'Claude-3',
          provider: 'anthropic',
          status: 'inactive',
          capabilities: ['text-generation'],
          config: {}
        }
      ]
      
      store.setModels(mockModels)
      
      const availableModels = store.getAvailableModels
      expect(availableModels).toHaveLength(1)
      expect(availableModels[0].id).toBe('model1')
    })

    it('getActiveTask 应该返回当前活动任务', () => {
      const store = useAIStore()
      const mockTasks: AITask[] = [
        {
          id: 'task1',
          name: '分析聊天记录',
          type: 'analysis',
          status: 'running',
          modelId: 'model1',
          config: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'task2',
          name: '生成报告',
          type: 'generation',
          status: 'completed',
          modelId: 'model1',
          config: {},
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]
      
      store.setTasks(mockTasks)
      
      const activeTask = store.getActiveTask
      expect(activeTask).toBeTruthy()
      expect(activeTask?.id).toBe('task1')
      expect(activeTask?.status).toBe('running')
    })
  })

  describe('Actions', () => {
    it('setLoading 应该更新loading状态', () => {
      const store = useAIStore()
      
      store.setLoading(true)
      expect(store.loading).toBe(true)
      
      store.setLoading(false)
      expect(store.loading).toBe(false)
    })

    it('setSelectedModel 应该更新选中的模型', () => {
      const store = useAIStore()
      const mockModel: AIModel = {
        id: 'model1',
        name: 'GPT-4',
        provider: 'openai',
        status: 'active',
        capabilities: ['text-generation'],
        config: {}
      }
      
      store.setSelectedModel(mockModel)
      expect(store.selectedModel).toEqual(mockModel)
    })

    it('addTask 应该添加新任务到任务列表', () => {
      const store = useAIStore()
      const mockTask: AITask = {
        id: 'task1',
        name: '分析聊天记录',
        type: 'analysis',
        status: 'pending',
        modelId: 'model1',
        config: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      
      store.addTask(mockTask)
      expect(store.tasks).toContain(mockTask)
      expect(store.taskHistory).toContain(mockTask)
    })

    it('removeTask 应该从任务列表中移除指定任务', () => {
      const store = useAIStore()
      const mockTask: AITask = {
        id: 'task1',
        name: '分析聊天记录',
        type: 'analysis',
        status: 'pending',
        modelId: 'model1',
        config: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      
      store.addTask(mockTask)
      expect(store.tasks).toContain(mockTask)
      
      store.removeTask('task1')
      expect(store.tasks).not.toContain(mockTask)
    })

    it('clearAllData 应该清空所有AI数据', () => {
      const store = useAIStore()
      const mockModel: AIModel = {
        id: 'model1',
        name: 'GPT-4',
        provider: 'openai',
        status: 'active',
        capabilities: ['text-generation'],
        config: {}
      }
      
      // 设置一些数据
      store.setSelectedModel(mockModel)
      store.addTask({
        id: 'task1',
        name: '测试任务',
        type: 'analysis',
        status: 'pending',
        modelId: 'model1',
        config: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      })
      
      // 清空数据
      store.clearAllData()
      
      expect(store.models).toEqual([])
      expect(store.tasks).toEqual([])
      expect(store.analytics).toBeNull()
      expect(store.selectedModel).toBeNull()
      expect(store.taskHistory).toEqual([])
    })
  })

  describe('异步Actions', () => {
    it('fetchModels 应该正确获取AI模型数据', async () => {
      const mockModels: AIModel[] = [
        {
          id: 'model1',
          name: 'GPT-4',
          provider: 'openai',
          status: 'active',
          capabilities: ['text-generation'],
          config: {}
        }
      ]

      // 模拟API响应
      const { default: api } = await import('@/api/unified')
      vi.mocked(api.getAIModels).mockResolvedValueOnce({
        data: mockModels,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      })

      const store = useAIStore()
      await store.fetchModels()

      expect(store.models).toEqual(mockModels)
      expect(api.getAIModels).toHaveBeenCalledTimes(1)
    })

    it('fetchModels 失败时应该抛出错误', async () => {
      const error = new Error('API错误')
      
      const { default: api } = await import('@/api/unified')
      vi.mocked(api.getAIModels).mockRejectedValueOnce(error)

      const store = useAIStore()
      
      await expect(store.fetchModels()).rejects.toThrow('API错误')
      expect(store.loading).toBe(false)
    })

    it('createTask 应该正确创建AI任务', async () => {
      const mockTask: AITask = {
        id: 'task1',
        name: '分析聊天记录',
        type: 'analysis',
        status: 'pending',
        modelId: 'model1',
        config: { temperature: 0.7 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }

      const { default: api } = await import('@/api/unified')
      vi.mocked(api.createAITask).mockResolvedValueOnce({
        data: mockTask,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      })

      const store = useAIStore()
      const result = await store.createTask({
        name: '分析聊天记录',
        type: 'analysis',
        modelId: 'model1',
        config: { temperature: 0.7 }
      })

      expect(result).toEqual(mockTask)
      expect(store.tasks).toContain(mockTask)
      expect(api.createAITask).toHaveBeenCalledWith({
        name: '分析聊天记录',
        type: 'analysis',
        modelId: 'model1',
        config: { temperature: 0.7 }
      })
    })

    it('fetchAnalytics 应该正确获取AI分析数据', async () => {
      const mockAnalytics: AIAnalytics = {
        totalTasks: 10,
        completedTasks: 8,
        failedTasks: 1,
        averageExecutionTime: 5000,
        modelUsage: {
          'model1': 6,
          'model2': 4
        },
        taskTypes: {
          'analysis': 7,
          'generation': 3
        }
      }

      const { default: api } = await import('@/api/unified')
      vi.mocked(api.getAIAnalytics).mockResolvedValueOnce({
        data: mockAnalytics,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      })

      const store = useAIStore()
      await store.fetchAnalytics()

      expect(store.analytics).toEqual(mockAnalytics)
      expect(api.getAIAnalytics).toHaveBeenCalledTimes(1)
    })
  })

  describe('Loading状态管理', () => {
    it('异步操作期间应该正确管理loading状态', async () => {
      const { default: api } = await import('@/api/unified')
      
      // 创建一个Promise来控制API调用时机
      let resolveApi: (value: any) => void
      const apiPromise = new Promise(resolve => {
        resolveApi = resolve
      })
      
      vi.mocked(api.getAIModels).mockReturnValueOnce(apiPromise as any)

      const store = useAIStore()
      
      // 开始异步操作
      const fetchPromise = store.fetchModels()
      
      // 此时应该是loading状态
      expect(store.loading).toBe(true)
      
      // 完成API调用
      resolveApi!({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      })
      
      await fetchPromise
      
      // 完成后应该不再loading
      expect(store.loading).toBe(false)
    })
  })
})