/**
 * 日志聚合和分析系统
 * 提供统一的日志收集、处理、存储和分析能力
 */

export interface LogEntry {
  id: string
  timestamp: number
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  category: string
  message: string
  source: string
  metadata: Record<string, any>
  tags: string[]
  userId?: string
  sessionId: string
  context: {
    url: string
    userAgent: string
    timestamp: string
    stack?: string
    performance?: {
      memory: number
      timing: Record<string, number>
    }
  }
  correlationId?: string
  traceId?: string
  processed: boolean
}

export interface LogFilter {
  level?: LogEntry['level'][]
  category?: string[]
  source?: string[]
  tags?: string[]
  timeRange?: {
    start: number
    end: number
  }
  search?: string
  userId?: string
  correlationId?: string
}

export interface LogAnalytics {
  summary: {
    totalLogs: number
    errorRate: number
    warnRate: number
    topCategories: Array<{ category: string; count: number }>
    topSources: Array<{ source: string; count: number }>
    logsByLevel: Record<LogEntry['level'], number>
  }
  trends: {
    hourly: number[]
    daily: number[]
    weekly: number[]
  }
  patterns: {
    frequentErrors: Array<{ message: string; count: number; pattern: string }>
    slowOperations: Array<{ operation: string; avgTime: number; count: number }>
    userActions: Array<{ action: string; count: number; avgDuration: number }>
  }
  correlations: {
    errorCorrelations: Array<{ error: string; precursors: string[] }>
    performanceImpact: Array<{ event: string; impact: number }>
    userBehaviorFlow: Array<{ step: string; nextSteps: string[] }>
  }
}

export interface LogDestination {
  id: string
  name: string
  type: 'console' | 'localStorage' | 'indexedDB' | 'remote' | 'elastic' | 'custom'
  enabled: boolean
  config: Record<string, any>
  filter?: LogFilter
  formatter?: (log: LogEntry) => any
}

/**
 * 日志聚合器
 */
export class LogAggregator {
  private logs: LogEntry[] = []
  private sessionId = this.generateSessionId()
  private destinations = new Map<string, LogDestination>()
  private processors: Array<(log: LogEntry) => LogEntry> = []
  private batchSize = 50
  private flushInterval = 10000 // 10秒
  private maxLogs = 10000
  private retentionPeriod = 7 * 24 * 60 * 60 * 1000 // 7天
  private flushTimer?: number
  private analytics: LogAnalytics | null = null
  private analyticsUpdateInterval = 60000 // 1分钟

  constructor(options: {
    batchSize?: number
    flushInterval?: number
    maxLogs?: number
    retentionPeriod?: number
  } = {}) {
    Object.assign(this, options)
    this.init()
  }

  /**
   * 初始化日志聚合器
   */
  private init(): void {
    this.setupDefaultDestinations()
    this.setupConsoleInterception()
    this.setupPerformanceLogging()
    this.startFlushTimer()
    this.startAnalyticsUpdate()
    
    // 记录初始化日志
    this.log('info', 'system', 'Log aggregator initialized', 'LogAggregator', {
      batchSize: this.batchSize,
      flushInterval: this.flushInterval,
      maxLogs: this.maxLogs
    })
  }

  /**
   * 设置默认输出目标
   */
  private setupDefaultDestinations(): void {
    // 控制台输出
    this.addDestination({
      id: 'console',
      name: '控制台输出',
      type: 'console',
      enabled: true,
      config: {
        colors: true,
        timestamp: true,
        level: true
      },
      formatter: (log) => {
        const timestamp = new Date(log.timestamp).toISOString()
        const level = log.level.toUpperCase()
        const prefix = `[${timestamp}] ${level} [${log.category}/${log.source}]`
        return {
          prefix,
          message: log.message,
          metadata: log.metadata,
          style: this.getConsoleStyle(log.level)
        }
      }
    })

    // 本地存储
    this.addDestination({
      id: 'localStorage',
      name: '本地存储',
      type: 'localStorage',
      enabled: true,
      config: {
        key: 'chatlog_logs',
        maxSize: 5 * 1024 * 1024, // 5MB
        compress: true
      },
      filter: {
        level: ['error', 'warn', 'info']
      }
    })

    // IndexedDB 存储（大容量）
    this.addDestination({
      id: 'indexedDB',
      name: 'IndexedDB存储',
      type: 'indexedDB',
      enabled: true,
      config: {
        dbName: 'ChatlogLogs',
        version: 1,
        storeName: 'logs',
        maxRecords: 50000
      }
    })
  }

