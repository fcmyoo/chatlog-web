import TestDataFactory from '@/tests/factories/TestDataFactory.js';
import TestHelpers from '@/tests/helpers/testHelpers.js';

/**
 * AI服务测试夹具类
 * 提供测试环境的设置和清理功能
 */
class AIServiceFixtures {
  constructor() {
    this.mockAdapters = new Map();
    this.testDataFiles = [];
    this.mockConfigs = new Map();
  }

  // 其他方法保持不变...

  /**
   * 清理所有测试数据和模拟对象
   */
  async cleanup() {
    // 清理测试数据文件
    for (const filename of this.testDataFiles) {
      await TestHelpers.cleanupTestDataFile(filename);
    }
    this.testDataFiles = [];

    // 清理模拟对象
    this.mockAdapters.clear();
    this.mockConfigs.clear();

    // 清理Jest模拟
    jest.clearAllMocks();
  }

  // 其他方法保持不变...
}

export default AIServiceFixtures;