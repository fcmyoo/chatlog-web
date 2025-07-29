import { jest } from '@jest/globals';
import TestDataFactory from '@/tests/factories/TestDataFactory.js';

describe('TestDataFactory', () => {
  test('应该能够生成聊天消息', () => {
    const messages = TestDataFactory.generateChatData(5);
    expect(messages).toHaveLength(5);
    expect(messages[0]).toHaveProperty('id');
    expect(messages[0]).toHaveProperty('content');
    expect(messages[0]).toHaveProperty('sender');
  });

  test('应该能够生成AI模型配置', () => {
    const config = TestDataFactory.generateAIModelConfig();
    expect(config).toHaveProperty('provider');
    expect(config).toHaveProperty('model');
    expect(config).toHaveProperty('apiKey');
  });

  test('应该能够生成API响应', () => {
    const response = TestDataFactory.generateApiResponse({ test: 'data' });
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('status');
    expect(response.status).toBe(200);
  });

  test('应该能够生成错误响应', () => {
    const errorResponse = TestDataFactory.generateErrorResponse('Test Error', 400);
    expect(errorResponse).toHaveProperty('error');
    expect(errorResponse).toHaveProperty('status');
    expect(errorResponse.status).toBe(400);
  });
});