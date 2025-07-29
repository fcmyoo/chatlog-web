import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import api from '@/api/unified'
import { cachedApiClient, useCachedApi } from '@/api/cachedApiClient'
import type { 
  Contact, 
  ChatRoom, 
  Session, 
  ChatMessage,
  PaginationData
} from '@/types'

// 获取聊天记录参数接口
interface FetchChatLogsParams {
  talker?: string
  time?: string
  limit?: number
  offset?: number
  [key: string]: any
}

/**
 * 主要数据Store - 管理联系人、群聊、会话、聊天记录
 */
export const useMainStore = defineStore('main', () => {
  // ===== State =====
  const loading = ref<boolean>(false)
  const contacts = ref<Contact[]>([])
  const chatrooms = ref<ChatRoom[]>([])
  const sessions = ref<Session[]>([])
  const chatLogs = ref<ChatMessage[]>([])
  const currentPage = ref<number>(1)
  const pageSize = ref<number>(20)
  const total = ref<number>(0)

  // ===== Getters =====
  const isLoading = computed(() => loading.value)
  const getContacts = computed(() => contacts.value)
  const getChatrooms = computed(() => chatrooms.value)
  const getSessions = computed(() => sessions.value)
  const getChatLogs = computed(() => chatLogs.value)
  
  const getPagination = computed(() => ({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: total.value
  }))

  // ===== Actions =====
  
  /**
   * 设置加载状态
   */
  const setLoading = (isLoading: boolean): void => {
    loading.value = isLoading
  }

  /**
   * 设置分页信息
   */
  const setPagination = (page: number, size: number, totalCount: number): void => {
    currentPage.value = page
    pageSize.value = size
    total.value = totalCount
  }

  /**
   * 获取联系人列表 - 带智能缓存
   */
  const fetchContacts = async (useCache: boolean = true): Promise<void> => {
    setLoading(true)
    try {
      const response = useCache 
        ? await cachedApiClient.getContacts({ prefetch: true })
        : await api.getContacts()
      contacts.value = response.data || []
    } catch (error) {
      console.error('获取联系人失败:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取群聊列表 - 带智能缓存
   */
  const fetchChatrooms = async (useCache: boolean = true): Promise<void> => {
    setLoading(true)
    try {
      const response = useCache
        ? await cachedApiClient.getChatrooms({ prefetch: true })
        : await api.getChatrooms()
      chatrooms.value = response.data || []
    } catch (error) {
      console.error('获取群聊失败:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取会话列表 - 带智能缓存
   */
  const fetchSessions = async (useCache: boolean = true): Promise<void> => {
    setLoading(true)
    try {
      const response = useCache
        ? await cachedApiClient.getSessions()
        : await api.getSessions()
      sessions.value = response.data || []
    } catch (error) {
      console.error('获取会话失败:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取聊天记录 - 带智能缓存和分页
   */
  const fetchChatLogs = async (params: FetchChatLogsParams = {}, useCache: boolean = true): Promise<void> => {
    setLoading(true)
    try {
      const { talker = '', ...otherParams } = params
      const page = currentPage.value
      const limit = pageSize.value

      const response = useCache
        ? await cachedApiClient.getChatLogs(talker, page, limit, { prefetch: true })
        : await api.getChatLogs({
            talker,
            ...otherParams,
            limit,
            offset: (page - 1) * limit
          })
      
      chatLogs.value = response.data || []
      setPagination(
        page,
        limit,
        response.total || response.data?.length || 0
      )
    } catch (error) {
      console.error('获取聊天记录失败:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  /**
   * 清空所有数据和缓存
   */
  const clearAllData = (): void => {
    contacts.value = []
    chatrooms.value = []
    sessions.value = []
    chatLogs.value = []
    currentPage.value = 1
    pageSize.value = 20
    total.value = 0
    
    // 清空相关缓存
    cachedApiClient.clearCacheByTag(['user-data', 'contacts', 'sessions', 'chatrooms', 'messages'])
  }

  /**
   * 刷新所有基础数据 - 带缓存预热
   */
  const refreshAllData = async (useCache: boolean = true): Promise<void> => {
    if (useCache) {
      // 先清理缓存，再预热
      await cachedApiClient.refreshUserData()
    }
    
    await Promise.all([
      fetchContacts(useCache),
      fetchChatrooms(useCache),
      fetchSessions(useCache)
    ])
  }

  /**
   * 预热缓存
   */
  const warmupCache = async (): Promise<void> => {
    await cachedApiClient.warmupCache()
  }

  /**
   * 获取缓存统计信息
   */
  const getCacheMetrics = () => {
    return cachedApiClient.getCacheMetrics()
  }

  /**
   * 搜索联系人 - 带缓存
   */
  const searchContacts = async (keyword: string): Promise<Contact[]> => {
    if (!keyword.trim()) return []
    
    try {
      const response = await cachedApiClient.searchContacts(keyword)
      return response.data || []
    } catch (error) {
      console.error('搜索联系人失败:', error)
      return []
    }
  }

  // 返回store接口
  return {
    // State
    loading: readonly(loading),
    contacts: readonly(contacts),
    chatrooms: readonly(chatrooms),
    sessions: readonly(sessions),
    chatLogs: readonly(chatLogs),
    currentPage: readonly(currentPage),
    pageSize: readonly(pageSize),
    total: readonly(total),
    
    // Getters
    isLoading,
    getContacts,
    getChatrooms,
    getSessions,
    getChatLogs,
    getPagination,
    
    // Actions
    setLoading,
    setPagination,
    fetchContacts,
    fetchChatrooms,
    fetchSessions,
    fetchChatLogs,
    clearAllData,
    refreshAllData,
    warmupCache,
    getCacheMetrics,
    searchContacts
  }
})