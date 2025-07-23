/**
 * 性能优化包入口文件
 */

const { RequestQueue, Priority, QueueStrategy, QueueItem } = require('./RequestQueue')
const { ResponseCache, CacheStrategy, CacheItem } = require('./ResponseCache')
const { PerformanceManager, OptimizationLevel } = require('./PerformanceManager')
const { 
  createPerformanceMiddleware,
  createAIServiceMiddleware,
  createMetricsEndpoint,
  createHealthCheck
} = require('./middleware')

module.exports = {
  // 核心组件
  RequestQueue,
  ResponseCache,
  PerformanceManager,
  
  // 中间件
  createPerformanceMiddleware,
  createAIServiceMiddleware,
  createMetricsEndpoint,
  createHealthCheck,
  
  // 枚举和常量
  Priority,
  QueueStrategy,
  CacheStrategy,
  OptimizationLevel,
  
  // 辅助类
  QueueItem,
  CacheItem
}