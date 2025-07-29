import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Contacts from '@/views/Contacts.vue'

// Mock API
vi.mock('@/api/ApiClient', () => ({
  default: {
    getContacts: vi.fn().mockResolvedValue({ data: [] }),
    searchContacts: vi.fn().mockResolvedValue({ data: [] })
  }
}))

// Mock error handler
vi.mock('@/utils/errorHandler', () => ({
  handleError: vi.fn(),
  withErrorHandling: (fn: () => void) => fn
}))

// Mock router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock store
vi.mock('vuex', () => ({
  useStore: () => ({
    state: {},
    dispatch: vi.fn()
  })
}))

// Mock Element Plus components
vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

describe('Contacts.vue', () => {
  let wrapper: any
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确渲染联系人页面', () => {
    wrapper = mount(Contacts, {
      global: {
        stubs: {
          'el-button': true,
          'el-icon': true,
          'el-input': true,
          'el-skeleton': true,
          'el-empty': true,
          'el-table': true,
          'el-table-column': true,
          'el-pagination': true,
          'Refresh': true,
          'Search': true
        }
      }
    })

    expect(wrapper.find('.contacts-page').exists()).toBe(true)
    expect(wrapper.find('h3').text()).toBe('联系人管理')
  })

  it('应该正确处理搜索功能', async () => {
    wrapper = mount(Contacts, {
      global: {
        stubs: {
          'el-button': true,
          'el-icon': true,
          'el-input': true,
          'el-skeleton': true,
          'el-empty': true,
          'el-table': true,
          'el-table-column': true,
          'el-pagination': true,
          'Refresh': true,
          'Search': true
        }
      }
    })

    // 直接调用组件的搜索处理方法
    wrapper.vm.searchKeyword = 'test'
    await wrapper.vm.handleSearch()
    await nextTick()

    // 验证搜索功能
    expect(wrapper.vm.searchKeyword).toBe('test')
    expect(wrapper.vm.currentPage).toBe(1) // 搜索后应该重置到第一页
  })

  it('应该正确处理分页', async () => {
    wrapper = mount(Contacts, {
      global: {
        stubs: {
          'el-button': true,
          'el-icon': true,
          'el-input': true,
          'el-skeleton': true,
          'el-empty': true,
          'el-table': true,
          'el-table-column': true,
          'el-pagination': true,
          'Refresh': true,
          'Search': true
        }
      }
    })

    // 测试分页处理
    wrapper.vm.handlePageChange(2)
    expect(wrapper.vm.currentPage).toBe(2)
  })

  it('应该正确过滤联系人（排除聊天群）', () => {
    wrapper = mount(Contacts, {
      global: {
        stubs: {
          'el-button': true,
          'el-icon': true,
          'el-input': true,
          'el-skeleton': true,
          'el-empty': true,
          'el-table': true,
          'el-table-column': true,
          'el-pagination': true,
          'Refresh': true,
          'Search': true
        }
      }
    })

    // 直接设置联系人数据
    wrapper.vm.contacts = [
      { UserName: 'user1', NickName: 'User One', Remark: '', Alias: '' },
      { UserName: 'group@chatroom', NickName: 'Group', Remark: '', Alias: '' },
      { UserName: 'user2@openim', NickName: 'User Two', Remark: '', Alias: '' }
    ]

    // 应该只包含一个真实联系人
    const filtered = wrapper.vm.filteredContacts
    expect(filtered).toHaveLength(1)
    expect(filtered[0].UserName).toBe('user1')
  })
})