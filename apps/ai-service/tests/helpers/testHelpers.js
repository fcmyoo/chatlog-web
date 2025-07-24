const request = require('supertest');
const fs = require('fs-extra');
const path = require('path');

/**
 * 测试辅助工具类
 */
class TestHelpers {
  /**
   * 创建模拟的Express应用请求
   * @param {Object} app - Express应用实例
   * @returns {Object} supertest请求对象
   */
  static createRequest(app) {
    return request(app);
  }

  /**
   * 创建模拟的AI适配器
   * @param {Object} overrides - 覆盖的方法
   * @returns {Object} 模拟适配器
   */
  static createMockAdapter(overrides = {}) {
    return {
      generateResponse: jest.fn().mockResolvedValue({
        content: 'Mock AI response',
        usage: { tokens: 100 }
      }),
      validateConfig: jest.fn().mockReturnValue(true),
      ...overrides
    };
  }

  /**
   * 创建模拟的配置对象
   * @param {Object} overrides - 覆盖的配置
   * @returns {Object} 模拟配置
   */
  static createMockConfig(overrides = {}) {
    return {
      openai: {
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo'
      },
      server: {
        port: 3001,
        host: 'localhost'
      },
      ...overrides
    };
  }

  /**
   * 创建测试数据文件
   * @param {string} filename - 文件名
   * @param {Object} data - 数据内容
   * @returns {Promise<string>} 文件路径
   */
  static async createTestDataFile(filename, data) {
    const testDataDir = path.join(__dirname, '../data');
    await fs.ensureDir(testDataDir);
    const filePath = path.join(testDataDir, filename);
    await fs.writeJson(filePath, data, { spaces: 2 });
    return filePath;
  }

  /**
   * 清理测试数据文件
   * @param {string} filename - 文件名
   */
  static async cleanupTestDataFile(filename) {
    const filePath = path.join(__dirname, '../data', filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  }

  /**
   * 模拟HTTP请求
   * @param {Object} options - 请求选项
   * @returns {Object} 模拟响应
   */
  static mockHttpRequest(options = {}) {
    return {
      method: 'GET',
      url: '/test',
      headers: { 'Content-Type': 'application/json' },
      body: {},
      query: {},
      params: {},
      ...options
    };
  }

  /**
   * 模拟HTTP响应
   * @param {Object} options - 响应选项
   * @returns {Object} 模拟响应对象
   */
  static mockHttpResponse(options = {}) {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      ...options
    };
    return res;
  }

  /**
   * 等待异步操作完成
   * @param {number} ms - 等待时间（毫秒）
   */
  static async delay(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成测试用的聊天数据
   * @param {number} count - 消息数量
   * @returns {Array} 聊天消息数组
   */
  static generateChatData(count = 5) {
    const messages = [];
    for (let i = 0; i < count; i++) {
      messages.push({
        id: i + 1,
        content: `Test message ${i + 1}`,
        sender: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
        type: 'text'
      });
    }
    return messages;
  }

  /**
   * 生成测试用的分析结果
   * @param {Object} overrides - 覆盖的属性
   * @returns {Object} 分析结果对象
   */
  static generateAnalysisResult(overrides = {}) {
    return {
      id: 'test-analysis-' + Date.now(),
      summary: 'This is a test analysis summary',
      sentiment: 'positive',
      keywords: ['test', 'analysis', 'chat'],
      topics: ['testing', 'development'],
      statistics: {
        messageCount: 10,
        wordCount: 150,
        averageLength: 15
      },
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * 验证API响应格式
   * @param {Object} response - API响应
   * @param {Array} requiredFields - 必需字段
   */
  static validateApiResponse(response, requiredFields = []) {
    expect(response).toBeDefined();
    expect(typeof response).toBe('object');
    
    requiredFields.forEach(field => {
      expect(response).toHaveProperty(field);
    });
  }

  /**
   * 验证错误响应格式
   * @param {Object} error - 错误对象
   */
  static validateErrorResponse(error) {
    expect(error).toBeDefined();
    expect(error).toHaveProperty('message');
    expect(typeof error.message).toBe('string');
  }
}

module.exports = TestHelpers;