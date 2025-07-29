# 测试文档

[![测试状态](https://github.com/your-username/chatlog-web/workflows/自动化测试管道/badge.svg)](https://github.com/your-username/chatlog-web/actions)
[![代码覆盖率](https://codecov.io/gh/your-username/chatlog-web/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/chatlog-web)
[![覆盖率状态](https://coveralls.io/repos/github/your-username/chatlog-web/badge.svg?branch=main)](https://coveralls.io/github/your-username/chatlog-web?branch=main)

## 概述

本项目采用全面的测试策略，确保代码质量和系统稳定性。我们的测试覆盖率目标是80%以上，并通过自动化CI/CD管道持续验证代码质量。

## 测试架构

### 测试类型

1. **单元测试** - 测试独立的函数和类
2. **集成测试** - 测试组件间的交互
3. **性能测试** - 测试系统性能和负载能力
4. **边缘情况测试** - 测试异常情况和错误处理

### 测试框架

- **Jest** - 主要测试框架
- **Vitest** - 快速单元测试
- **Supertest** - API集成测试
- **Node.js Performance API** - 性能测试

## 项目结构

```
apps/ai-service/tests/
├── services/           # 服务层单元测试
│   ├── AIService.test.js
│   ├── AnalysisService.test.js
│   ├── DataService.test.js
│   └── SchedulerService.test.js
├── config/            # 配置管理测试
│   └── ConfigManager.test.js
├── middleware/        # 中间件测试
│   └── errorHandler.test.js
├── routes/           # 路由集成测试
│   └── aiRoutes.test.js
├── mocks/            # Mock和测试工具
│   └── externalDependencies.js
├── fixtures/         # 测试数据
│   └── testData.js
├── edge-cases/       # 边缘情况测试
│   └── edgeCases.test.js
├── performance/      # 性能测试
│   └── performance.test.js
└── coverage/         # 覆盖率配置
    └── coverage.config.js
```

## 运行测试

### 基本命令

```bash
# 进入AI服务目录
cd apps/ai-service

# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行性能测试
npm run test:performance

# 生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

### 高级命令

```bash
# 运行特定测试文件
npm test -- AIService.test.js

# 运行匹配模式的测试
npm test -- --testNamePattern="应该正确配置"

# 详细输出
npm test -- --verbose

# 更新快照
npm test -- --updateSnapshot
```

## 测试配置

### Jest配置

测试配置位于 [`apps/ai-service/jest.config.js`](../apps/ai-service/jest.config.js)：

```javascript
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'services/**/*.js',
    'config/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 覆盖率配置

覆盖率配置位于 [`apps/ai-service/tests/coverage/coverage.config.js`](../apps/ai-service/tests/coverage/coverage.config.js)。

## 测试数据管理

### 测试工厂

我们使用测试工厂模式生成一致的测试数据：

```javascript
const { createTestChatData, createTestAnalysis } = require('./fixtures/testData');

// 创建测试聊天数据
const chatData = createTestChatData({
  messageCount: 100,
  groupName: 'TestGroup'
});

// 创建测试分析数据
const analysis = createTestAnalysis({
  type: 'programming',
  messageCount: 50
});
```

### Mock系统

外部依赖通过Mock系统隔离：

```javascript
const { mockAIProvider, mockDatabase } = require('./mocks/externalDependencies');

beforeEach(() => {
  mockAIProvider.reset();
  mockDatabase.reset();
});
```

## 性能测试

### 性能指标

我们监控以下性能指标：

- **响应时间** - API响应时间应小于1秒
- **吞吐量** - 系统应支持每秒10个请求
- **内存使用** - 大数据处理时内存增长应小于100MB
- **并发处理** - 支持50个并发请求，成功率80%以上

### 性能测试示例

```javascript
test('应该在合理时间内处理大量聊天数据', async () => {
  const largeDataSet = Array(10000).fill().map((_, i) => 
    `User${i % 100}(id${i % 100}) 2025-01-24 10:00:00\nMessage ${i}`
  ).join('\n');

  const startTime = performance.now();
  const result = dataService.parseChatData(largeDataSet, 'LargeGroup');
  const endTime = performance.now();

  expect(result).toHaveLength(10000);
  expect(endTime - startTime).toBeLessThan(5000); // 5秒内完成
});
```

## 边缘情况测试

### 测试场景

- **无效输入处理**
- **网络错误恢复**
- **资源限制处理**
- **并发冲突解决**
- **数据一致性验证**

### 示例

```javascript
test('应该处理无效的聊天数据格式', () => {
  const invalidData = 'invalid chat format';
  
  expect(() => {
    dataService.parseChatData(invalidData, 'TestGroup');
  }).toThrow('无效的聊天数据格式');
});
```

## CI/CD集成

### GitHub Actions

我们的CI/CD管道包括：

1. **代码检查** - ESLint代码质量检查
2. **单元测试** - 所有单元测试执行
3. **集成测试** - API和组件集成测试
4. **性能测试** - 性能基准验证
5. **覆盖率检查** - 80%覆盖率阈值验证
6. **安全扫描** - 依赖安全检查

### 覆盖率报告

测试覆盖率报告自动上传到：

- **Codecov** - 详细覆盖率分析
- **Coveralls** - 覆盖率趋势跟踪

## 测试最佳实践

### 编写测试

1. **描述性测试名称** - 使用清晰的中文描述
2. **AAA模式** - Arrange, Act, Assert
3. **独立测试** - 每个测试应该独立运行
4. **Mock外部依赖** - 隔离外部系统
5. **测试边缘情况** - 包含异常和边界条件

### 测试维护

1. **定期更新** - 随代码变更更新测试
2. **重构测试** - 保持测试代码质量
3. **监控覆盖率** - 维持80%以上覆盖率
4. **性能监控** - 跟踪测试执行时间

## 故障排除

### 常见问题

#### 测试超时

```bash
# 增加超时时间
npm test -- --testTimeout=30000
```

#### 内存不足

```bash
# 增加Node.js内存限制
node --max-old-space-size=4096 node_modules/.bin/jest
```

#### 覆盖率不足

1. 检查未覆盖的代码行
2. 添加缺失的测试用例
3. 验证测试配置

### 调试测试

```bash
# 调试模式运行测试
node --inspect-brk node_modules/.bin/jest --runInBand

# 只运行失败的测试
npm test -- --onlyFailures

# 详细错误信息
npm test -- --verbose --no-coverage
```

## 报告和监控

### 覆盖率报告

覆盖率报告生成在 `coverage/` 目录：

- `lcov-report/index.html` - HTML格式报告
- `lcov.info` - LCOV格式数据
- `coverage-summary.json` - JSON格式摘要

### 测试报告

测试结果报告包括：

- 测试执行摘要
- 失败测试详情
- 性能测试结果
- 覆盖率统计

## 贡献指南

### 添加新测试

1. 在相应目录创建测试文件
2. 遵循命名约定 `*.test.js`
3. 包含完整的测试覆盖
4. 更新相关文档

### 测试审查

提交测试代码时请确保：

- [ ] 测试通过所有检查
- [ ] 覆盖率达到要求
- [ ] 包含边缘情况
- [ ] 性能测试通过
- [ ] 文档已更新

## 联系信息

如有测试相关问题，请联系开发团队或在项目仓库创建Issue。

---

*最后更新：2025年1月24日*