# 可观测性系统

## 概述

该包提供了完整的可观测性解决方案，包括结构化日志记录、系统监控和错误追踪功能。

## 核心功能

### 1. 统一日志系统 (Logger)
- **多级别日志**: TRACE、DEBUG、INFO、WARN、ERROR、FATAL
- **结构化输出**: JSON格式日志便于分析和查询
- **多种输出器**: 控制台、文件、轮转文件
- **上下文追踪**: 请求ID、用户ID、会话ID自动关联
- **性能计时**: 内置性能测量和分析

### 2. 系统监控 (Monitor)
- **系统指标**: CPU使用率、内存占用、负载均衡
- **Node.js指标**: 堆内存、事件循环延迟、句柄数
- **HTTP指标**: 请求计数、响应时间、状态码分布
- **自定义指标**: 计数器、仪表、直方图、摘要
- **Prometheus集成**: 标准指标格式输出

### 3. 错误追踪 (ErrorTracker)
- **智能聚合**: 根据错误指纹自动聚合相似错误
- **严重级别**: 自动分类错误严重程度
- **错误类型**: 系统、应用、业务、验证、网络等分类
- **实时告警**: 错误率和关键错误自动告警
- **上下文保存**: 完整的错误上下文和堆栈信息

### 4. 健康检查 (HealthChecker)
- **内存监控**: 自动检测内存使用率
- **事件循环**: 监控Node.js事件循环延迟
- **错误率检查**: 监控系统错误发生频率
- **自定义检查**: 支持添加业务特定的健康检查

## 系统特性

### 高性能设计
- **异步处理**: 所有日志和监控操作都是异步的
- **内存优化**: 智能缓存和数据清理机制
- **批量处理**: 支持批量日志写入和指标收集
- **资源控制**: 自动限制内存使用和文件大小

### 生产就绪
- **零配置启动**: 提供合理的默认配置
- **优雅降级**: 监控组件失败不影响主业务
- **资源清理**: 自动清理过期数据和临时文件
- **进程集成**: 捕获未处理异常和Promise拒绝

### Express集成
- **中间件支持**: 提供即插即用的Express中间件
- **请求追踪**: 自动为每个请求分配唯一ID
- **性能监控**: 自动收集HTTP请求性能指标
- **错误捕获**: 自动捕获和分类HTTP错误

## 使用示例

### 基础配置
```javascript
const { ObservabilityManager } = require('@chatlog/observability')

const observability = new ObservabilityManager({
  logging: {
    console: true,
    consoleLevel: 2, // INFO
    file: {
      path: './logs/app',
      level: 2,
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }
  },
  monitoring: {
    interval: 15000 // 15秒收集间隔
  },
  errorTracking: {
    enabled: true,
    captureUnhandled: true,
    errorRateThreshold: 10
  }
})

// 启动系统
observability.start()
```

### Express集成
```javascript
const middleware = observability.createMiddleware()

// 应用中间件
app.use(middleware.requestLogging)
app.use(middleware.metricsCollection)
app.use(middleware.errorTracking)

// 监控端点
app.get('/metrics', (req, res) => {
  const metrics = observability.getMetricsPrometheus()
  res.set('Content-Type', 'text/plain')
  res.send(metrics)
})

app.get('/health', async (req, res) => {
  const status = await observability.getStatus()
  res.json(status)
})
```

### 日志记录
```javascript
const logger = observability.getLogger('api')

// 结构化日志
logger.info('用户登录', {
  userId: 123,
  username: 'john',
  ip: '192.168.1.1'
})

// 性能计时
const timer = logger.time('数据库查询')
const result = await database.query('SELECT * FROM users')
timer.end({ recordCount: result.length })

// 错误日志
logger.error('数据库连接失败', {
  database: 'users',
  timeout: 5000
}, error)
```

### 自定义指标
```javascript
// 计数器
const requestCounter = observability.addMetric(
  'api_requests_total',
  'counter',
  'API请求总数',
  { endpoint: '/api/users' }
)
requestCounter.inc()

// 仪表
const activeUsers = observability.addMetric(
  'active_users',
  'gauge',
  '在线用户数'
)
activeUsers.set(150)

// 直方图
const responseTime = observability.addMetric(
  'response_time_ms',
  'histogram',
  '响应时间分布'
)
responseTime.observe(245)
```

### 错误追踪
```javascript
// 手动捕获错误
observability.captureError(new Error('业务逻辑错误'), {
  userId: 123,
  operation: 'create-order',
  severity: 'medium'
})

// 获取错误统计
const errorStats = observability.errorTracker.getStats()
console.log('错误统计:', errorStats)

// 获取聚合错误
const errors = observability.errorTracker.getAggregatedErrors({
  severity: 'high',
  limit: 10
})
```

### 健康检查
```javascript
// 添加自定义健康检查
observability.addHealthCheck('database', async () => {
  const isConnected = await database.ping()
  if (!isConnected) {
    throw new Error('数据库连接失败')
  }
  return {
    message: '数据库连接正常',
    details: { latency: '5ms' }
  }
}, { critical: true })

// 获取健康状态
const health = await observability.healthChecker.runAllChecks()
console.log('系统健康状态:', health)
```

## 监控端点

### 指标收集
- `GET /metrics` - Prometheus格式的系统指标
- `GET /metrics?format=json` - JSON格式的指标数据

### 健康检查
- `GET /health` - 完整的系统健康状态
- `GET /health/brief` - 简化的健康状态

### 错误统计
- `GET /errors` - 聚合错误列表
- `GET /errors?severity=high` - 按严重级别过滤
- `GET /errors?type=database` - 按错误类型过滤

## 配置选项

### 日志配置
```javascript
{
  logging: {
    console: true,              // 启用控制台输出
    consoleLevel: 2,            // 控制台日志级别 (INFO)
    file: {
      path: './logs/app',       // 日志文件路径前缀
      level: 1,                 // 文件日志级别 (DEBUG)
      maxSize: 10 * 1024 * 1024, // 最大文件大小
      maxFiles: 5               // 保留文件数量
    }
  }
}
```

### 监控配置
```javascript
{
  monitoring: {
    interval: 15000,            // 指标收集间隔 (毫秒)
    enableSystemMetrics: true,  // 启用系统指标
    enableNodeMetrics: true,    // 启用Node.js指标
    enableHttpMetrics: true     // 启用HTTP指标
  }
}
```

### 错误追踪配置
```javascript
{
  errorTracking: {
    enabled: true,              // 启用错误追踪
    captureUnhandled: true,     // 捕获未处理异常
    errorRateThreshold: 10,     // 错误率告警阈值
    criticalErrorThreshold: 1,  // 关键错误告警阈值
    alertCooldown: 300000,      // 告警冷却时间 (5分钟)
    maxEntries: 1000,           // 最大错误记录数
    timeWindow: 3600000         // 时间窗口 (1小时)
  }
}
```

## 最佳实践

1. **合理设置日志级别**: 生产环境使用INFO级别，开发环境使用DEBUG
2. **监控关键指标**: 重点关注响应时间、错误率和资源使用
3. **定期清理日志**: 设置合适的日志轮转和保留策略
4. **配置告警阈值**: 根据业务特点设置合理的告警阈值
5. **使用结构化日志**: 便于后续的分析和查询
6. **添加业务指标**: 监控业务相关的KPI指标
7. **健康检查覆盖**: 包含所有关键依赖的健康检查
8. **错误分类管理**: 合理分类错误便于快速定位问题