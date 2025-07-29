import { jest } from '@jest/globals';
import TestHelpers from '@/tests/helpers/testHelpers.js';

describe('TestHelpers', () => {
  test('应该能够创建模拟请求', () => {
    const mockApp = { use: jest.fn() };
    const request = TestHelpers.createRequest(mockApp);
    expect(request).toBeDefined();
  });

  test('应该能够创建模拟适配器', () => {
    const mockAdapter = TestHelpers.createMockAdapter();
    expect(mockAdapter).toHaveProperty('generateResponse');
    expect(mockAdapter).toHaveProperty('validateConfig');
  });

  test('应该能够创建模拟配置', () => {
    const mockConfig = TestHelpers.createMockConfig();
    expect(mockConfig).toHaveProperty('openai');
    expect(mockConfig).toHaveProperty('server');
  });

  test('应该能够生成聊天数据', () => {
    const chatData = TestHelpers.generateChatData(3);
    expect(chatData).toHaveLength(3);
    expect(chatData[0]).toHaveProperty('id');
    expect(chatData[0]).toHaveProperty('content');
  });
});