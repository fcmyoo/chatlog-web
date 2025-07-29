import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMainStore } from '@/stores/main'
import type { Contact, ChatRoom, Session } from '@/types'

// 模拟API
vi.mock('@/api/unified', () => ({
  default: {
    getContacts: vi.fn(),
    getChatrooms: vi.fn(),
    getSessions: vi.fn(),
    getChatLogs: vi.fn(),
  }
}))

describe('Main Store', () => {
  beforeEach(() => {
    // 创建新的Pinia实例
    setActivePinia(createPinia())
  })

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const store = useMainStore()
      
      expect(store.loading).toBe(false)
      expect(store.contacts).toEqual([])
      expect(store.chatrooms).toEqual([])
      expect(store.sessions).toEqual([])
      expect(store.chatLogs).toEqual([])
      expect(store.currentPage).toBe(1)
      expect(store.pageSize).toBe(20)
      expect(store.total).toBe(0)
    })
  })

  describe('Getters', () => {
    it('isLoading 应该反映loading状态', () => {
      const store = useMainStore()
      
      expect(store.isLoading).toBe(false)
      
      store.setLoading(true)
      expect(store.isLoading).toBe(true)
    })

    it('getPagination 应该返回分页信息', () => {
      const store = useMainStore()
      
      store.setPagination(2, 10, 100)
      
      expect(store.getPagination).toEqual({
        current: 2,
        pageSize: 10,
        total: 100
      })
    })
  })

  describe('Actions', () => {
    it('setLoading 应该更新loading状态', () => {
      const store = useMainStore()
      
      store.setLoading(true)
      expect(store.loading).toBe(true)
      
      store.setLoading(false)
      expect(store.loading).toBe(false)
    })

    it('setPagination 应该更新分页信息', () => {
      const store = useMainStore()
      
      store.setPagination(3, 15, 150)
      
      expect(store.currentPage).toBe(3)
      expect(store.pageSize).toBe(15)
      expect(store.total).toBe(150)
    })

    it('clearAllData 应该清空所有数据', () => {
      const store = useMainStore()
      
      // 设置一些数据
      store.setPagination(5, 30, 200)
      
      // 清空数据
      store.clearAllData()
      
      expect(store.contacts).toEqual([])
      expect(store.chatrooms).toEqual([])
      expect(store.sessions).toEqual([])
      expect(store.chatLogs).toEqual([])
      expect(store.currentPage).toBe(1)
      expect(store.pageSize).toBe(20)
      expect(store.total).toBe(0)
    })
  })

  describe('异步Actions', () => {
    it('fetchContacts 应该正确获取联系人数据', async () => {
      const mockContacts: Contact[] = [
        {
          id: '1',
          username: 'test1',
          nickname: '测试用户1',
          avatar: '',
          remark: '测试'
        }
      ]

      // 模拟API响应
      const { default: api } = await import('@/api/unified')
      vi.mocked(api.getContacts).mockResolvedValueOnce({
        data: mockContacts,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      })

      const store = useMainStore()
      await store.fetchContacts()

      expect(store.contacts).toEqual(mockContacts)
      expect(api.getContacts).toHaveBeenCalledTimes(1)
    })

    it('fetchContacts 失败时应该抛出错误', async () => {
      const error = new Error('API错误')
      
      const { default: api } = await import('@/api/unified')
      vi.mocked(api.getContacts).mockRejectedValueOnce(error)

      const store = useMainStore()
      
      await expect(store.fetchContacts()).rejects.toThrow('API错误')
      expect(store.loading).toBe(false)
    })

    it('refreshAllData 应该刷新所有基础数据', async () => {
      const { default: api } = await import('@/api/unified')
      
      // 模拟所有API响应
      vi.mocked(api.getContacts).mockResolvedValueOnce({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      })
      vi.mocked(api.getChatrooms).mockResolvedValueOnce({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      })
      vi.mocked(api.getSessions).mockResolvedValueOnce({
        data: [],
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      })

      const store = useMainStore()
      await store.refreshAllData()

      expect(api.getContacts).toHaveBeenCalledTimes(1)
      expect(api.getChatrooms).toHaveBeenCalledTimes(1)
      expect(api.getSessions).toHaveBeenCalledTimes(1)
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
      
      vi.mocked(api.getContacts).mockReturnValueOnce(apiPromise as any)

      const store = useMainStore()
      
      // 开始异步操作
      const fetchPromise = store.fetchContacts()
      
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