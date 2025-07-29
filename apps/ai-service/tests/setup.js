/**
 * Jest测试环境设置文件
 * 已迁移到 TypeScript
 */
import { jest } from '@jest/globals';
import AIServiceFixtures from './fixtures/AIServiceFixtures';

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
jest.setTimeout(15000);

// 在每个测试前设置
beforeEach(async () => {
  // 重置AI服务夹具
  await globalAIFixtures.reset();
});

// 在每个测试后清理
afterEach(async () => {
  // 清理定时器和模拟
  jest.clearAllTimers();
  jest.clearAllMocks();
  
  // 清理AI服务夹具
  await globalAIFixtures.cleanup();
});

// 在所有测试完成后进行最终清理
afterAll(async () => {
  await globalAIFixtures.cleanup();
});

// 全局测试工具函数
global.testUtils = {
  // 创建模拟请求对象
  createMockReq: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {
      'content-type': 'application/json',
      'user-agent': 'test-agent'
    },
    ip: '127.0.0.1',
    method: 'GET',
    url: '/test',
    ...overrides
  }),
  
  // 创建模拟响应对象
  createMockRes: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    return res;
  },
  
  // 创建模拟next函数
  createMockNext: () => jest.fn(),
  
  // 获取全局夹具
  getAIFixtures: () => globalAIFixtures
};

// 模拟外部依赖
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(),
  writeJson: jest.fn().mockResolvedValue(),
  readJson: jest.fn().mockResolvedValue({}),
  pathExists: jest.fn().mockResolvedValue(true),
  remove: jest.fn().mockResolvedValue()
}));

// 模拟HTTP请求
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} })
  })),
  get: jest.fn().mockResolvedValue({ data: {} }),
  post: jest.fn().mockResolvedValue({ data: {} })
}));

// 设置未处理的Promise拒绝处理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

console.log('AI服务测试环境初始化完成');