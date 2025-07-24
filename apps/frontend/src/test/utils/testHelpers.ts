import { mount, VueWrapper } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createStore } from 'vuex'

export const domUtils = {
  // 查找元素
  findByTestId: (wrapper: VueWrapper<any>, testId: string) => {
    return wrapper.find(`[data-testid="${testId}"]`)
  },
  
  // 触发事件
  triggerEvent: async (wrapper: VueWrapper<any>, selector: string, event: string) => {
    await wrapper.find(selector).trigger(event)
    await flushPromises()
  },
  
  // 输入文本
  inputText: async (wrapper: VueWrapper<any>, selector: string, text: string) => {
    const input = wrapper.find(selector)
    await input.setValue(text)
    await input.trigger('input')
    await flushPromises()
  }
}

// 断言工具
export const assertions = {
  // 检查组件是否渲染
  expectComponentToRender: (wrapper: VueWrapper<any>) => {
    expect(wrapper.exists()).toBe(true)
  },
  
  // 检查文本内容
  expectTextContent: (wrapper: VueWrapper<any>, selector: string, text: string) => {
    expect(wrapper.find(selector).text()).toContain(text)
  },
  
  // 检查元素可见性
  expectElementVisible: (wrapper: VueWrapper<any>, selector: string) => {
    expect(wrapper.find(selector).isVisible()).toBe(true)
  }
}
export function createTestRouter(routes: any[] = []) {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      ...routes
    ]
  })
}

// 创建测试Store
export function createTestStore(modules: any = {}) {
  return createStore({
    modules: {
      ...modules
    }
  })
}

// 挂载组件的辅助函数
export function mountComponent(component: any, options: any = {}) {
  const router = createTestRouter()
  const store = createTestStore()
  
  return mount(component, {
    global: {
      plugins: [router, store],
      mocks: {
        $message: {
          success: vi.fn(),
          error: vi.fn(),
          warning: vi.fn(),
          info: vi.fn()
        }
      },
      stubs: {
        'el-button': true,
        'el-input': true,
        'el-form': true,
        'el-form-item': true,
        'el-table': true,
        'el-table-column': true,
        'router-link': true,
        'router-view': true
      }
    },
    ...options
  })
}

// 等待异步操作完成
export async function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

// 模拟API响应
export function mockApiResponse(data: any, status = 200) {
  return Promise.resolve({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {}
  })
}

// 模拟API错误
export function mockApiError(message = 'API Error', status = 500) {
  const error = new Error(message) as any
  error.response = {
    data: { message },
    status,
    statusText: 'Internal Server Error'
  }
  return Promise.reject(error)
}

// 生成测试用的聊天数据
export const testDataGenerator = {
  createChatData: (overrides: any = {}) => ({
    id: 1,
    content: 'Test chat message',
    sender: 'user',
    timestamp: new Date().toISOString(),
    ...overrides
  }),
  
  createAnalysisResult: (overrides: any = {}) => ({
    id: 1,
    summary: 'Test analysis summary',
    sentiment: 'positive',
    keywords: ['test', 'analysis'],
    createdAt: new Date().toISOString(),
    ...overrides
  })
}