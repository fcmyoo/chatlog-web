# 统一配置管理系统

这个目录包含了Chatlog Web项目的统一配置管理系统。

## 文件结构

```
packages/config/
├── index.js                    # 主入口文件，提供统一接口
├── UnifiedConfigManager.js     # 核心配置管理器
├── schema.js                   # 配置Schema和验证规则
├── ConfigMigrator.js          # 配置迁移工具
├── services.js                # 向后兼容的服务配置
├── .env.example              # 环境变量模板
└── README.md                 # 此文件
```

## 功能特性

### 🔧 统一配置管理
- 集中管理所有服务配置
- 支持多种配置源（文件、环境变量、默认值）
- 配置优先级：环境变量 > 文件配置 > 默认值

### 📋 配置验证
- 使用Joi进行严格的Schema验证
- 类型检查和默认值设置
- 详细的错误报告

### 🔄 配置迁移
- 从分散配置迁移到统一配置
- 自动备份现有配置
- 生成迁移报告

### 🎯 开发体验
- 热重载配置文件（开发模式）
- 配置变更事件监听
- 完整的TypeScript类型支持

## 使用方法

### 基本使用

```javascript
const { getGlobalConfig } = require('@/packages/config')

// 获取全局配置管理器
const config = getGlobalConfig()

// 获取配置值
const port = config.get('services.ai.port')
const dbConfig = config.getSection('storage')

// 设置配置值
config.set('services.ai.timeout', 30000)
```

### 初始化配置

```javascript
const { initGlobalConfig } = require('@/packages/config')

// 初始化全局配置
await initGlobalConfig({
  configDir: './config',
  validateOnLoad: true,
  watchFiles: true
})
```

### 配置验证

```javascript
const { validateConfig } = require('@/packages/config')

// 验证配置
const result = validateConfig(myConfig, 'services')
if (!result.valid) {
  console.error('配置验证失败:', result.errors)
}
```

## 配置Schema

### 服务配置 (services.json)
```json
{
  "chatlog": {
    "host": "127.0.0.1",
    "port": 5030,
    "protocol": "http",
    "timeout": 10000
  },
  "ai": {
    "host": "localhost", 
    "port": 3001,
    "protocol": "http",
    "timeout": 300000
  },
  "frontend": {
    "host": "localhost",
    "port": 8080,
    "protocol": "http"
  }
}
```

### AI模型配置 (ai-models.json)
```json
{
  "provider": "deepseek",
  "models": {
    "openai": {
      "apiKey": "your-key",
      "model": "gpt-4",
      "baseURL": "https://api.openai.com/v1"
    },
    "deepseek": {
      "apiKey": "your-key", 
      "model": "deepseek-reasoner",
      "baseURL": "https://api.deepseek.com/v1"
    }
  },
  "analysis": {
    "systemPrompt": "...",
    "retryAttempts": 3,
    "maxConcurrentAnalysis": 2
  }
}
```

### 应用配置 (application.json)
```json
{
  "name": "Chatlog Web",
  "version": "1.0.0", 
  "environment": "development",
  "logLevel": "info",
  "cors": {
    "origin": true,
    "credentials": true
  }
}
```

## 环境变量支持

支持通过环境变量覆盖配置：

```bash
# 服务配置
CHATLOG_HOST=127.0.0.1
CHATLOG_PORT=5030
AI_HOST=localhost
AI_PORT=3001

# AI模型配置
DEFAULT_AI_MODEL=deepseek
DEEPSEEK_API_KEY=your-key
GEMINI_API_KEY=your-key

# 应用配置
NODE_ENV=production
LOG_LEVEL=info
```

## 配置迁移

从旧配置系统迁移到新系统：

```javascript
const { migrateConfigs } = require('@/packages/config')

// 执行迁移
await migrateConfigs({
  sourceDir: process.cwd(),
  targetDir: './packages/config',
  backupDir: './config-backup'
})
```

## 向后兼容

保持与现有代码的兼容性：

```javascript
// 仍然可以使用旧的services模块
const { services, getServiceUrl } = require('@/packages/config')

const chatlogUrl = getServiceUrl('chatlog')
```

## 开发建议

1. **配置文件优先级**：环境变量 > JSON文件 > 默认值
2. **敏感信息**：API密钥等敏感信息建议使用环境变量
3. **配置验证**：生产环境启用严格验证模式
4. **热重载**：开发环境启用文件监听以支持热重载

## 故障排除

### 配置验证失败
检查配置文件格式和必填字段：
```bash
node -e "require('./packages/config').validateConfig(require('./config.json'))"
```

### 环境变量不生效
确认环境变量名称正确，使用大写和下划线格式。

### 配置文件丢失
运行配置迁移工具重新生成默认配置文件。