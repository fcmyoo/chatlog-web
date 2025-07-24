import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ErrorHandler, ErrorType, ErrorLevel, handleError, withErrorHandling } from '@/utils/errorHandler'

// Mock Element Plus
vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn()
  },
  ElNotification: vi.fn()
}))

describe('ErrorHandler', () => {
  let consoleSpy: any

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleSpy?.mockRestore()
  })

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = ErrorHandler.getInstance()
      const instance2 = ErrorHandler.getInstance()
      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(ErrorHandler)
    })
  })

  describe('全局错误处理函数', () => {
    it('handleError应该能正常工作', () => {
      expect(() => {
        handleError('测试错误', '测试上下文')
      }).not.toThrow()
    })
  })

  describe('错误处理装饰器', () => {
    it('withErrorHandling应该捕获异步函数的错误', async () => {
      const originalFn = vi.fn().mockRejectedValue(new Error('异步错误'))
      const wrappedFn = withErrorHandling(originalFn, '装饰器测试')

      await expect(wrappedFn()).rejects.toThrow('异步错误')
    })

    it('withErrorHandling应该正常传递成功的结果', async () => {
      const originalFn = vi.fn().mockResolvedValue('成功结果')
      const wrappedFn = withErrorHandling(originalFn, '装饰器测试')

      const result = await wrappedFn()
      expect(result).toBe('成功结果')
    })
  })

  describe('错误类型枚举', () => {
    it('应该正确定义错误类型', () => {
      expect(ErrorType.NETWORK).toBe('network')
      expect(ErrorType.API).toBe('api')
      expect(ErrorType.VALIDATION).toBe('validation')
      expect(ErrorType.PERMISSION).toBe('permission')
      expect(ErrorType.UNKNOWN).toBe('unknown')
    })
  })

  describe('错误级别枚举', () => {
    it('应该正确定义错误级别', () => {
      expect(ErrorLevel.INFO).toBe('info')
      expect(ErrorLevel.WARNING).toBe('warning')
      expect(ErrorLevel.ERROR).toBe('error')
      expect(ErrorLevel.CRITICAL).toBe('critical')
    })
  })

  describe('基本功能测试', () => {
    it('ErrorHandler实例应该有必要的方法', () => {
      const instance = ErrorHandler.getInstance()
      expect(typeof instance.handle).toBe('function')
      expect(typeof instance.getErrorHistory).toBe('function')
      expect(typeof instance.clearHistory).toBe('function')
      expect(typeof instance.getErrorStats).toBe('function')
    })

    it('应该能清空错误历史', () => {
      const instance = ErrorHandler.getInstance()
      instance.clearHistory()
      const history = instance.getErrorHistory()
      expect(Array.isArray(history)).toBe(true)
    })

    it('应该能获取错误统计', () => {
      const instance = ErrorHandler.getInstance()
      const stats = instance.getErrorStats()
      expect(typeof stats).toBe('object')
    })
  })
})