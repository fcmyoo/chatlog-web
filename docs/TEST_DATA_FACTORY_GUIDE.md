# 测试数据工厂和夹具系统使用指南

## 概述

本项目提供了一套完整的测试数据工厂和夹具系统，用于统一管理测试数据的生成、清理和维护。该系统包含以下核心组件：

- **测试数据工厂** - 生成各种类型的测试数据
- **测试夹具** - 管理测试环境的设置和清理
- **API测试数据生成器** - 专门用于API测试的数据生成
- **数据库测试夹具** - 模拟数据库操作和数据管理
- **测试数据清理工具** - 自动清理测试数据和模拟对象

## 系统架构

```
测试数据工厂和夹具系统
├── packages/shared/test/
│   ├── ApiTestDataGenerator.ts     # API测试数据生成器
│   ├── DatabaseTestFixtures.js     # 数据库测试夹具
│   └── TestDataCleaner.ts          # 测试数据清理工具
├── apps/frontend/src/test/
│   ├── fixtures/ComponentFixtures.ts  # 前端组件测试夹具
│   └── utils/TestDataFactory.ts       # 前端测试数据工厂
└── apps/ai-service/tests/
    ├── fixtures/AIServiceFixtures.js  # AI服务测试夹具
    └── factories/TestDataFactory.js   # AI服务测试数据工厂
```

## 快速开始

### 1. 前端组件测试

```typescript
import { describe, it, expect } from 'vitest'
import { ComponentFixtures } from '@/test/fixtures/ComponentFixtures'
import { ApiTestDataGenerator } from 'shared/ApiTestDataGenerator'

describe('聊天组件测试', () => {
  let fixtures: ComponentFixtures

  beforeEach(() => {
    fixtures = new ComponentFixtures()
  })

  afterEach(async () => {
    await fixtures.cleanup()
  })

  it('应该正确渲染聊天消息', async () => {
    // 生成测试数据
    const { chatData, mockChatComponent } = fixtures.setupChatComponentFixture(5)
    
    // 挂载组件
    const wrapper = fixtures.mountComponentForTest(mockChatComponent, {
      props: { messages: chatData }
    })
    
    // 断言
    expect(wrapper.findAll('.message')).toHaveLength(5)
    expect(wrapper.text()).toContain('测试消息 1')
  })

  it('应该处理用户交互', async () => {
    const { mockFormComponent } = fixtures.setupFormComponentFixture()
    
    const wrapper = fixtures.mountComponentForTest(mockFormComponent, {
      props: { 
        fields: [{ name: 'title', type: 'text', label: '标题' }],
        modelValue: {}
      }
    })
    
    // 模拟用户交互
    await fixtures.simulateUserInteractions(wrapper, [
      { type: 'input', selector: 'input[name="title"]', value: '测试标题' },
      { type: 'click', selector: 'button[type="submit"]' }
    ])
    
    expect(wrapper.emitted('submit')).toBeTruthy()
  })
})
```

### 2. AI服务测试

```javascript
const AIServiceFixtures = require('../fixtures/AIServiceFixtures')
const TestDataFactory = require('../factories/TestDataFactory')

describe('AI服务测试', () => {
  let fixtures

  beforeEach(async () => {
    fixtures = new AIServiceFixtures()
    await fixtures.initialize()
  })

  afterEach(async () => {
    await fixtures.cleanup()
  })

  it('应该生成AI分析结果', async () => {
    // 设置模拟适配器
    const mockAdapter = fixtures.setupMockAdapter('openai', {
      generateResponse: jest.fn().mockResolvedValue({
        content: '这是AI生成的分析结果',
        usage: { tokens: 150 }
      })
    })

    // 生成测试数据
    const chatData = await fixtures.setupChatDataFixture(10)
    
    // 执行测试逻辑
    const result = await aiService.analyzeChat(chatData)
    
    // 验证结果
    expect(result).toHaveProperty('summary')
    expect(result).toHaveProperty('sentiment')
    expect(mockAdapter.generateResponse).toHaveBeenCalledTimes(1)
  })

  it('应该处理API错误', async () => {
    // 模拟错误响应
    const errorResponse = fixtures.mockErrorResponse('API调用失败', 500)
    
    fixtures.setupMockAdapter('openai', {
      generateResponse: jest.fn().mockRejectedValue(new Error('API Error'))
    })

    const chatData = TestDataFactory.generateChatData(5)
    
    await expect(aiService.analyzeChat(chatData)).rejects.toThrow('API Error')
  })
})
```

