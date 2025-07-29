import type { AxiosResponse } from 'axios'
import { smartCache } from '@/utils/smartCache'
import apiClient from '@/api/ApiClient'
import type { Contact, ChatRoom, Session, ChatLog } from '@/types'

/**
 * 缓存增强的API客户端
 * 提供智能缓存、预取、批量操作等高级功能
 */

interface CacheOptions {
  ttl?: number           // 缓存时间
  priority?: number      // 缓存优先级
  tags?: string[]        // 缓存标签
  force?: boolean        // 强制刷新
  prefetch?: boolean     // 是否预取相关数据
}

interface BatchRequestItem {
  key: string
  method: string
  params?: any
  cacheOptions?: CacheOptions
}

export class CachedApiClient {
  private static instance: CachedApiClient
  private requestCache = smartCache
  private pendingRequests = new Map<string, Promise<any>>()

  static getInstance(): CachedApiClient {
    if (!CachedApiClient.instance) {
      CachedApiClient.instance = new CachedApiClient()
    }
    return CachedApiClient.instance
  }

  /**
   * 获取联系人列表 - 带缓存
   */
  async getContacts(options: CacheOptions = {}): Promise<AxiosResponse<Contact[]>> {
    const cacheKey = 'contacts-list'
    const defaultOptions = {
      ttl: 5 * 60 * 1000, // 5分钟
      priority: 2,
      tags: ['contacts', 'user-data'],
      ...options
    }

    return this.getCached(cacheKey, async () => {
      const response = await apiClient.getContacts()
      
      // 预取热门联系人的详细信息
      if (defaultOptions.prefetch && response.data?.length > 0) {
        this.prefetchPopularContacts(response.data.slice(0, 10))
      }
      
      return response
    }, defaultOptions)
  }

  /**
   * 搜索联系人 - 带缓存
   */
  async searchContacts(keyword: string, options: CacheOptions = {}): Promise<AxiosResponse<Contact[]>> {
    const cacheKey = `search-contacts-${keyword.toLowerCase()}`
    const defaultOptions = {
      ttl: 3 * 60 * 1000, // 3分钟
      priority: 1.5,
      tags: ['contacts', 'search'],
      ...options
    }

    return this.getCached(cacheKey, async () => {
      return apiClient.searchContacts(keyword)
    }, defaultOptions)
  }

  /**
   * 获取聊天室列表 - 带缓存
   */
  async getChatrooms(options: CacheOptions = {}): Promise<AxiosResponse<ChatRoom[]>> {
    const cacheKey = 'chatrooms-list'
    const defaultOptions = {
      ttl: 10 * 60 * 1000, // 10分钟
      priority: 1,
      tags: ['chatrooms', 'room-data'],
      ...options
    }

    return this.getCached(cacheKey, async () => {
      const response = await apiClient.getChatrooms()
      
      // 预取活跃聊天室的详细信息
      if (defaultOptions.prefetch && response.data?.length > 0) {
        this.prefetchActiveChatrooms(response.data.slice(0, 5))
      }
      
      return response
    }, defaultOptions)
  }

  /**
   * 获取会话列表 - 带缓存
   */
  async getSessions(options: CacheOptions = {}): Promise<AxiosResponse<Session[]>> {
    const cacheKey = 'sessions-list'
    const defaultOptions = {
      ttl: 2 * 60 * 1000, // 2分钟 (会话更新较频繁)
      priority: 3,
      tags: ['sessions', 'user-data'],
      ...options
    }

    return this.getCached(cacheKey, async () => {
      return apiClient.getSessions()
    }, defaultOptions)
  }

  /**
   * 获取聊天记录 - 带分页缓存
   */
  async getChatLogs(
    talker: string, 
    page: number = 1, 
    limit: number = 20, 
    options: CacheOptions = {}
  ): Promise<AxiosResponse<ChatLog[]>> {
    const cacheKey = `chatlog-${talker}-${page}-${limit}`
    const defaultOptions = {
      ttl: 15 * 60 * 1000, // 15分钟
      priority: 2,
      tags: ['chatlog', `talker-${talker}`, 'messages'],
      ...options
    }

    const result = await this.getCached(cacheKey, async () => {
      return apiClient.getChatLogs(talker, page, limit)
    }, defaultOptions)

    // 智能预取下一页
    if (defaultOptions.prefetch && result.data?.length === limit) {
      this.prefetchNextPage(talker, page + 1, limit)
    }

    return result
  }

