# 🏗️ 企业级多模型适配器架构

## 📋 概述

这是一个为 Chatlog Web AI 服务设计的企业级多模型适配器架构，支持统一接入多个主流AI模型提供商，包括 OpenAI、DeepSeek、Google Gemini、百度文心一言、阿里通义千问、腾讯混元等。

## ✨ 核心特性

- 🎯 **统一接口** - 所有AI模型使用相同的接口，便于切换和管理
- 🏭 **工厂模式** - 动态创建和管理适配器实例
- 📊 **智能路由** - 基于成本、性能、负载的智能模型选择
- ⚖️ **负载均衡** - 支持多种负载均衡策略
- 🔄 **故障转移** - 自动故障检测和切换
- 💰 **成本优化** - 智能成本控制和使用量监控
- 🔒 **安全认证** - 统一的API密钥和权限管理
- 📈 **性能监控** - 实时性能指标收集和分析
- 🧪 **健康检查** - 定期健康状态检测
- 🔧 **配置管理** - 热更新配置支持

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    适配器管理器 (AdapterManager)                │
├─────────────────────────────────────────────────────────────┤
│  智能路由  │  负载均衡  │  故障转移  │  性能监控  │  健康检查  │
├─────────────────────────────────────────────────────────────┤
│                    适配器注册中心 (AdapterRegistry)             │
├─────────────────────────────────────────────────────────────┤
│                    配置管理器 (ModelConfigManager)             │
├─────────────────────────────────────────────────────────────┤
│                    基础适配器 (BaseAdapter)                    │
├─────────────────────────────────────────────────────────────┤
│  OpenAI  │  DeepSeek  │  Google  │  百度  │  阿里  │  腾讯  │
└─────────────────────────────────────────────────────────────┘
```

## 📁 目录结构

```
adapters/
├── interfaces/           # 接口定义
│   └── AIModelAdapter.js
├── base/                # 基础类
│   └── BaseAdapter.js
├── implementations/     # 适配器实现
│   ├── OpenAIAdapter.js
│   ├── DeepSeekAdapter.js
│   └── GoogleAdapter.js
├── config/             # 配置管理
│   └── ModelConfigManager.js
├── examples/           # 使用示例
│   └── usage-examples.js
├── AdapterFactory.js   # 工厂模式
├── AdapterRegistry.js  # 注册中心
├── AdapterManager.js   # 管理器
├── index.js           # 入口文件
└── README.md          # 文档
```

## 🚀 快速开始

### 1. 基础使用

```javascript
const { initializeAdapterSystem, createQuickAdapter, Message, ChatOptions } = require('./adapters');

// 初始化系统
await initializeAdapterSystem();

// 创建适配器
const adapter = await createQuickAdapter('OpenAI', 'gpt-3.5-turbo', 'your-api-key');

// 发送请求
const messages = [new Message('user', '你好')];
const response = await adapter.chat(messages, new ChatOptions({ maxTokens: 100 }));

console.log(response.content);
```

### 2. 智能路由

```javascript
const { smartChat, Message } = require('./adapters');

// 成本优化
const response1 = await smartChat(
  [new Message('user', '简单问题')],
  { costOptimized: true }
);

// 性能优化
const response2 = await smartChat(
  [new Message('user', '复杂问题')],
  { performanceOptimized: true }
);
```

### 3. 配置管理

```javascript
const { globalConfigManager } = require('./adapters');

// 添加配置
await globalConfigManager.setConfig('OpenAI', 'gpt-4', {
  provider: 'OpenAI',
  model: 'gpt-4',
  apiKey: 'your-api-key',
  maxTokens: 8192,
  costPer1kTokens: 0.03,
  enabled: true,
  priority: 1
});

// 获取配置
const config = globalConfigManager.getConfig('OpenAI', 'gpt-4');
```

## 🔧 配置说明

### 模型配置格式

```json
{
  "provider": "OpenAI",
  "model": "gpt-4",
  "endpoint": "https://api.openai.com/v1",
  "apiKey": "your-api-key",
  "maxTokens": 8192,
  "temperature": 0.7,
  "timeout": 30000,
  "retryAttempts": 3,
  "retryDelay": 1000,
  "costPer1kTokens": 0.03,
  "capabilities": {
    "supportsStreaming": true,
    "supportsImages": true,
    "supportsFunctionCalling": true,
    "contextWindow": 8192
  },
  "rateLimit": {
    "requestsPerMinute": 60,
    "tokensPerMinute": 90000
  },
  "enabled": true,
  "priority": 1
}
```

### 负载均衡策略

- `round_robin` - 轮询
- `weighted_round_robin` - 加权轮询
- `least_connections` - 最少连接
- `response_time` - 响应时间

### 路由规则

```javascript
// 添加自定义路由规则
globalAdapterManager.addRoutingRule({
  name: 'custom_rule',
  condition: (request) => request.options?.customFlag === true,
  action: (providers) => providers.find(p => p.provider === 'OpenAI')
});
```

## 📊 监控和指标

### 性能指标

- 总请求数
- 成功/失败请求数
- 平均响应时间
- 令牌使用量
- 总成本
- 错误率
- 可用性

### 健康检查

```javascript
// 单个适配器健康检查
const healthResult = await adapter.healthCheck();

// 所有适配器健康检查
const allHealthResults = await globalRegistry.healthCheckAll();
```

### 系统状态

```javascript
const { getSystemStatus } = require('./adapters');

const status = getSystemStatus();
console.log(status);
```

## 🔒 安全特性

- API密钥加密存储
- 请求签名验证
- 速率限制保护
- 访问日志记录
- 权限控制

## 🧪 测试

```bash
# 运行使用示例
node adapters/examples/usage-examples.js

# 运行特定示例
node -e "require('./adapters/examples/usage-examples').basicUsageExample()"
```

## 📈 扩展开发

### 添加新的适配器

1. 继承 `BaseAdapter` 类
2. 实现必需的方法
3. 注册到适配器注册中心

```javascript
class CustomAdapter extends BaseAdapter {
  async chat(messages, options) {
    // 实现聊天逻辑
  }
  
  async healthCheck() {
    // 实现健康检查
  }
  
  getCapabilities() {
    // 返回模型能力
  }
}

// 注册适配器
globalRegistry.register('Custom', CustomAdapter, metadata);
```

### 添加新的路由规则

```javascript
globalAdapterManager.addRoutingRule({
  name: 'my_rule',
  condition: (request) => {
    // 判断条件
    return true;
  },
  action: (providers) => {
    // 选择逻辑
    return providers[0];
  }
});
```

## 🐛 故障排除

### 常见问题

1. **适配器初始化失败**
   - 检查API密钥是否正确
   - 确认网络连接正常
   - 验证配置格式

2. **请求超时**
   - 增加超时时间配置
   - 检查网络延迟
   - 考虑使用重试机制

3. **速率限制**
   - 调整请求频率
   - 使用多个API密钥
   - 启用负载均衡

### 调试模式

```javascript
// 启用详细日志
process.env.DEBUG = 'adapters:*';

// 监听事件
globalAdapterManager.on('adapterRequestStart', console.log);
globalAdapterManager.on('adapterRequestError', console.error);
```

## 📞 支持

如有问题或建议，请：

1. 查看使用示例
2. 检查配置文档
3. 提交 Issue
4. 联系开发团队

## 📄 许可证

Apache License 2.0

---

🎉 享受企业级多模型适配器架构带来的强大功能！