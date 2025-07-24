const TestHelpers = require('../helpers/testHelpers');

/**
 * 测试数据工厂类
 * 提供统一的测试数据生成接口
 */
class TestDataFactory {
  /**
   * 生成聊天数据
   * @param {number} count - 消息数量
   * @returns {Array} 聊天消息数组
   */
  static generateChatData(count = 5) {
    return TestHelpers.generateChatData(count);
  }

  /**
   * 生成分析结果
   * @param {Object} overrides - 覆盖的属性
   * @returns {Object} 分析结果对象
   */
  static generateAnalysisResult(overrides = {}) {
    return TestHelpers.generateAnalysisResult(overrides);
  }

  /**
   * 生成用户数据
   * @param {Object} overrides - 覆盖的属性
   * @returns {Object} 用户对象
   */
  static generateUserData(overrides = {}) {
    return {
      id: 'user-' + Date.now(),
      name: 'Test User',
      email: 'test@example.com',
      avatar: 'https://example.com/avatar.jpg',
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * 生成会话数据
   * @param {Object} overrides - 覆盖的属性
   * @returns {Object} 会话对象
   */
  static generateSessionData(overrides = {}) {
    return {
      id: 'session-' + Date.now(),
      title: 'Test Session',
      participants: ['user1', 'user2'],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 10,
      ...overrides
    };
  }

  /**
   * 生成AI模型配置
   * @param {Object} overrides - 覆盖的属性
   * @returns {Object} AI模型配置对象
   */
  static generateAIModelConfig(overrides = {}) {
    return {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      apiKey: 'test-api-key',
      maxTokens: 1000,
      temperature: 0.7,
      ...overrides
    };
  }

  /**
   * 生成API响应数据
   * @param {Object} data - 响应数据
   * @param {number} status - HTTP状态码
   * @returns {Object} API响应对象
   */
  static generateApiResponse(data = {}, status = 200) {
    return {
      data,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {
        'Content-Type': 'application/json'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 生成错误响应数据
   * @param {string} message - 错误消息
   * @param {number} status - HTTP状态码
   * @returns {Object} 错误响应对象
   */
  static generateErrorResponse(message = 'Test Error', status = 500) {
    return {
      error: {
        message,
        code: status,
        timestamp: new Date().toISOString()
      },
      status,
      statusText: 'Error'
    };
  }
}

module.exports = TestDataFactory;