  /**
   * 批量请求
   */
  async batchRequest<T>(requests: BatchRequestItem[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>()
    const uncachedRequests: BatchRequestItem[] = []

    // 首先检查缓存
    requests.forEach(request => {
      const cached = this.requestCache.get<T>(request.key)
      if (cached && !request.cacheOptions?.force) {
        results.set(request.key, cached)
      } else {
        uncachedRequests.push(request)
      }
    })

    // 批量执行未缓存的请求
    if (uncachedRequests.length > 0) {
      const promises = uncachedRequests.map(async request => {
        try {
          const data = await this.executeRequest<T>(request)
          results.set(request.key, data)
          
          // 缓存结果
          this.requestCache.set(request.key, data, {
            ttl: request.cacheOptions?.ttl || 5 * 60 * 1000,
            priority: request.cacheOptions?.priority || 1,
            tags: request.cacheOptions?.tags || []
          })
        } catch (error) {
          console.error(`批量请求失败: ${request.key}`, error)
          results.set(request.key, null)
        }
      })

      await Promise.allSettled(promises)
    }

    return results
  }

  /**
   * 预热缓存
   */
  async warmupCache(): Promise<void> {
    console.log('开始预热缓存...')
    
    try {
      // 并行预热核心数据
      await Promise.allSettled([
        this.getContacts({ prefetch: true }),
        this.getChatrooms({ prefetch: true }),
        this.getSessions({ prefetch: true })
      ])
      
      console.log('缓存预热完成')
    } catch (error) {
      console.warn('缓存预热失败:', error)
    }
  }

  /**
   * 清理特定标签的缓存
   */
  clearCacheByTag(tags: string[]): number {
    return this.requestCache.deleteByTags(tags)
  }

  /**
   * 刷新用户相关缓存
   */
  async refreshUserData(): Promise<void> {
    // 清理用户相关缓存
    this.clearCacheByTag(['user-data', 'contacts', 'sessions'])
    
    // 重新获取数据
    await this.warmupCache()
  }

  /**
   * 获取缓存统计信息
   */
  getCacheMetrics() {
    return this.requestCache.getMetrics()
  }

  // 私有方法

  private async getCached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    // 强制刷新模式
    if (options.force) {
      const data = await fetchFn()
      this.requestCache.set(key, data, options)
      return data
    }

    // 尝试从缓存获取
    const cached = this.requestCache.get<T>(key)
    if (cached) {
      return cached
    }

    // 防止重复请求
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!
    }

    // 发起新请求
    const promise = fetchFn().then(data => {
      this.requestCache.set(key, data, options)
      this.pendingRequests.delete(key)
      return data
    }).catch(error => {
      this.pendingRequests.delete(key)
      throw error
    })

    this.pendingRequests.set(key, promise)
    return promise
  }

  private async executeRequest<T>(request: BatchRequestItem): Promise<T> {
    // 这里根据不同的方法类型执行对应的API调用
    switch (request.method) {
      case 'getContacts':
        return apiClient.getContacts() as Promise<T>
      case 'getChatrooms':
        return apiClient.getChatrooms() as Promise<T>
      case 'getSessions':
        return apiClient.getSessions() as Promise<T>
      case 'searchContacts':
        return apiClient.searchContacts(request.params?.keyword) as Promise<T>
      case 'getChatLogs':
        return apiClient.getChatLogs(
          request.params?.talker,
          request.params?.page,
          request.params?.limit
        ) as Promise<T>
      default:
        throw new Error(`未知的请求方法: ${request.method}`)
    }
  }

  private prefetchPopularContacts(contacts: Contact[]): void {
    // 在后台预取热门联系人的聊天记录
    setTimeout(() => {
      contacts.forEach(async (contact, index) => {
        if (index < 5) { // 只预取前5个
          try {
            await this.getChatLogs(
              contact.username || contact.nickname || '', 
              1, 
              10,
              { priority: 0.5 }
            )
          } catch (error) {
            console.warn(`预取联系人聊天记录失败: ${contact.username}`, error)
          }
        }
      })
    }, 1000)
  }

  private prefetchActiveChatrooms(chatrooms: ChatRoom[]): void {
    // 预取活跃聊天室的基本信息
    setTimeout(() => {
      chatrooms.forEach(async (chatroom, index) => {
        if (index < 3) { // 只预取前3个
          try {
            await this.getChatLogs(
              chatroom.username || '', 
              1, 
              5,
              { priority: 0.3 }
            )
          } catch (error) {
            console.warn(`预取聊天室记录失败: ${chatroom.username}`, error)
          }
        }
      })
    }, 2000)
  }

  private prefetchNextPage(talker: string, nextPage: number, limit: number): void {
    // 预取下一页聊天记录
    setTimeout(async () => {
      try {
        await this.getChatLogs(talker, nextPage, limit, {
          priority: 0.8,
          prefetch: false
        })
      } catch (error) {
        console.warn(`预取下一页失败: ${talker} page ${nextPage}`, error)
      }
    }, 500)
  }
}

// 导出单例实例
export const cachedApiClient = CachedApiClient.getInstance()

// Vue 组合式函数
export function useCachedApi() {
  const api = cachedApiClient

  const refreshCache = async () => {
    await api.refreshUserData()
  }

  const warmupCache = async () => {
    await api.warmupCache()
  }

  const clearCache = (tags: string[]) => {
    return api.clearCacheByTag(tags)
  }

  const getCacheMetrics = () => {
    return api.getCacheMetrics()
  }

  return {
    api,
    refreshCache,
    warmupCache,
    clearCache,
    getCacheMetrics
  }
}