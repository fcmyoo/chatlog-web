/**
 * 高性能请求队列管理器
 * 实现请求优先级、批量处理、并发控制和智能调度
 */

const EventEmitter = require('events')

/**
 * 请求优先级
 */
const Priority = {
  CRITICAL: 0,  // 关键请求（用户交互）
  HIGH: 1,      // 高优先级（数据分析）
  NORMAL: 2,    // 普通请求（批量操作）
  LOW: 3        // 低优先级（预加载、清理）
}

/**
 * 队列策略
 */
const QueueStrategy = {
  FIFO: 'fifo',           // 先进先出
  PRIORITY: 'priority',   // 优先级队列
  ROUND_ROBIN: 'round_robin',  // 轮询
  WEIGHTED: 'weighted'    // 加权调度
}

/**
 * 请求项
 */
class QueueItem {
  constructor(id, task, options = {}) {
    this.id = id
    this.task = task
    this.priority = options.priority || Priority.NORMAL
    this.timeout = options.timeout || 30000
    this.retries = options.retries || 0
    this.maxRetries = options.maxRetries || 3
    this.delay = options.delay || 0
    this.weight = options.weight || 1
    this.metadata = options.metadata || {}
    
    this.createdAt = Date.now()
    this.startedAt = null
    this.completedAt = null
    this.attempts = 0
    this.lastError = null
    this.status = 'pending'
  }

  shouldRetry() {
    return this.retries < this.maxRetries && this.status === 'failed'
  }

  getAge() {
    return Date.now() - this.createdAt
  }

  getExecutionTime() {
    return this.completedAt ? this.completedAt - this.startedAt : null
  }
}

/**
 * 智能请求队列
 */
class RequestQueue extends EventEmitter {
  constructor(options = {}) {
    super()
    
    this.options = {
      maxConcurrent: options.maxConcurrent || 3,
      strategy: options.strategy || QueueStrategy.PRIORITY,
      timeout: options.timeout || 30000,
      retryDelay: options.retryDelay || 1000,
      maxRetryDelay: options.maxRetryDelay || 10000,
      enableMetrics: options.enableMetrics !== false,
      priorityWeights: {
        [Priority.CRITICAL]: 10,
        [Priority.HIGH]: 5,
        [Priority.NORMAL]: 2,
        [Priority.LOW]: 1
      },
      ...options
    }

    // 队列状态
    this.queues = new Map()
    this.running = new Map()
    this.completed = new Map()
    this.failed = new Map()
    this.metrics = this.initMetrics()
    
    // 初始化优先级队列
    Object.values(Priority).forEach(priority => {
      this.queues.set(priority, [])
    })

    // 定时器
    this.processingTimer = null
    this.metricsTimer = null
    this.cleanupTimer = null

    // 启动处理器
    this.startProcessing()
    this.startMetricsCollection()
    this.startCleanup()
  }

  /**
   * 初始化性能指标
   */
  initMetrics() {
    return {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageWaitTime: 0,
      averageExecutionTime: 0,
      throughput: 0,
      concurrentPeak: 0,
      queueSizes: new Map(),
      errorRate: 0,
      retryRate: 0,
      lastReset: Date.now()
    }
  }

