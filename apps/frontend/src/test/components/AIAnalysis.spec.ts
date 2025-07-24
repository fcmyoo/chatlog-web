import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountComponent, testDataGenerator, domUtils, assertions } from '../utils/testHelpers'
import AIAnalysis from '@/views/AIAnalysis.vue'
import { aiApi } from '@/api/ai'

// 模拟API调用
vi.mock('@/api/ai', () => ({
  aiApi: {
    performAnalysis: vi.fn(),
    getAnalysisHistory: vi.fn()
  }
}))

describe('AIAnalysis.vue', () => {
  let wrapper: any
  const mockPerformAnalysis = vi.mocked(aiApi.performAnalysis)
  const mockGetAnalysisHistory = vi.mocked(aiApi.getAnalysisHistory)

  beforeEach(() => {
    // 重置所有模拟
    vi.clearAllMocks()
    
    // 设置默认模拟返回值
    mockPerformAnalysis.mockResolvedValue(
      testDataGenerator.createAnalysisResult()
    )
    
    mockGetAnalysisHistory.mockResolvedValue([
      testDataGenerator.createAnalysisResult({ id: 1 }),
      testDataGenerator.createAnalysisResult({ id: 2 })
    ])
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('组件渲染', () => {
    it('应该正确渲染组件', () => {
      wrapper = mountComponent(AIAnalysis)
      
      assertions.expectComponentToRender(wrapper)
      expect(wrapper.find('[data-testid="ai-analysis-container"]').exists()).toBe(true)
    })

    it('应该显示分析表单', () => {
      wrapper = mountComponent(AIAnalysis)
      
      expect(wrapper.find('[data-testid="analysis-form"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="chat-input"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="analyze-button"]').exists()).toBe(true)
    })

    it('应该显示历史记录区域', () => {
      wrapper = mountComponent(AIAnalysis)
      
      expect(wrapper.find('[data-testid="analysis-history"]').exists()).toBe(true)
    })
  })

  describe('分析功能', () => {
    it('应该能够提交分析请求', async () => {
      wrapper = mountComponent(AIAnalysis)
      
      const chatInput = '[data-testid="chat-input"]'
      const analyzeButton = '[data-testid="analyze-button"]'
      const testChatData = '用户: 你好\n助手: 您好，有什么可以帮助您的吗？'
      
      // 输入聊天数据
      await domUtils.inputText(wrapper, chatInput, testChatData)
      
      // 点击分析按钮
      await domUtils.triggerEvent(wrapper, analyzeButton, 'click')
      
      // 验证API调用
      expect(mockPerformAnalysis).toHaveBeenCalledWith({
        chatData: testChatData
      })
    })

    it('应该显示分析结果', async () => {
      const mockResult = testDataGenerator.createAnalysisResult({
        summary: '这是一个友好的对话',
        sentiment: 'positive'
      })
      
      mockPerformAnalysis.mockResolvedValue(mockResult)
      
      wrapper = mountComponent(AIAnalysis)
      
      // 触发分析
      await domUtils.triggerEvent(wrapper, '[data-testid="analyze-button"]', 'click')
      
      // 等待异步操作完成
      await wrapper.vm.$nextTick()
      
      // 验证结果显示
      expect(wrapper.find('[data-testid="analysis-result"]').exists()).toBe(true)
      assertions.expectTextContent(wrapper, '[data-testid="analysis-summary"]', '这是一个友好的对话')
      assertions.expectTextContent(wrapper, '[data-testid="analysis-sentiment"]', 'positive')
    })

    it('应该处理分析错误', async () => {
      const errorMessage = '分析失败，请重试'
      mockPerformAnalysis.mockRejectedValue(new Error(errorMessage))
      
      wrapper = mountComponent(AIAnalysis)
      
      // 触发分析
      await domUtils.triggerEvent(wrapper, '[data-testid="analyze-button"]', 'click')
      
      // 等待异步操作完成
      await wrapper.vm.$nextTick()
      
      // 验证错误显示
      expect(wrapper.find('[data-testid="error-message"]').exists()).toBe(true)
      assertions.expectTextContent(wrapper, '[data-testid="error-message"]', errorMessage)
    })
  })

  describe('历史记录功能', () => {
    it('应该加载分析历史', async () => {
      wrapper = mountComponent(AIAnalysis)
      
      // 等待组件挂载完成
      await wrapper.vm.$nextTick()
      
      // 验证API调用
      expect(mockGetAnalysisHistory).toHaveBeenCalled()
    })

    it('应该显示历史记录列表', async () => {
      const mockHistory = [
        testDataGenerator.createAnalysisResult({ id: 1, summary: '历史分析1' }),
        testDataGenerator.createAnalysisResult({ id: 2, summary: '历史分析2' })
      ]
      
      mockGetAnalysisHistory.mockResolvedValue(mockHistory)
      
      wrapper = mountComponent(AIAnalysis)
      
      // 等待数据加载
      await wrapper.vm.$nextTick()
      
      // 验证历史记录显示
      const historyItems = wrapper.findAll('[data-testid="history-item"]')
      expect(historyItems).toHaveLength(2)
      
      assertions.expectTextContent(wrapper, '[data-testid="history-item"]:first-child', '历史分析1')
    })

    it('应该能够查看历史记录详情', async () => {
      wrapper = mountComponent(AIAnalysis)
      
      // 点击历史记录项
      await domUtils.triggerEvent(wrapper, '[data-testid="history-item"]:first-child', 'click')
      
      // 验证详情显示
      expect(wrapper.find('[data-testid="history-detail"]').exists()).toBe(true)
    })
  })

  describe('表单验证', () => {
    it('应该验证必填字段', async () => {
      wrapper = mountComponent(AIAnalysis)
      
      // 不输入内容直接点击分析
      await domUtils.triggerEvent(wrapper, '[data-testid="analyze-button"]', 'click')
      
      // 验证错误提示
      expect(wrapper.find('[data-testid="validation-error"]').exists()).toBe(true)
      assertions.expectTextContent(wrapper, '[data-testid="validation-error"]', '请输入聊天内容')
    })

    it('应该验证输入长度', async () => {
      wrapper = mountComponent(AIAnalysis)
      
      // 输入过短的内容
      await domUtils.inputText(wrapper, '[data-testid="chat-input"]', 'hi')
      await domUtils.triggerEvent(wrapper, '[data-testid="analyze-button"]', 'click')
      
      // 验证长度错误提示
      expect(wrapper.find('[data-testid="validation-error"]').exists()).toBe(true)
      assertions.expectTextContent(wrapper, '[data-testid="validation-error"]', '聊天内容至少需要10个字符')
    })
  })

  describe('加载状态', () => {
    it('应该显示分析加载状态', async () => {
      // 让API调用挂起
      mockPerformAnalysis.mockImplementation(() => new Promise(() => {}))
      
      wrapper = mountComponent(AIAnalysis)
      
      // 触发分析
      await domUtils.triggerEvent(wrapper, '[data-testid="analyze-button"]', 'click')
      
      // 验证加载状态
      expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="analyze-button"]').attributes('disabled')).toBeDefined()
    })

    it('应该显示历史记录加载状态', () => {
      // 让API调用挂起
      mockGetAnalysisHistory.mockImplementation(() => new Promise(() => {}))
      
      wrapper = mountComponent(AIAnalysis)
      
      // 验证历史记录加载状态
      expect(wrapper.find('[data-testid="history-loading"]').exists()).toBe(true)
    })
  })
})