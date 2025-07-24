# 测试指南

本文档介绍如何在Chatlog Web项目中使用Jest和Vitest测试框架。

## 项目测试架构

### 前端测试 (Vitest)
- **框架**: Vitest + Vue Test Utils
- **配置文件**: `apps/frontend/vitest.config.ts`
- **测试目录**: `apps/frontend/src/test/`
- **运行命令**: `npm run test` (在frontend目录下)

### 后端测试 (Jest)
- **框架**: Jest + Supertest
- **配置文件**: `apps/ai-service/jest.config.js`
- **测试目录**: `apps/ai-service/tests/`
- **运行命令**: `npm run test` (在ai-service目录下)

## 快速开始

### 运行所有测试
```bash
# 在项目根目录
npm run test

# 运行前端测试
npm run test:frontend

# 运行后端测试
npm run test:ai-service

# 监视模式运行测试
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 前端测试示例

#### 组件测试
```typescript
import { describe, it, expect, vi } from 'vitest'
import { mountComponent, testDataGenerator } from '../utils/testHelpers'
import MyComponent from '@/components/MyComponent.vue'

describe('MyComponent.vue', () => {
  it('应该正确渲染', () => {
    const wrapper = mountComponent(MyComponent)
    expect(wrapper.exists()).toBe(true)
  })

  it('应该处理用户交互', async () => {
    const wrapper = mountComponent(MyComponent)
    await wrapper.find('[data-testid="button"]').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

#### API测试
```typescript
import { vi } from 'vitest'
import { aiApi } from '@/api/ai'

vi.mock('@/api/ai', () => ({
  aiApi: {
    performAnalysis: vi.fn()
  }
}))

describe('API调用', () => {
  it('应该调用分析API', async () => {
    const mockResult = testDataGenerator.createAnalysisResult()
    vi.mocked(aiApi.performAnalysis).mockResolvedValue(mockResult)
    
    const result = await aiApi.performAnalysis({ data: 'test' })
    expect(result).toEqual(mockResult)
  })
})
```

### 后端测试示例

#### 服务测试
```javascript
const TestHelpers = require('../helpers/testHelpers');
const AIService = require('../../services/AIService');

describe('AIService', () => {
  let aiService;

  beforeEach(() => {
    aiService = new AIService();
  });

  it('应该生成AI响应', async () => {
    const testData = TestHelpers.generateChatData(3);
    const result = await aiService.generateResponse(testData);
    
    TestHelpers.validateApiResponse(result, ['content', 'usage']);
    expect(result.content).toBeDefined();
  });
});
```

#### API路由测试
```javascript
const request = require('supertest');
const app = require('../../app');

describe('AI API路由', () => {
  it('POST /ai-api/analysis 应该返回分析结果', async () => {
    const response = await request(app)
      .post('/ai-api/analysis')
      .send({ chatData: 'test data' })
      .expect(200);
    
    expect(response.body).toHaveProperty('summary');
    expect(response.body).toHaveProperty('sentiment');
  });
});
```

## 测试工具和辅助函数

### 前端测试工具

#### mountComponent
挂载Vue组件进行测试
```typescript
const wrapper = mountComponent(MyComponent, {
  props: { title: 'Test' }
});
```

#### testDataGenerator
生成测试数据
```typescript
const analysisResult = testDataGenerator.createAnalysisResult({
  summary: '自定义摘要'
});
```

#### domUtils
DOM操作工具
```typescript
// 输入文本
await domUtils.inputText(wrapper, '[data-testid="input"]', 'test text');

// 触发事件
await domUtils.triggerEvent(wrapper, '[data-testid="button"]', 'click');
```

#### assertions
断言工具
```typescript
// 检查组件渲染
assertions.expectComponentToRender(wrapper);

// 检查文本内容
assertions.expectTextContent(wrapper, '.title', '期望的文本');
```

### 后端测试工具

#### TestHelpers
后端测试辅助类
```javascript
// 创建模拟适配器
const mockAdapter = TestHelpers.createMockAdapter();

// 生成测试数据
const chatData = TestHelpers.generateChatData(5);

// 验证API响应
TestHelpers.validateApiResponse(response, ['field1', 'field2']);
```

## 测试最佳实践

### 1. 测试命名
- 使用描述性的测试名称
- 使用中文描述测试意图
- 遵循 "应该 + 动作 + 结果" 的格式

### 2. 测试结构
```typescript
describe('功能模块', () => {
  beforeEach(() => {
    // 测试前准备
  });

  afterEach(() => {
    // 测试后清理
  });

  describe('子功能', () => {
    it('应该执行特定行为', () => {
      // 准备 (Arrange)
      // 执行 (Act)
      // 断言 (Assert)
    });
  });
});
```

### 3. 模拟和存根
- 使用`vi.mock()`模拟外部依赖
- 使用`vi.fn()`创建模拟函数
- 在每个测试后清理模拟状态

### 4. 异步测试
```typescript
it('应该处理异步操作', async () => {
  const promise = asyncFunction();
  await expect(promise).resolves.toBe(expectedValue);
});
```

### 5. 错误测试
```typescript
it('应该处理错误情况', async () => {
  mockFunction.mockRejectedValue(new Error('测试错误'));
  await expect(functionUnderTest()).rejects.toThrow('测试错误');
});
```

## 覆盖率配置

### 前端覆盖率
- 配置在`vitest.config.ts`中
- 生成HTML报告在`apps/frontend/coverage/`
- 包含源码文件：`src/**/*.{js,ts,vue}`

### 后端覆盖率
- 配置在`jest.config.js`中
- 生成HTML报告在`apps/ai-service/coverage/`
- 排除测试文件和配置文件

## 持续集成

### GitHub Actions示例
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm run test:coverage
```

## 调试测试

### 前端调试
```bash
# 在浏览器中运行测试
npm run test:ui

# 监视模式
npm run test -- --watch
```

### 后端调试
```bash
# 监视模式
npm run test:watch

# 详细输出
npm run test -- --verbose
```

## 常见问题

### Q: 测试文件应该放在哪里？
A: 
- 前端：`apps/frontend/src/test/`
- 后端：`apps/ai-service/tests/`

### Q: 如何模拟API调用？
A: 使用`vi.mock()`（前端）或`jest.mock()`（后端）

### Q: 如何测试Vue组件？
A: 使用`mountComponent`辅助函数和Vue Test Utils

### Q: 如何生成覆盖率报告？
A: 运行`npm run test:coverage`

## 更多资源

- [Vitest文档](https://vitest.dev/)
- [Jest文档](https://jestjs.io/)
- [Vue Test Utils文档](https://test-utils.vuejs.org/)
- [Supertest文档](https://github.com/visionmedia/supertest)