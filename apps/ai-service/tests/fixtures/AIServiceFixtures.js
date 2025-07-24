const TestDataFactory = require('../factories/TestDataFactory');
const TestHelpers = require('../helpers/testHelpers');

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

  /**
   * 设置模拟AI适配器
   * @param {string} provider - 提供商名称
   * @param {Object} overrides - 覆盖的方法
   * @returns {Object} 模拟适配器
   */
  setupMockAdapter(provider = 'openai', overrides = {}) {
    const mockAdapter = TestHelpers.createMockAdapter(overrides);
    this.mockAdapters.set(provider, mockAdapter);
    return mockAdapter;
  }

  /**
   * 获取模拟适配器
   * @param {string} provider - 提供商名称
   * @returns {Object} 模拟适配器
   */
  getMockAdapter(provider = 'openai') {
    return this.mockAdapters.get(provider);
  }

  /**
   * 设置测试配置
   * @param {string} configName - 配置名称
   * @param {Object} config - 配置对象
   */
  setupTestConfig(configName, config = {}) {
    const testConfig = TestHelpers.createMockConfig(config);
    this.mockConfigs.set(configName, testConfig);
    return testConfig;
  }

  /**
   * 获取测试配置
   * @param {string} configName - 配置名称
   * @returns {Object} 测试配置
   */
  getTestConfig(configName) {
    return this.mockConfigs.get(configName);
  }

  /**
   * 创建测试数据文件
   * @param {string} filename - 文件名
   * @param {Object} data - 数据内容
   * @returns {Promise<string>} 文件路径
   */
  async createTestDataFile(filename, data) {
    const filePath = await TestHelpers.createTestDataFile(filename, data);
    this.testDataFiles.push(filename);
    return filePath;
  }

  /**
   * 设置聊天数据夹具
   * @param {number} messageCount - 消息数量
   * @returns {Promise<Array>} 聊天数据
   */
  async setupChatDataFixture(messageCount = 10) {
    const chatData = TestDataFactory.generateChatData(messageCount);
    await this.createTestDataFile('chat-data.json', chatData);
    return chatData;
  }

  /**
   * 设置分析结果夹具
   * @param {Object} overrides - 覆盖的属性
   * @returns {Promise<Object>} 分析结果
   */
  async setupAnalysisResultFixture(overrides = {}) {
    const analysisResult = TestDataFactory.generateAnalysisResult(overrides);
    await this.createTestDataFile('analysis-result.json', analysisResult);
    return analysisResult;
  }

  /**
   * 设置用户数据夹具
   * @param {Object} overrides - 覆盖的属性
   * @returns {Promise<Object>} 用户数据
   */
  async setupUserDataFixture(overrides = {}) {
    const userData = TestDataFactory.generateUserData(overrides);
    await this.createTestDataFile('user-data.json', userData);
    return userData;
  }

  /**
   * 设置会话数据夹具
   * @param {Object} overrides - 覆盖的属性
   * @returns {Promise<Object>} 会话数据
   */
  async setupSessionDataFixture(overrides = {}) {
    const sessionData = TestDataFactory.generateSessionData(overrides);
    await this.createTestDataFile('session-data.json', sessionData);
    return sessionData;
  }

  /**
   * 模拟成功的API响应
   * @param {Object} data - 响应数据
   * @param {number} status - HTTP状态码
   * @returns {Object} 模拟响应
   */
  mockSuccessResponse(data = {}, status = 200) {
    return TestDataFactory.generateApiResponse(data, status);
  }

  /**
   * 模拟错误的API响应
   * @param {string} message - 错误消息
   * @param {number} status - HTTP状态码
   * @returns {Object} 模拟错误响应
   */
  mockErrorResponse(message = 'Test Error', status = 500) {
    return TestDataFactory.generateErrorResponse(message, status);
  }

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

  /**
   * 重置所有夹具到初始状态
   */
  async reset() {
    await this.cleanup();
    this.mockAdapters = new Map();
    this.testDataFiles = [];
    this.mockConfigs = new Map();
  }
}

module.exports = AIServiceFixtures;