  /**
   * 添加请求到队列
   */
  async add(id, task, options = {}) {
    const item = new QueueItem(id, task, options)
    
    // 检查重复请求
    if (this.isRunning(id) || this.isQueued(id)) {
      if (options.deduplicate !== false) {
        console.log(`🔄 请求去重: ${id}`)
        return this.waitForExisting(id)
      }
      
      // 如果不去重，生成唯一ID
      item.id = `${id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // 添加到对应优先级队列
    const queue = this.queues.get(item.priority)
    queue.push(item)
    
    this.metrics.totalRequests++
    this.emit('itemAdded', item)
    
    console.log(`📋 添加请求到队列: ${item.id} (优先级: ${item.priority})`)
    
    return new Promise((resolve, reject) => {
      item.resolve = resolve
      item.reject = reject
      
      // 设置超时
      if (item.timeout > 0) {
        item.timeoutHandle = setTimeout(() => {
          this.handleTimeout(item)
        }, item.timeout)
      }
    })
  }

  /**
   * 等待现有请求完成
   */
  async waitForExisting(id) {
    return new Promise((resolve, reject) => {
      const checkRunning = () => {
        const runningItem = this.running.get(id)
        if (runningItem) {
          return new Promise((r, rej) => {
            runningItem.resolve = r
            runningItem.reject = rej
          })
        }
        return null
      }

      const runningPromise = checkRunning()
      if (runningPromise) {
        return runningPromise.then(resolve).catch(reject)
      }

      // 检查队列中的请求
      for (const queue of this.queues.values()) {
        const queuedItem = queue.find(item => item.id === id)
        if (queuedItem) {
          const originalResolve = queuedItem.resolve
          const originalReject = queuedItem.reject
          
          queuedItem.resolve = (result) => {
            originalResolve(result)
            resolve(result)
          }
          
          queuedItem.reject = (error) => {
            originalReject(error)
            reject(error)
          }
          
          return
        }
      }

      // 检查已完成的请求
      const completedItem = this.completed.get(id)
      if (completedItem) {
        return resolve(completedItem.result)
      }

      // 检查失败的请求
      const failedItem = this.failed.get(id)
      if (failedItem) {
        return reject(failedItem.lastError)
      }

      // 请求不存在
      reject(new Error(`请求不存在: ${id}`))
    })
  }

  /**
   * 检查请求是否正在运行
   */
  isRunning(id) {
    return this.running.has(id)
  }

  /**
   * 检查请求是否在队列中
   */
  isQueued(id) {
    for (const queue of this.queues.values()) {
      if (queue.some(item => item.id === id)) {
        return true
      }
    }
    return false
  }

  /**
   * 获取下一个要执行的请求
   */
  getNextItem() {
    switch (this.options.strategy) {
      case QueueStrategy.PRIORITY:
        return this.getNextByPriority()
      case QueueStrategy.ROUND_ROBIN:
        return this.getNextByRoundRobin()
      case QueueStrategy.WEIGHTED:
        return this.getNextByWeight()
      default:
        return this.getNextByFIFO()
    }
  }

  /**
   * 按优先级获取下一个请求
   */
  getNextByPriority() {
    for (const priority of [Priority.CRITICAL, Priority.HIGH, Priority.NORMAL, Priority.LOW]) {
      const queue = this.queues.get(priority)
      if (queue.length > 0) {
        return queue.shift()
      }
    }
    return null
  }

  /**
   * 按FIFO获取下一个请求
   */
  getNextByFIFO() {
    let oldestItem = null
    let oldestQueue = null

    for (const [priority, queue] of this.queues) {
      if (queue.length > 0) {
        const item = queue[0]
        if (!oldestItem || item.createdAt < oldestItem.createdAt) {
          oldestItem = item
          oldestQueue = queue
        }
      }
    }

    return oldestQueue ? oldestQueue.shift() : null
  }

  /**
   * 按轮询获取下一个请求
   */
  getNextByRoundRobin() {
    // 简化的轮询实现
    this._lastRoundRobinPriority = this._lastRoundRobinPriority || Priority.CRITICAL
    
    let priority = this._lastRoundRobinPriority
    for (let i = 0; i < 4; i++) {
      const queue = this.queues.get(priority)
      if (queue.length > 0) {
        this._lastRoundRobinPriority = (priority + 1) % 4
        return queue.shift()
      }
      priority = (priority + 1) % 4
    }
    
    return null
  }

  /**
   * 按权重获取下一个请求
   */
  getNextByWeight() {
    const items = []
    
    for (const [priority, queue] of this.queues) {
      const weight = this.options.priorityWeights[priority] || 1
      queue.forEach(item => {
        for (let i = 0; i < weight; i++) {
          items.push({ item, queue })
        }
      })
    }

    if (items.length === 0) return null

    const selected = items[Math.floor(Math.random() * items.length)]
    const index = selected.queue.indexOf(selected.item)
    if (index > -1) {
      selected.queue.splice(index, 1)
    }
    
    return selected.item
  }

  /**
   * 开始处理队列
   */
  startProcessing() {
    this.processingTimer = setInterval(() => {
      this.processQueue()
    }, 10) // 10ms 间隔，高频处理
  }

  /**
   * 处理队列
   */
  async processQueue() {
    // 检查并发限制
    if (this.running.size >= this.options.maxConcurrent) {
      return
    }

    // 获取下一个请求
    const item = this.getNextItem()
    if (!item) {
      return
    }

    // 检查延迟执行
    if (item.delay > 0 && Date.now() - item.createdAt < item.delay) {
      // 重新放入队列
      const queue = this.queues.get(item.priority)
      queue.unshift(item)
      return
    }

    // 开始执行
    await this.executeItem(item)
  }

  /**
   * 执行请求项
   */
  async executeItem(item) {
    item.status = 'running'
    item.startedAt = Date.now()
    item.attempts++
    
    // 添加到运行队列
    this.running.set(item.id, item)
    
    // 更新并发峰值
    this.metrics.concurrentPeak = Math.max(this.metrics.concurrentPeak, this.running.size)
    
    this.emit('itemStarted', item)
    console.log(`🚀 开始执行请求: ${item.id} (尝试: ${item.attempts})`)

    try {
      // 执行任务
      const result = await this.executeWithTimeout(item)
      
      // 执行成功
      await this.handleSuccess(item, result)
      
    } catch (error) {
      // 执行失败
      await this.handleFailure(item, error)
    }
  }

  /**
   * 带超时的任务执行
   */
  async executeWithTimeout(item) {
    return new Promise(async (resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`任务执行超时: ${item.id}`))
      }, item.timeout)

      try {
        const result = await item.task()
        clearTimeout(timeoutHandle)
        resolve(result)
      } catch (error) {
        clearTimeout(timeoutHandle)
        reject(error)
      }
    })
  }

  /**
   * 处理执行成功
   */
  async handleSuccess(item, result) {
    item.status = 'completed'
    item.completedAt = Date.now()
    item.result = result

    // 清除超时句柄
    if (item.timeoutHandle) {
      clearTimeout(item.timeoutHandle)
    }

    // 从运行队列移除，添加到完成队列
    this.running.delete(item.id)
    this.completed.set(item.id, item)

    // 更新指标
    this.metrics.completedRequests++
    this.updateAverageMetrics(item)

    // 调用回调
    if (item.resolve) {
      item.resolve(result)
    }

    this.emit('itemCompleted', item, result)
    console.log(`✅ 请求执行成功: ${item.id} (耗时: ${item.getExecutionTime()}ms)`)
  }

  /**
   * 处理执行失败
   */
  async handleFailure(item, error) {
    item.lastError = error
    item.status = 'failed'

    console.error(`❌ 请求执行失败: ${item.id}`, error.message)

    // 检查是否需要重试
    if (item.shouldRetry()) {
      await this.scheduleRetry(item)
    } else {
      // 彻底失败
      await this.handleFinalFailure(item, error)
    }
  }

  /**
   * 安排重试
   */
  async scheduleRetry(item) {
    item.retries++
    item.status = 'retrying'

    // 从运行队列移除
    this.running.delete(item.id)

    // 计算重试延迟（指数退避）
    const delay = Math.min(
      this.options.retryDelay * Math.pow(2, item.retries - 1),
      this.options.maxRetryDelay
    )

    console.log(`🔄 安排重试: ${item.id} (${item.retries}/${item.maxRetries}) 延迟: ${delay}ms`)

    // 延迟后重新添加到队列
    setTimeout(() => {
      const queue = this.queues.get(item.priority)
      queue.push(item)
      this.metrics.retryRate++
    }, delay)

    this.emit('itemRetry', item)
  }

  /**
   * 处理最终失败
   */
  async handleFinalFailure(item, error) {
    item.completedAt = Date.now()

    // 清除超时句柄
    if (item.timeoutHandle) {
      clearTimeout(item.timeoutHandle)
    }

    // 从运行队列移除，添加到失败队列
    this.running.delete(item.id)
    this.failed.set(item.id, item)

    // 更新指标
    this.metrics.failedRequests++
    this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests

    // 调用回调
    if (item.reject) {
      item.reject(error)
    }

    this.emit('itemFailed', item, error)
    console.error(`💥 请求最终失败: ${item.id}`)
  }

  /**
   * 处理超时
   */
  handleTimeout(item) {
    if (item.status === 'pending') {
      // 队列超时
      const queue = this.queues.get(item.priority)
      const index = queue.indexOf(item)
      if (index > -1) {
        queue.splice(index, 1)
      }
      
      const error = new Error(`队列等待超时: ${item.id}`)
      this.handleFinalFailure(item, error)
    }
  }

  /**
   * 更新平均指标
   */
  updateAverageMetrics(item) {
    const waitTime = item.startedAt - item.createdAt
    const executionTime = item.getExecutionTime()

    // 简化的移动平均
    this.metrics.averageWaitTime = 
      (this.metrics.averageWaitTime * 0.9) + (waitTime * 0.1)
    
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * 0.9) + (executionTime * 0.1)
  }

  /**
   * 开始指标收集
   */
  startMetricsCollection() {
    this.metricsTimer = setInterval(() => {
      this.updateMetrics()
    }, 5000) // 每5秒更新一次指标
  }

  /**
   * 更新指标
   */
  updateMetrics() {
    const now = Date.now()
    const timeDiff = now - this.metrics.lastReset

    // 更新吞吐量（每秒完成的请求数）
    this.metrics.throughput = (this.metrics.completedRequests / timeDiff) * 1000

    // 更新队列大小
    for (const [priority, queue] of this.queues) {
      this.metrics.queueSizes.set(priority, queue.length)
    }

    this.emit('metricsUpdated', this.metrics)
  }

  /**
   * 开始清理
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, 60000) // 每分钟清理一次
  }

  /**
   * 清理已完成和失败的请求
   */
  cleanup() {
    const now = Date.now()
    const maxAge = 30 * 60 * 1000 // 30分钟

    // 清理已完成的请求
    for (const [id, item] of this.completed) {
      if (now - item.completedAt > maxAge) {
        this.completed.delete(id)
      }
    }

    // 清理失败的请求
    for (const [id, item] of this.failed) {
      if (now - item.completedAt > maxAge) {
        this.failed.delete(id)
      }
    }

    console.log(`🧹 清理完成，保留 ${this.completed.size} 个完成请求，${this.failed.size} 个失败请求`)
  }

  /**
   * 获取队列状态
   */
  getStatus() {
    const totalQueued = Array.from(this.queues.values())
      .reduce((sum, queue) => sum + queue.length, 0)

    return {
      queued: totalQueued,
      running: this.running.size,
      completed: this.completed.size,
      failed: this.failed.size,
      metrics: { ...this.metrics },
      queueDetails: Object.fromEntries(
        Array.from(this.queues.entries()).map(([priority, queue]) => [
          priority,
          {
            length: queue.length,
            items: queue.map(item => ({
              id: item.id,
              age: item.getAge(),
              attempts: item.attempts,
              priority: item.priority
            }))
          }
        ])
      )
    }
  }

  /**
   * 暂停队列处理
   */
  pause() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer)
      this.processingTimer = null
    }
    this.emit('paused')
  }

  /**
   * 恢复队列处理
   */
  resume() {
    if (!this.processingTimer) {
      this.startProcessing()
      this.emit('resumed')
    }
  }

  /**
   * 停止队列
   */
  stop() {
    // 清理定时器
    if (this.processingTimer) {
      clearInterval(this.processingTimer)
    }
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer)
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    // 取消所有待处理的请求
    for (const queue of this.queues.values()) {
      queue.forEach(item => {
        if (item.reject) {
          item.reject(new Error('队列已停止'))
        }
      })
      queue.length = 0
    }

    this.emit('stopped')
  }
}

module.exports = {
  RequestQueue,
  Priority,
  QueueStrategy,
  QueueItem
}