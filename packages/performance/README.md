# 性能优化包

## 概述

该包提供了高性能的请求队列管理和智能缓存系统，专为AI服务优化设计。

## 核心功能

### 1. 请求队列管理 (RequestQueue)
- 优先级队列（CRITICAL、HIGH、NORMAL、LOW）
- 多种调度策略（FIFO、Priority、Round-robin、Weighted）
- 自动重试机制（指数退避）
- 并发控制和超时管理
- 实时性能指标监控

### 2. 智能缓存系统 (ResponseCache)
- 多级缓存策略（LRU、LFU、TTL、ADAPTIVE）
- 智能数据压缩
- 标签和分组管理
- 缓存预热功能
- 内存使用优化

### 3. 统一性能管理器 (PerformanceManager)
- 四级优化级别（DISABLED、BASIC、STANDARD、AGGRESSIVE）
- 队列和缓存的统一管理
- 批量请求优化
- 性能指标收集和分析
- 智能建议生成

### 4. Express中间件集成
- AI服务专用中间件
- 性能监控端点
- 健康检查集成
- Prometheus指标导出

## 性能特性

### 队列性能
- 高频处理（10ms间隔）
- 智能负载均衡
- 请求去重功能
- 动态并发调整

### 缓存性能  
- 快速内存访问（<1ms）
- 智能淘汰策略
- 压缩存储优化
- 命中率>90%（典型场景）

### 系统集成
- 零配置启动
- 优雅降级
- 资源自动清理
- 实时监控

## 使用示例

```javascript
const { createAIServiceMiddleware } = require('@chatlog/performance')

// 集成到Express应用
const performanceMiddleware = createAIServiceMiddleware({
  level: 'standard',
  maxConcurrent: 3,
  cache: {
    maxSize: 100 * 1024 * 1024, // 100MB
    defaultTTL: 5 * 60 * 1000    // 5分钟
  }
})

app.use(performanceMiddleware)

// 在路由中使用优化请求
router.post('/analysis', async (req, res) => {
  const result = await req.optimizedRequest(
    'analysis_task',
    () => performAnalysis(req.body),
    {
      priority: 'high',
      cache: true,
      ttl: 10 * 60 * 1000
    }
  )
  res.json(result)
})
```

## 监控和诊断

### 性能指标
- `/metrics` - Prometheus格式指标
- `/metrics?format=report` - 详细性能报告  
- `/health` - 系统健康状态

### 关键指标
- 请求吞吐量（req/s）
- 平均响应时间（ms）
- 缓存命中率（%）
- 队列积压情况

## 配置选项

### 优化级别
- `BASIC`: 基础优化，适合小型应用
- `STANDARD`: 标准配置，平衡性能和资源
- `AGGRESSIVE`: 激进优化，最大性能

### 自定义配置
```javascript
{
  level: 'standard',
  enableQueue: true,
  enableCache: true,
  queue: {
    maxConcurrent: 3,
    strategy: 'priority',
    timeout: 30000
  },
  cache: {
    maxSize: 100 * 1024 * 1024,
    strategy: 'adaptive'
  }
}
```

## 最佳实践

1. **合理设置优先级**: 用户交互使用CRITICAL，批量操作使用LOW
2. **配置合适的TTL**: 频繁变化的数据使用短TTL，稳定数据使用长TTL
3. **监控关键指标**: 定期检查缓存命中率和队列积压
4. **分批处理大量请求**: 使用批量API避免系统过载
5. **适当的预热策略**: 在业务高峰前预加载热点数据