  /**
   * 设置控制台拦截
   */
  private setupConsoleInterception(): void {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    }

    console.log = (...args) => {
      this.log('debug', 'console', this.formatConsoleArgs(args), 'console.log', { args })
      originalConsole.log.apply(console, args)
    }

    console.info = (...args) => {
      this.log('info', 'console', this.formatConsoleArgs(args), 'console.info', { args })
      originalConsole.info.apply(console, args)
    }

    console.warn = (...args) => {
      this.log('warn', 'console', this.formatConsoleArgs(args), 'console.warn', { args })
      originalConsole.warn.apply(console, args)
    }

    console.error = (...args) => {
      this.log('error', 'console', this.formatConsoleArgs(args), 'console.error', { 
        args,
        stack: new Error().stack
      })
      originalConsole.error.apply(console, args)
    }

    console.debug = (...args) => {
      this.log('trace', 'console', this.formatConsoleArgs(args), 'console.debug', { args })
      originalConsole.debug.apply(console, args)
    }
  }

  /**
   * 设置性能日志记录
   */
  private setupPerformanceLogging(): void {
    // 页面性能指标
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          this.log('info', 'performance', 'Page load completed', 'performance', {
            loadTime: navigation.loadEventEnd - navigation.loadEventStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            firstByte: navigation.responseStart - navigation.requestStart,
            dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcpConnect: navigation.connectEnd - navigation.connectStart
          })
        }
      }, 0)
    })

    // 资源性能监控
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 1000) { // 只记录慢资源
              this.log('warn', 'performance', `Slow resource: ${entry.name}`, 'performance', {
                resource: entry.name,
                duration: entry.duration,
                size: (entry as any).transferSize,
                type: (entry as any).initiatorType
              })
            }
          }
        })
        resourceObserver.observe({ entryTypes: ['resource'] })

        // 长任务监控
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.log('warn', 'performance', 'Long task detected', 'performance', {
              duration: entry.duration,
              startTime: entry.startTime,
              attribution: (entry as any).attribution
            })
          }
        })
        longTaskObserver.observe({ entryTypes: ['longtask'] })
      } catch (error) {
        console.warn('Performance Observer setup failed:', error)
      }
    }
  }

  /**
   * 记录日志
   */
  log(
    level: LogEntry['level'],
    category: string,
    message: string,
    source: string,
    metadata: Record<string, any> = {},
    tags: string[] = []
  ): string {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      source,
      metadata,
      tags,
      sessionId: this.sessionId,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        performance: this.getPerformanceSnapshot()
      },
      processed: false
    }

    // 应用处理器
    let processedLog = logEntry
    for (const processor of this.processors) {
      processedLog = processor(processedLog)
    }

    // 添加到日志列表
    this.logs.push(processedLog)

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // 立即处理重要日志
    if (level === 'error' || level === 'fatal') {
      this.flushLogs([processedLog])
    }

    return logEntry.id
  }

  /**
   * 结构化日志记录
   */
  structured(data: {
    level: LogEntry['level']
    category: string
    message: string
    source: string
    correlationId?: string
    traceId?: string
    userId?: string
    metadata?: Record<string, any>
    tags?: string[]
  }): string {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level: data.level,
      category: data.category,
      message: data.message,
      source: data.source,
      metadata: data.metadata || {},
      tags: data.tags || [],
      userId: data.userId,
      sessionId: this.sessionId,
      correlationId: data.correlationId,
      traceId: data.traceId,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        performance: this.getPerformanceSnapshot()
      },
      processed: false
    }

    this.logs.push(logEntry)
    return logEntry.id
  }

  /**
   * 批量日志记录
   */
  batch(logs: Array<{
    level: LogEntry['level']
    category: string
    message: string
    source: string
    metadata?: Record<string, any>
    tags?: string[]
  }>): void {
    const timestamp = Date.now()
    const context = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      performance: this.getPerformanceSnapshot()
    }

    const entries = logs.map(log => ({
      id: this.generateLogId(),
      timestamp,
      level: log.level,
      category: log.category,
      message: log.message,
      source: log.source,
      metadata: log.metadata || {},
      tags: log.tags || [],
      sessionId: this.sessionId,
      context,
      processed: false
    }))

    this.logs.push(...entries)
  }

  /**
   * 查询日志
   */
  query(filter: LogFilter = {}): LogEntry[] {
    let results = [...this.logs]

    // 时间范围过滤
    if (filter.timeRange) {
      results = results.filter(log => 
        log.timestamp >= filter.timeRange!.start && 
        log.timestamp <= filter.timeRange!.end
      )
    }

    // 级别过滤
    if (filter.level && filter.level.length > 0) {
      results = results.filter(log => filter.level!.includes(log.level))
    }

    // 分类过滤
    if (filter.category && filter.category.length > 0) {
      results = results.filter(log => filter.category!.includes(log.category))
    }

    // 来源过滤
    if (filter.source && filter.source.length > 0) {
      results = results.filter(log => filter.source!.includes(log.source))
    }

    // 标签过滤
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(log => 
        filter.tags!.some(tag => log.tags.includes(tag))
      )
    }

    // 用户过滤
    if (filter.userId) {
      results = results.filter(log => log.userId === filter.userId)
    }

    // 关联ID过滤
    if (filter.correlationId) {
      results = results.filter(log => log.correlationId === filter.correlationId)
    }

    // 文本搜索
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      results = results.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.category.toLowerCase().includes(searchLower) ||
        log.source.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.metadata).toLowerCase().includes(searchLower)
      )
    }

    return results.sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * 生成日志分析报告
   */
  generateAnalytics(timeRange?: { start: number; end: number }): LogAnalytics {
    const logs = timeRange ? this.query({ timeRange }) : this.logs
    
    return {
      summary: this.generateSummary(logs),
      trends: this.generateTrends(logs),
      patterns: this.generatePatterns(logs),
      correlations: this.generateCorrelations(logs)
    }
  }

  /**
   * 生成摘要统计
   */
  private generateSummary(logs: LogEntry[]): LogAnalytics['summary'] {
    const totalLogs = logs.length
    const errorLogs = logs.filter(l => l.level === 'error').length
    const warnLogs = logs.filter(l => l.level === 'warn').length

    // 分类统计
    const categoryCount = new Map<string, number>()
    const sourceCount = new Map<string, number>()
    const levelCount = new Map<LogEntry['level'], number>()

    logs.forEach(log => {
      categoryCount.set(log.category, (categoryCount.get(log.category) || 0) + 1)
      sourceCount.set(log.source, (sourceCount.get(log.source) || 0) + 1)
      levelCount.set(log.level, (levelCount.get(log.level) || 0) + 1)
    })

    return {
      totalLogs,
      errorRate: totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0,
      warnRate: totalLogs > 0 ? (warnLogs / totalLogs) * 100 : 0,
      topCategories: Array.from(categoryCount.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topSources: Array.from(sourceCount.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      logsByLevel: {
        trace: levelCount.get('trace') || 0,
        debug: levelCount.get('debug') || 0,
        info: levelCount.get('info') || 0,
        warn: levelCount.get('warn') || 0,
        error: levelCount.get('error') || 0,
        fatal: levelCount.get('fatal') || 0
      }
    }
  }

  /**
   * 生成趋势分析
   */
  private generateTrends(logs: LogEntry[]): LogAnalytics['trends'] {
    const now = Date.now()
    const hourBuckets = Array(24).fill(0)
    const dayBuckets = Array(7).fill(0)
    const weekBuckets = Array(4).fill(0)

    logs.forEach(log => {
      const hourIndex = Math.floor((now - log.timestamp) / (60 * 60 * 1000))
      const dayIndex = Math.floor((now - log.timestamp) / (24 * 60 * 60 * 1000))
      const weekIndex = Math.floor((now - log.timestamp) / (7 * 24 * 60 * 60 * 1000))

      if (hourIndex >= 0 && hourIndex < 24) {
        hourBuckets[23 - hourIndex]++
      }
      if (dayIndex >= 0 && dayIndex < 7) {
        dayBuckets[6 - dayIndex]++
      }
      if (weekIndex >= 0 && weekIndex < 4) {
        weekBuckets[3 - weekIndex]++
      }
    })

    return {
      hourly: hourBuckets,
      daily: dayBuckets,
      weekly: weekBuckets
    }
  }

  /**
   * 生成模式分析
   */
  private generatePatterns(logs: LogEntry[]): LogAnalytics['patterns'] {
    const errorLogs = logs.filter(l => l.level === 'error')
    const performanceLogs = logs.filter(l => l.category === 'performance')
    const userLogs = logs.filter(l => l.category === 'user')

    // 频繁错误
    const errorMessages = new Map<string, { count: number; pattern: string }>()
    errorLogs.forEach(log => {
      const key = this.extractErrorPattern(log.message)
      if (!errorMessages.has(key)) {
        errorMessages.set(key, { count: 0, pattern: key })
      }
      errorMessages.get(key)!.count++
    })

    // 慢操作
    const slowOps = new Map<string, { totalTime: number; count: number }>()
    performanceLogs.forEach(log => {
      if (log.metadata.duration > 100) {
        const operation = log.metadata.operation || log.source
        if (!slowOps.has(operation)) {
          slowOps.set(operation, { totalTime: 0, count: 0 })
        }
        const stat = slowOps.get(operation)!
        stat.totalTime += log.metadata.duration
        stat.count++
      }
    })

    // 用户行为
    const userActions = new Map<string, { totalDuration: number; count: number }>()
    userLogs.forEach(log => {
      const action = log.metadata.action || log.message
      if (!userActions.has(action)) {
        userActions.set(action, { totalDuration: 0, count: 0 })
      }
      const stat = userActions.get(action)!
      stat.totalDuration += log.metadata.duration || 0
      stat.count++
    })

    return {
      frequentErrors: Array.from(errorMessages.entries())
        .map(([message, data]) => ({ message, count: data.count, pattern: data.pattern }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      slowOperations: Array.from(slowOps.entries())
        .map(([operation, data]) => ({ 
          operation, 
          avgTime: data.totalTime / data.count, 
          count: data.count 
        }))
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 10),
      userActions: Array.from(userActions.entries())
        .map(([action, data]) => ({ 
          action, 
          count: data.count, 
          avgDuration: data.totalDuration / data.count 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    }
  }

  /**
   * 生成关联分析
   */
  private generateCorrelations(logs: LogEntry[]): LogAnalytics['correlations'] {
    return {
      errorCorrelations: this.findErrorCorrelations(logs),
      performanceImpact: this.findPerformanceImpact(logs),
      userBehaviorFlow: this.findUserBehaviorFlow(logs)
    }
  }

  /**
   * 查找错误关联
   */
  private findErrorCorrelations(logs: LogEntry[]): Array<{ error: string; precursors: string[] }> {
    const errorLogs = logs.filter(l => l.level === 'error')
    const correlations = new Map<string, Map<string, number>>()

    errorLogs.forEach(errorLog => {
      const errorKey = this.extractErrorPattern(errorLog.message)
      if (!correlations.has(errorKey)) {
        correlations.set(errorKey, new Map())
      }

      // 查找错误前1分钟的日志
      const precursorLogs = logs.filter(l => 
        l.timestamp < errorLog.timestamp && 
        l.timestamp > errorLog.timestamp - 60000 &&
        l.level !== 'error'
      )

      precursorLogs.forEach(precursor => {
        const precursorKey = `${precursor.category}:${precursor.source}`
        const counts = correlations.get(errorKey)!
        counts.set(precursorKey, (counts.get(precursorKey) || 0) + 1)
      })
    })

    return Array.from(correlations.entries())
      .map(([error, precursorCounts]) => ({
        error,
        precursors: Array.from(precursorCounts.entries())
          .filter(([, count]) => count >= 2)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([precursor]) => precursor)
      }))
      .filter(({ precursors }) => precursors.length > 0)
      .slice(0, 10)
  }

  /**
   * 查找性能影响
   */
  private findPerformanceImpact(logs: LogEntry[]): Array<{ event: string; impact: number }> {
    const performanceLogs = logs.filter(l => l.category === 'performance')
    const impacts = new Map<string, number[]>()

    performanceLogs.forEach(log => {
      const event = log.source
      const impact = log.metadata.duration || log.metadata.impact || 0
      if (!impacts.has(event)) {
        impacts.set(event, [])
      }
      impacts.get(event)!.push(impact)
    })

    return Array.from(impacts.entries())
      .map(([event, values]) => ({
        event,
        impact: values.reduce((sum, val) => sum + val, 0) / values.length
      }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 10)
  }

  /**
   * 查找用户行为流
   */
  private findUserBehaviorFlow(logs: LogEntry[]): Array<{ step: string; nextSteps: string[] }> {
    const userLogs = logs.filter(l => l.category === 'user' || l.category === 'navigation')
      .sort((a, b) => a.timestamp - b.timestamp)

    const flows = new Map<string, Map<string, number>>()

    for (let i = 0; i < userLogs.length - 1; i++) {
      const current = userLogs[i]
      const next = userLogs[i + 1]

      // 5分钟内的后续操作
      if (next.timestamp - current.timestamp < 5 * 60 * 1000) {
        const currentStep = `${current.category}:${current.source}`
        const nextStep = `${next.category}:${next.source}`

        if (!flows.has(currentStep)) {
          flows.set(currentStep, new Map())
        }
        const nextSteps = flows.get(currentStep)!
        nextSteps.set(nextStep, (nextSteps.get(nextStep) || 0) + 1)
      }
    }

    return Array.from(flows.entries())
      .map(([step, nextStepCounts]) => ({
        step,
        nextSteps: Array.from(nextStepCounts.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([nextStep]) => nextStep)
      }))
      .filter(({ nextSteps }) => nextSteps.length > 0)
      .slice(0, 10)
  }

  /**
   * 添加日志处理器
   */
  addProcessor(processor: (log: LogEntry) => LogEntry): void {
    this.processors.push(processor)
  }

  /**
   * 添加输出目标
   */
  addDestination(destination: LogDestination): void {
    this.destinations.set(destination.id, destination)
  }

  /**
   * 更新输出目标
   */
  updateDestination(id: string, updates: Partial<LogDestination>): boolean {
    const destination = this.destinations.get(id)
    if (!destination) return false

    Object.assign(destination, updates)
    return true
  }

  /**
   * 刷新日志到输出目标
   */
  private async flushLogs(logs: LogEntry[] = []): Promise<void> {
    const logsToFlush = logs.length > 0 ? logs : this.logs.filter(l => !l.processed)

    for (const destination of this.destinations.values()) {
      if (!destination.enabled) continue

      try {
        let filteredLogs = logsToFlush
        
        // 应用过滤器
        if (destination.filter) {
          filteredLogs = this.query(destination.filter).filter(l => logsToFlush.includes(l))
        }

        if (filteredLogs.length === 0) continue

        await this.writeToDestination(destination, filteredLogs)
      } catch (error) {
        console.error(`写入日志目标失败: ${destination.name}`, error)
      }
    }

    // 标记为已处理
    logsToFlush.forEach(log => {
      log.processed = true
    })
  }

  /**
   * 写入到目标
   */
  private async writeToDestination(destination: LogDestination, logs: LogEntry[]): Promise<void> {
    const formattedLogs = destination.formatter 
      ? logs.map(destination.formatter) 
      : logs

    switch (destination.type) {
      case 'console':
        this.writeToConsole(formattedLogs, destination.config)
        break
      case 'localStorage':
        this.writeToLocalStorage(formattedLogs, destination.config)
        break
      case 'indexedDB':
        await this.writeToIndexedDB(formattedLogs, destination.config)
        break
      case 'remote':
        await this.writeToRemote(formattedLogs, destination.config)
        break
      case 'custom':
        if (destination.config.writer) {
          await destination.config.writer(formattedLogs)
        }
        break
    }
  }

  /**
   * 写入控制台
   */
  private writeToConsole(logs: any[], config: any): void {
    logs.forEach(log => {
      if (log.style && config.colors) {
        console.log(`%c${log.prefix}`, log.style, log.message, log.metadata)
      } else {
        console.log(log.prefix, log.message, log.metadata)
      }
    })
  }

  /**
   * 写入 localStorage
   */
  private writeToLocalStorage(logs: LogEntry[], config: any): void {
    try {
      const key = config.key || 'logs'
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      const combined = [...existing, ...logs]
      
      // 检查大小限制
      const dataStr = JSON.stringify(combined)
      if (dataStr.length > (config.maxSize || 5 * 1024 * 1024)) {
        // 删除旧日志
        const trimmed = combined.slice(-Math.floor(combined.length / 2))
        localStorage.setItem(key, JSON.stringify(trimmed))
      } else {
        localStorage.setItem(key, dataStr)
      }
    } catch (error) {
      console.error('写入 localStorage 失败:', error)
    }
  }

  /**
   * 写入 IndexedDB
   */
  private async writeToIndexedDB(logs: LogEntry[], config: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(config.dbName, config.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction([config.storeName], 'readwrite')
        const store = transaction.objectStore(config.storeName)
        
        logs.forEach(log => {
          store.add(log)
        })
        
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
      
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(config.storeName)) {
          const store = db.createObjectStore(config.storeName, { keyPath: 'id' })
          store.createIndex('timestamp', 'timestamp')
          store.createIndex('level', 'level')
          store.createIndex('category', 'category')
        }
      }
    })
  }

  /**
   * 写入远程服务器
   */
  private async writeToRemote(logs: LogEntry[], config: any): Promise<void> {
    await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.headers || {})
      },
      body: JSON.stringify({
        logs,
        source: 'chatlog-web',
        timestamp: Date.now()
      })
    })
  }

  /**
   * 开始定时刷新
   */
  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flushLogs()
      this.cleanupOldLogs()
    }, this.flushInterval)
  }

  /**
   * 开始分析更新
   */
  private startAnalyticsUpdate(): void {
    setInterval(() => {
      this.analytics = this.generateAnalytics()
    }, this.analyticsUpdateInterval)
  }

  /**
   * 清理旧日志
   */
  private cleanupOldLogs(): void {
    const cutoff = Date.now() - this.retentionPeriod
    this.logs = this.logs.filter(log => log.timestamp > cutoff)
  }

  /**
   * 获取性能快照
   */
  private getPerformanceSnapshot(): Record<string, number> {
    const snapshot: Record<string, number> = {}
    
    if ('memory' in performance) {
      const memory = (performance as any).memory
      snapshot.usedJSHeapSize = memory.usedJSHeapSize
      snapshot.totalJSHeapSize = memory.totalJSHeapSize
      snapshot.jsHeapSizeLimit = memory.jsHeapSizeLimit
    }

    if (performance.timing) {
      snapshot.navigationStart = performance.timing.navigationStart
      snapshot.loadEventEnd = performance.timing.loadEventEnd
    }

    return snapshot
  }

  /**
   * 格式化控制台参数
   */
  private formatConsoleArgs(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'string') return arg
      if (typeof arg === 'object') return JSON.stringify(arg)
      return String(arg)
    }).join(' ')
  }

  /**
   * 获取控制台样式
   */
  private getConsoleStyle(level: LogEntry['level']): string {
    const styles = {
      trace: 'color: #8c8c8c',
      debug: 'color: #1890ff',
      info: 'color: #52c41a',
      warn: 'color: #faad14; font-weight: bold',
      error: 'color: #f5222d; font-weight: bold',
      fatal: 'color: #fff; background: #f5222d; font-weight: bold'
    }
    return styles[level] || ''
  }

  /**
   * 提取错误模式
   */
  private extractErrorPattern(message: string): string {
    // 移除动态部分，提取错误模式
    return message
      .replace(/\d+/g, '{number}')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '{uuid}')
      .replace(/https?:\/\/[^\s]+/g, '{url}')
      .replace(/\/[^\s]*\.(js|css|png|jpg|gif)/g, '{asset}')
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 生成日志ID
   */
  private generateLogId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): void {
    this.log('info', 'system', `User ID set: ${userId}`, 'LogAggregator', { userId })
  }

  /**
   * 设置关联ID
   */
  setCorrelationId(correlationId: string): void {
    this.log('info', 'system', `Correlation ID set: ${correlationId}`, 'LogAggregator', { correlationId })
  }

  /**
   * 获取当前分析结果
   */
  getAnalytics(): LogAnalytics | null {
    return this.analytics
  }

  /**
   * 导出日志
   */
  exportLogs(filter?: LogFilter, format: 'json' | 'csv' | 'txt' = 'json'): string {
    const logs = this.query(filter)
    
    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2)
      case 'csv':
        return this.logsToCSV(logs)
      case 'txt':
        return this.logsToText(logs)
      default:
        return JSON.stringify(logs, null, 2)
    }
  }

  /**
   * 转换为CSV格式
   */
  private logsToCSV(logs: LogEntry[]): string {
    const headers = ['timestamp', 'level', 'category', 'source', 'message', 'tags']
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.category,
      log.source,
      log.message,
      log.tags.join(';')
    ])
    
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }

  /**
   * 转换为文本格式
   */
  private logsToText(logs: LogEntry[]): string {
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString()
      const level = log.level.toUpperCase()
      return `[${timestamp}] ${level} [${log.category}/${log.source}] ${log.message}`
    }).join('\n')
  }

  /**
   * 销毁聚合器
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flushLogs() // 最后刷新一次
    this.logs = []
    this.destinations.clear()
    this.processors = []
  }
}

// 创建全局实例
export const logAggregator = new LogAggregator({
  batchSize: 50,
  flushInterval: 10000,
  maxLogs: 10000,
  retentionPeriod: 7 * 24 * 60 * 60 * 1000
})

// 导出便利函数
export const log = {
  trace: (category: string, message: string, source: string, metadata?: Record<string, any>) =>
    logAggregator.log('trace', category, message, source, metadata),
  
  debug: (category: string, message: string, source: string, metadata?: Record<string, any>) =>
    logAggregator.log('debug', category, message, source, metadata),
  
  info: (category: string, message: string, source: string, metadata?: Record<string, any>) =>
    logAggregator.log('info', category, message, source, metadata),
  
  warn: (category: string, message: string, source: string, metadata?: Record<string, any>) =>
    logAggregator.log('warn', category, message, source, metadata),
  
  error: (category: string, message: string, source: string, metadata?: Record<string, any>) =>
    logAggregator.log('error', category, message, source, metadata),
  
  fatal: (category: string, message: string, source: string, metadata?: Record<string, any>) =>
    logAggregator.log('fatal', category, message, source, metadata)
}

export const queryLogs = (filter?: LogFilter) => logAggregator.query(filter)
export const exportLogs = (filter?: LogFilter, format?: 'json' | 'csv' | 'txt') => 
  logAggregator.exportLogs(filter, format)
export const getLogAnalytics = () => logAggregator.getAnalytics()