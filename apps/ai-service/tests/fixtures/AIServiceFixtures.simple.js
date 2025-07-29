import { jest } from '@jest/globals';
import TestDataFactory from '@/tests/factories/TestDataFactory.js';
import TestHelpers from '@/tests/helpers/testHelpers.js';

/**
 * AI服务测试夹具类 - 简化版
 * 提供测试环境的设置和清理功能
 */
class AIServiceFixtures {
  constructor() {
    this.mockAdapters = new Map();
    this.testDataFiles = [];
    this.mockConfigs = new Map();
  }

  /**
   * 重置所有测试数据
   */
  async reset() {
    await this.cleanup();
    // 重新初始化
    this.mockAdapters = new Map();
    this.testDataFiles = [];
    this.mockConfigs = new Map();
  }

  /**
   * 清理所有测试数据和模拟对象
   */
  async cleanup() {
    // 清理测试数据文件
    for (const filename of this.testDataFiles) {
      try {
        await TestHelpers.cleanupTestDataFile(filename);
      } catch (error) {
        // 忽略清理错误
      }
    }
    this.testDataFiles = [];

    // 清理模拟对象
    this.mockAdapters.clear();
    this.mockConfigs.clear();

    // 清理Jest模拟
    if (typeof jest !== 'undefined') {
      jest.clearAllMocks();
    }
  }

  /**
   * 创建模拟AI适配器
   */
  createMockAIAdapter(overrides = {}) {
    const mockAdapter = TestHelpers.createMockAdapter(overrides);
    this.mockAdapters.set('test-adapter', mockAdapter);
    return mockAdapter;
  }

  /**
   * 创建模拟配置
   */
  createMockConfig(overrides = {}) {
    const mockConfig = TestHelpers.createMockConfig(overrides);
    this.mockConfigs.set('test-config', mockConfig);
    return mockConfig;
  }
}

export default AIServiceFixtures;