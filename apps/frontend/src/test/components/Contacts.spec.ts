import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import Contacts from '@/views/Contacts.vue'
import type { Contact } from '@/types'

// 模拟API
vi.mock('@/api/ApiClient', () => ({
  default: {
    getContacts: vi.fn(),
    searchContacts: vi.fn(),
  }
}))

// 模拟错误处理
vi.mock('@/utils/errorHandler', () => ({
  handleError: vi.fn(),
  withErrorHandling: (fn: Function, context: string) => fn
}))

// 模拟Element Plus消息
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn()
  }
}))

describe('Contacts.vue', () => {
  let router: any
  
  beforeEach(async () => {
    // 创建新的Pinia实例
    setActivePinia(createPinia())
    
    // 创建路由实例
    router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/chatlog', name: 'ChatLog', component: { template: '<div>ChatLog</div>' } }
      ]
    })
    
    // 清理所有模拟
    vi.clearAllMocks()
  })

  const createWrapper = (options = {}) => {
    return mount(Contacts, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          'el-button': { template: '<button><slot /></button>' },
          'el-input': { template: '<input />' },
          'el-table': { template: '<div class="el-table"><slot /></div>' },
          'el-table-column': { template: '<div class="el-table-column"><slot /></div>' },
          'el-pagination': { template: '<div class="el-pagination"></div>' },
          'el-skeleton': { template: '<div class="el-skeleton"></div>' },
          'el-empty': { template: '<div class="el-empty"></div>' },
          'el-icon': { template: '<span class="el-icon"><slot /></span>' }
        }
      },
      ...options
    })
  }

  describe('组件渲染', () => {
    it('应该正确渲染基本结构', () => {
      const wrapper = createWrapper()
      
      expect(wrapper.find('.contacts-page').exists()).toBe(true)
      expect(wrapper.find('.card').exists()).toBe(true)
      expect(wrapper.find('.card-header h3').text()).toBe('联系人管理')
      expect(wrapper.find('.search-bar').exists()).toBe(true)
    })

    it('loading状态时应该显示骨架屏', async () => {
      const wrapper = createWrapper()
      
      // 设置loading状态
      await wrapper.setData({ loading: true })
      
      expect(wrapper.find('.loading').exists()).toBe(true)
      expect(wrapper.find('.el-skeleton').exists()).toBe(true)
    })

    it('无数据时应该显示空状态', async () => {
      const wrapper = createWrapper()
      
      // 设置无数据状态
      await wrapper.setData({ 
        loading: false,
        contacts: []
      })
      
      expect(wrapper.find('.empty-state').exists()).toBe(true)
      expect(wrapper.find('.el-empty').exists()).toBe(true)
    })

    it('有数据时应该显示表格和分页', async () => {
      const mockContacts: Contact[] = [
        {
          id: '1',
          username: 'test1',
          nickname: '测试用户1',
          avatar: '',
          remark: '测试备注'
        }
      ]

      const wrapper = createWrapper()
      
      // 设置有数据状态
      await wrapper.setData({ 
        loading: false,
        contacts: mockContacts
      })
      
      expect(wrapper.find('.el-table').exists()).toBe(true)
      expect(wrapper.find('.pagination').exists()).toBe(true)
    })
  })

  describe('数据加载', () => {
    it('组件挂载时应该加载联系人数据', async () => {
      const mockContacts: Contact[] = [
        {
          id: '1',
          username: 'test1',
          nickname: '测试用户1',
          avatar: '',
          remark: '测试备注'
        }
      ]

      const { default: api } = await import('@/api/ApiClient')
      vi.mocked(api.getContacts).mockResolvedValueOnce({
        data: mockContacts
      })

      const wrapper = createWrapper()
      
      // 等待组件挂载完成
      await wrapper.vm.$nextTick()
      
      expect(api.getContacts).toHaveBeenCalledTimes(1)
    })

    it('loadContacts 应该正确处理API响应', async () => {
      const mockContacts: Contact[] = [
        {
          id: '1',
          username: 'test1',
          nickname: '测试用户1',
          avatar: '',
          remark: '测试备注'
        },
        {
          id: '2',
          username: 'test2@chatroom',
          nickname: '测试群聊',
          avatar: '',
          remark: ''
        }
      ]

      const { default: api } = await import('@/api/ApiClient')
      const { ElMessage } = await import('element-plus')
      
      vi.mocked(api.getContacts).mockResolvedValueOnce({
        data: mockContacts
      })

      const wrapper = createWrapper()
      
      await wrapper.vm.loadContacts()
      
      expect(wrapper.vm.contacts).toEqual(mockContacts)
      expect(ElMessage.success).toHaveBeenCalledWith({
        message: expect.stringContaining('加载了 1 个联系人')
      })
    })

    it('API错误时应该正确处理', async () => {
      const error = new Error('网络错误')
      
      const { default: api } = await import('@/api/ApiClient')
      vi.mocked(api.getContacts).mockRejectedValueOnce(error)

      const wrapper = createWrapper()
      
      // 手动调用loadContacts来测试错误处理
      await wrapper.vm.loadContacts()
      
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('搜索功能', () => {
    it('搜索关键词为空时应该清空搜索结果', async () => {
      const wrapper = createWrapper()
      
      // 设置搜索结果
      await wrapper.setData({ searchResults: [{ id: '1', username: 'test' }] })
      
      // 清空搜索关键词
      await wrapper.setData({ searchKeyword: '' })
      await wrapper.vm.handleSearch()
      
      expect(wrapper.vm.searchResults).toEqual([])
    })

    it('搜索功能应该调用API并更新结果', async () => {
      const mockSearchResults: Contact[] = [
        {
          id: '1',
          username: 'search1',
          nickname: '搜索结果1',
          avatar: '',
          remark: ''
        }
      ]

      const { default: api } = await import('@/api/ApiClient')
      const { ElMessage } = await import('element-plus')
      
      vi.mocked(api.searchContacts).mockResolvedValueOnce({
        data: mockSearchResults
      })

      const wrapper = createWrapper()
      
      await wrapper.setData({ searchKeyword: 'search' })
      await wrapper.vm.handleSearch()
      
      expect(api.searchContacts).toHaveBeenCalledWith('search')
      expect(wrapper.vm.searchResults).toEqual(mockSearchResults)
      expect(ElMessage.success).toHaveBeenCalledWith({
        message: expect.stringContaining('找到 1 个匹配')
      })
    })
  })

  describe('分页功能', () => {
    it('应该正确计算过滤后的联系人', async () => {
      const mockContacts: Contact[] = [
        {
          id: '1',
          username: 'user1',
          nickname: '用户1',
          avatar: '',
          remark: ''
        },
        {
          id: '2',
          username: 'user2@chatroom',
          nickname: '群聊',
          avatar: '',
          remark: ''
        },
        {
          id: '3',
          username: 'user3',
          nickname: '用户3',
          avatar: '',
          remark: ''
        }
      ]

      const wrapper = createWrapper()
      await wrapper.setData({ contacts: mockContacts })
      
      // 过滤后应该只有2个联系人（排除群聊）
      expect(wrapper.vm.filteredContacts).toHaveLength(2)
      expect(wrapper.vm.filteredContacts.every((c: Contact) => !c.username?.includes('@chatroom'))).toBe(true)
    })

    it('分页变化应该更新当前页', async () => {
      const wrapper = createWrapper()
      
      wrapper.vm.handlePageChange(3)
      
      expect(wrapper.vm.currentPage).toBe(3)
    })

    it('应该正确计算分页后的联系人', async () => {
      const mockContacts: Contact[] = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        username: `user${i + 1}`,
        nickname: `用户${i + 1}`,
        avatar: '',
        remark: ''
      }))

      const wrapper = createWrapper()
      await wrapper.setData({ 
        contacts: mockContacts,
        pageSize: 10,
        currentPage: 1
      })
      
      expect(wrapper.vm.paginatedContacts).toHaveLength(10)
      
      // 切换到第二页
      await wrapper.setData({ currentPage: 2 })
      expect(wrapper.vm.paginatedContacts).toHaveLength(10)
      
      // 切换到第三页
      await wrapper.setData({ currentPage: 3 })
      expect(wrapper.vm.paginatedContacts).toHaveLength(5)
    })
  })

  describe('用户交互', () => {
    it('点击查看聊天记录应该跳转到正确路由', async () => {
      const mockContact: Contact = {
        id: '1',
        username: 'testuser',
        nickname: '测试用户',
        avatar: '',
        remark: ''
      }

      const wrapper = createWrapper()
      const pushSpy = vi.spyOn(router, 'push')
      
      wrapper.vm.viewChatHistory(mockContact)
      
      expect(pushSpy).toHaveBeenCalledWith({
        path: '/chatlog',
        query: {
          talker: 'testuser'
        }
      })
    })

    it('复制联系人ID应该调用clipboard API', async () => {
      const mockContact: Contact = {
        id: '1',
        username: 'testuser',
        nickname: '测试用户',
        avatar: '',
        remark: ''
      }

      // 模拟clipboard API
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      })

      const wrapper = createWrapper()
      const { ElMessage } = await import('element-plus')
      
      await wrapper.vm.copyContactId(mockContact)
      
      expect(writeTextMock).toHaveBeenCalledWith('testuser')
      expect(ElMessage.success).toHaveBeenCalledWith({
        message: '联系人ID已复制到剪贴板'
      })
    })

    it('复制联系人ID失败时应该显示警告', async () => {
      const mockContact: Contact = {
        id: '1',
        username: '',
        nickname: '',
        avatar: '',
        remark: ''
      }

      const wrapper = createWrapper()
      const { ElMessage } = await import('element-plus')
      
      wrapper.vm.copyContactId(mockContact)
      
      expect(ElMessage.warning).toHaveBeenCalledWith({
        message: '无可复制的ID'
      })
    })
  })
})