### 3. API测试数据生成

```typescript
import { ApiTestDataGenerator } from 'shared/ApiTestDataGenerator'

describe('API测试', () => {
  it('应该生成标准API响应', () => {
    const user = ApiTestDataGenerator.generateUser({
      username: 'testuser',
      email: 'test@example.com'
    })

    const response = ApiTestDataGenerator.generateApiResponse(user)
    
    expect(response.success).toBe(true)
    expect(response.status).toBe(200)
    expect(response.data).toEqual(user)
    expect(response).toHaveProperty('timestamp')
    expect(response).toHaveProperty('requestId')
  })

  it('应该生成分页响应', () => {
    const messages = ApiTestDataGenerator.generateChatMessages(25)
    const paginatedResponse = ApiTestDataGenerator.generatePaginatedResponse(
      messages.slice(0, 10), // 当前页数据
      1, // 当前页
      10, // 每页大小
      25 // 总数量
    )

    expect(paginatedResponse.data.items).toHaveLength(10)
    expect(paginatedResponse.data.pagination.totalPages).toBe(3)
    expect(paginatedResponse.data.pagination.hasNext).toBe(true)
  })

  it('应该生成错误响应', () => {
    const errorResponse = ApiTestDataGenerator.generateApiError(
      '用户不存在',
      404,
      'USER_NOT_FOUND'
    )

    expect(errorResponse.success).toBe(false)
    expect(errorResponse.status).toBe(404)
    expect(errorResponse.error.code).toBe('USER_NOT_FOUND')
  })
})
```

### 4. 数据库测试

```javascript
const DatabaseTestFixtures = require('shared/DatabaseTestFixtures')

describe('数据库操作测试', () => {
  let dbFixtures

  beforeEach(async () => {
    dbFixtures = new DatabaseTestFixtures()
    await dbFixtures.initialize()
  })

  afterEach(async () => {
    await dbFixtures.cleanup()
  })

  it('应该正确插入和查询用户数据', async () => {
    // 创建用户集合
    const usersCollection = dbFixtures.createMockCollection('users')
    
    // 生成测试用户数据
    const testUsers = dbFixtures.generateTestUsers(3)
    
    // 插入数据
    await usersCollection.insertMany(testUsers)
    
    // 查询数据
    const users = await usersCollection.find({}).toArray()
    expect(users).toHaveLength(3)
    
    // 查询特定用户
    const user = await usersCollection.findOne({ username: 'testuser1' })
    expect(user).toBeTruthy()
    expect(user.email).toBe('testuser1@example.com')
  })

  it('应该支持复杂查询和更新', async () => {
    const chatsCollection = dbFixtures.createMockCollection('chats')
    
    // 生成测试聊天数据
    const testChats = dbFixtures.generateTestChats(5)
    await chatsCollection.insertMany(testChats)
    
    // 更新操作
    const updateResult = await chatsCollection.updateMany(
      { status: 'active' },
      { $set: { lastUpdated: new Date() } }
    )
    
    expect(updateResult.modifiedCount).toBeGreaterThan(0)
    
    // 验证更新结果
    const updatedChats = await chatsCollection.find({ 
      lastUpdated: { $exists: true } 
    }).toArray()
    
    expect(updatedChats.length).toBeGreaterThan(0)
  })
})
```

## 高级用法

### 1. 自定义测试数据生成器

```typescript
// 扩展API测试数据生成器
class CustomApiTestDataGenerator extends ApiTestDataGenerator {
  static generateCustomEntity(overrides = {}) {
    return {
      id: `custom_${Date.now()}`,
      name: '自定义实体',
      type: 'custom',
      properties: {
        color: 'blue',
        size: 'medium'
      },
      createdAt: new Date().toISOString(),
      ...overrides
    }
  }

  static generateBulkCustomEntities(count = 10) {
    return Array.from({ length: count }, (_, index) => 
      this.generateCustomEntity({
        name: `自定义实体${index + 1}`,
        id: `custom_${index + 1}`
      })
    )
  }
}
```

### 2. 组合使用多个夹具

