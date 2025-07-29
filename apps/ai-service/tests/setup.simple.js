// Jest测试环境设置文件 - 简化版
import { jest } from '@jest/globals';
import AIServiceFixtures from './fixtures/AIServiceFixtures.simple.js';

// 设置环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // 减少测试时的日志输出

// 创建全局夹具实例
const globalAIFixtures = new AIServiceFixtures();

// 模拟全局对象
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn, // 保留警告
  error: console.error, // 保留错误
};

// 设置测试超时
jest.setTimeout(5000);

// 在每个测试前设置
beforeEach(async () => {
  // 重置AI服务夹具
  await globalAIFixtures.reset();
});

// 在每个测试后清理
afterEach(async () => {
  await globalAIFixtures.cleanup();
});

// 在所有测试完成后清理
afterAll(async () => {
  await globalAIFixtures.cleanup();
});

// 导出夹具以便在测试中使用
global.AIServiceFixtures = globalAIFixtures;