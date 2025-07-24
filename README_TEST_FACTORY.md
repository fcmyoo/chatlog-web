# 测试数据工厂和夹具系统

## 项目概述

本项目实现了一套完整的测试数据工厂和夹具系统，旨在为前端和后端测试提供统一、可靠、易用的测试数据管理解决方案。

## 🚀 主要特性

- **统一的测试数据生成** - 提供一致的API用于生成各种类型的测试数据
- **智能夹具管理** - 自动化的测试环境设置和清理
- **跨平台支持** - 同时支持前端(Vue/Vitest)和后端(Node.js/Jest)测试
- **模拟对象管理** - 统一管理和清理模拟对象
- **数据库测试支持** - 完整的数据库操作模拟和测试
- **自动清理机制** - 防止测试数据污染和内存泄漏

## 📁 项目结构

```
测试数据工厂和夹具系统/
├── packages/shared/test/           # 共享测试工具
│   ├── ApiTestDataGenerator.ts     # API测试数据生成器
│   ├── DatabaseTestFixtures.js     # 数据库测试夹具
│   └── TestDataCleaner.ts          # 测试数据清理工具
├── apps/frontend/src/test/         # 前端测试工具
│   ├── fixtures/
│   │   └── ComponentFixtures.ts    # Vue组件测试夹具
│   ├── utils/
│   │   └── TestDataFactory.ts      # 前端测试数据工厂
│   └── setup.ts                    # 前端测试环境设置
├── apps/ai-service/tests/          # AI服务测试工具
│   ├── fixtures/
│   │   └── AIServiceFixtures.js    # AI服务测试夹具
│   ├── factories/
│   │   └── TestDataFactory.js      # AI服务测试数据工厂
│   └── setup.js                    # AI服务测试环境设置
├── examples/test-examples/         # 使用示例
│   ├── frontend-component-test.spec.ts
│   └── ai-service-test.spec.js
└── docs/
    └── TEST_DATA_FACTORY_GUIDE.md  # 详细使用指南
```

## 🛠️ 核心组件

### 1. API测试数据生成器 (ApiTestDataGenerator)

提供标准化的API测试数据生成功能：

```typescript
// 生成用户数据
const user = ApiTestDataGenerator.generateUser({
  username: 'testuser',
  email: 'test@example.com'
})

// 生成API响应
const response = ApiTestDataGenerator.generateApiResponse(user)

// 生成分页响应
const paginatedResponse = ApiTestDataGenerator.generatePaginatedResponse(
  items, page, pageSize, total
)
```

### 2. 组件测试夹具 (ComponentFixtures)

专门用于Vue组件测试的夹具管理：

```typescript
const fixtures = new ComponentFixtures()

// 设置聊天组件夹具
const { chatData, mockChatComponent } = fixtures.setupChatComponentFixture(5)

// 挂载组件进行测试
const wrapper = fixtures.mountComponentForTest(mockChatComponent, {
  props: { messages: chatData }
})

// 模拟用户交互
await fixtures.simulateUserInteractions(wrapper, [
  { type: 'input', selector: 'input', value: '测试内容' },
  { type: 'click', selector: 'button' }
])
```

### 3. AI服务测试夹具 (AIServiceFixtures)

专门用于AI服务测试的夹具管理：

```javascript
const fixtures = new AIServiceFixtures()

// 设置模拟AI适配器
const mockAdapter = fixtures.setupMockAdapter('openai', {
  generateResponse: jest.fn().mockResolvedValue({
    content: 'AI生成的内容',
    usage: { tokens: 100 }
  })
})

// 设置测试数据
const chatData = await fixtures.setupChatDataFixture(10)
```

### 4. 数据库测试夹具 (DatabaseTestFixtures)

提供完整的数据库操作模拟：

```javascript
const dbFixtures = new DatabaseTestFixtures()

// 创建模拟集合
const usersCollection = dbFixtures.createMockCollection('users')

// 生成测试数据
const testUsers = dbFixtures.generateTestUsers(5)
await usersCollection.insertMany(testUsers)

// 执行查询
const users = await usersCollection.find({}).toArray()
```

### 5. 测试数据清理工具 (TestDataCleaner)

自动化的测试数据清理和管理：

```typescript
const cleaner = new TestDataCleaner()

// 创建临时测试文件
const filePath = await cleaner.createTempTestFile('test.json', testData)

// 注册清理回调
cleaner.registerCleanupCallback(async () => {
  // 自定义清理逻辑
})

// 执行清理
await cleaner.cleanup()
```

## 🚀 快速开始

### 安装依赖

```bash
# 安装前端测试依赖
cd apps/frontend
npm install

# 安装AI服务测试依赖
cd apps/ai-service
npm install
```

### 运行测试

```bash
# 运行前端测试
cd apps/frontend
npm run test

# 运行AI服务测试
cd apps/ai-service
npm run test
```

### 基本使用示例

#### 前端组件测试

```typescript
import { ComponentFixtures } from '@/test/fixtures/ComponentFixtures'

describe('我的组件测试', () => {
  let fixtures: ComponentFixtures

  beforeEach(() => {
    fixtures = new ComponentFixtures()
  })

  afterEach(async () => {
    await fixtures.cleanup()
  })

  it('应该正确渲染', () => {
    const { chatData, mockChatComponent } = fixtures.setupChatComponentFixture(3)
    const wrapper = fixtures.mountComponentForTest(mockChatComponent, {
      props: { messages: chatData }
    })
    
    expect(wrapper.findAll('.message')).toHaveLength(3)
  })
})
```

#### AI服务测试

```javascript
const AIServiceFixtures = require('./fixtures/AIServiceFixtures')

describe('AI服务测试', () => {
  let fixtures

  beforeEach(async () => {
    fixtures = new AIServiceFixtures()
  })

  afterEach(async () => {
    await fixtures.cleanup()
  })

  it('应该分析聊天内容', async () => {
    const mockAdapter = fixtures.setupMockAdapter('openai')
    const chatData = await fixtures.setupChatDataFixture(5)
    
    // 执行测试逻辑
    const result = await aiService.analyze(chatData)
    
    expect(result).toHaveProperty('summary')
  })
})
```

## 📚 详细文档

- [完整使用指南](docs/TEST_DATA_FACTORY_GUIDE.md) - 详细的API文档和使用示例
- [前端组件测试示例](examples/test-examples/frontend-component-test.spec.ts)
- [AI服务测试示例](examples/test-examples/ai-service-test.spec.js)

## 🎯 最佳实践

### 1. 测试数据隔离
- 每个测试使用独立的测试数据
- 避免测试间的数据共享和污染

### 2. 合理使用模拟对象
- 只模拟测试需要的部分
- 避免过度模拟导致测试失去意义

### 3. 及时清理资源
- 使用 `afterEach` 进行测试后清理
- 利用自动清理机制防止内存泄漏

### 4. 分层测试策略
- 单元测试：测试单个组件或函数
- 集成测试：测试组件间的交互
- 端到端测试：测试完整的业务流程

## 🔧 配置说明

### 前端测试配置 (vitest.config.ts)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts,vue}'],
    }
  }
})
```

### AI服务测试配置 (jest.config.js)

```javascript
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testTimeout: 15000
}
```

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 更新日志

### v1.0.0 (2024-01-23)
- ✨ 初始版本发布
- 🎉 完整的测试数据工厂和夹具系统
- 📚 详细的文档和使用示例
- 🧪 前端和后端测试支持
- 🔧 自动化清理机制

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者们！

---

**注意**: 这是一个测试工具项目，主要用于提高测试效率和质量。请确保在生产环境中不要使用测试相关的代码。