```typescript
describe('集成测试', () => {
  let componentFixtures: ComponentFixtures
  let dbFixtures: DatabaseTestFixtures
  let cleaner: TestDataCleaner

  beforeEach(async () => {
    componentFixtures = new ComponentFixtures()
    dbFixtures = new DatabaseTestFixtures()
    cleaner = new TestDataCleaner()
    
    await dbFixtures.initialize()
  })

  afterEach(async () => {
    await componentFixtures.cleanup()
    await dbFixtures.cleanup()
    await cleaner.cleanup()
  })

  it('应该完成端到端测试流程', async () => {
    // 1. 准备数据库数据
    const usersCollection = dbFixtures.createMockCollection('users')
    const testUsers = dbFixtures.generateTestUsers(2)
    await usersCollection.insertMany(testUsers)

    // 2. 设置组件夹具
    const { chatData } = componentFixtures.setupChatComponentFixture(5)
    
    // 3. 创建临时测试文件
    const testFilePath = await cleaner.createTempTestFile(
      'test-data.json',
      { users: testUsers, chats: chatData }
    )

    // 4. 执行测试逻辑
    // ... 测试代码 ...

    // 清理会自动在afterEach中执行
  })
})
```

### 3. 测试数据清理的高级配置

```typescript
import { TestDataCleaner } from 'shared/TestDataCleaner'

describe('高级清理测试', () => {
  let cleaner: TestDataCleaner

  beforeEach(() => {
    cleaner = new TestDataCleaner({
      baseTestDataDir: './custom-test-data',
      autoCleanup: true,
      retainOnFailure: true // 测试失败时保留数据用于调试
    })
  })

  it('应该管理复杂的测试数据生命周期', async () => {
    // 注册清理回调
    cleaner.registerCleanupCallback(async () => {
      console.log('执行自定义清理逻辑')
      // 清理外部资源
    })

    // 创建测试数据
    const dataDir = await cleaner.createTempTestDir('complex-test')
    const configFile = await cleaner.createTempTestFile(
      'config.json',
      { setting: 'test' },
      'complex-test'
    )

    // 注册模拟对象
    const mockService = jest.fn()
    cleaner.registerMockObject('mockService', mockService)

    // 执行测试
    // ...

    // 获取清理统计
    const stats = cleaner.getCleanupStats()
    console.log('清理统计:', stats)

    // 手动清理（通常在afterEach中自动执行）
    await cleaner.cleanup({
      files: true,
      dirs: true,
      mocks: true,
      callbacks: true,
      envVars: ['TEST_ENV_VAR']
    })
  })
})
```

## 最佳实践

### 1. 测试数据隔离

```typescript
// ✅ 好的做法：每个测试使用独立的数据
describe('用户管理测试', () => {
  let fixtures: ComponentFixtures

  beforeEach(() => {
    fixtures = new ComponentFixtures()
  })

  it('测试1', () => {
    const userData = ApiTestDataGenerator.generateUser({ id: 'test1' })
    // 使用独立的测试数据
  })

  it('测试2', () => {
    const userData = ApiTestDataGenerator.generateUser({ id: 'test2' })
    // 使用不同的测试数据
  })
})

// ❌ 避免：测试间共享可变数据
let sharedUserData // 避免这样做
```

### 2. 合理使用模拟对象

```typescript
// ✅ 好的做法：针对性模拟
it('应该处理API调用', async () => {
  const fixtures = new AIServiceFixtures()
  
  // 只模拟需要的部分
  const mockAdapter = fixtures.setupMockAdapter('openai', {
    generateResponse: jest.fn().mockResolvedValue({
      content: '模拟响应',
      usage: { tokens: 100 }
    })
  })

  // 测试逻辑...
})

// ❌ 避免：过度模拟
// 不要模拟所有东西，只模拟测试需要的部分
```

### 3. 清理策略

```typescript
// ✅ 好的做法：分层清理
describe('复杂测试套件', () => {
  let fixtures: AIServiceFixtures
  let cleaner: TestDataCleaner

  beforeEach(async () => {
    fixtures = new AIServiceFixtures()
    cleaner = new TestDataCleaner()
  })

  afterEach(async () => {
    // 按顺序清理
    await fixtures.cleanup()     // 清理业务相关的模拟
    await cleaner.cleanup({      // 清理文件files: true,
      dirs: true,
      mocks: true,
      callbacks: true,
      envVars: ['TEST_ENV_VAR']
    })
  })

  it('应该完成复杂的业务逻辑测试', async () => {
    // 测试逻辑...
  })
})
```

## 结论

通过使用测试数据工厂和夹具系统，您可以有效地管理测试数据的生成和清理，从而提高测试的可靠性和可维护性。建议在项目中遵循最佳实践，以确保测试的高效性和准确性。