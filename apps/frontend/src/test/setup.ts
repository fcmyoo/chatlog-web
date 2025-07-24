import { config } from '@vue/test-utils'
import { vi } from 'vitest'
import { ComponentFixtures } from './fixtures/ComponentFixtures'

// 设置全局测试配置
config.global.mocks = {
  $message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  },
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  },
  $route: {
    path: '/',
    name: 'home',
    params: {},
    query: {},
    meta: {}
  }
}

// 全局组件存根
config.global.stubs = {
  'el-button': true,
  'el-input': true,
  'el-form': true,
  'el-form-item': true,
  'el-table': true,
  'el-table-column': true,
  'el-dialog': true,
  'el-loading': true,
  'router-link': true,
  'router-view': true
}

// 创建全局夹具实例
const globalFixtures = new ComponentFixtures()

// 在每个测试前设置
beforeEach(() => {
  // 清理之前的模拟
  vi.clearAllMocks()
  
  // 重置夹具
  globalFixtures.reset()
})

// 在每个测试后清理
afterEach(async () => {
  // 清理组件夹具
  await globalFixtures.cleanup()
})

// 在所有测试完成后进行最终清理
afterAll(async () => {
  // 最终清理
  await globalFixtures.cleanup()
})

// 导出全局夹具供测试使用
export { globalFixtures }

// 设置全局错误处理
window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的Promise拒绝:', event.reason)
})

// 模拟浏览器API
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// 模拟localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// 模拟sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// 模拟IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// 模拟ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// 设置测试超时
vi.setConfig({
  testTimeout: 10000
})

console.log('前端测试环境初始化完成')