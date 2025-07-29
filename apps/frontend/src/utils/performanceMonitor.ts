/**
 * 性能监控系统
 * 提供全面的性能指标收集、分析和报告功能
 */

export interface PerformanceMetrics {
  // 导航性能指标
  navigation: {
    domContentLoaded: number
    loadComplete: number
    firstPaint: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    firstInputDelay: number
    cumulativeLayoutShift: number
    timeToFirstByte: number
  }
  
  // 资源性能指标
  resources: {
    totalResources: number
    totalSize: number
    totalLoadTime: number
    images: ResourceTypeMetrics
    scripts: ResourceTypeMetrics
    stylesheets: ResourceTypeMetrics
    fonts: ResourceTypeMetrics
  }
  
  // 运行时性能指标
  runtime: {
    memoryUsage: MemoryInfo | null
    jsHeapSize: number
    domNodes: number
    eventListeners: number
    longTasks: number
    frameRate: number
  }
  
  // 用户体验指标
  userExperience: {
    clickDelay: number
    scrollResponsiveness: number
    animationFrameRate: number
    interactionToNextPaint: number
  }
  
  // 网络指标
  network: {
    connectionType: string
    effectiveType: string
    downlink: number
    rtt: number
    saveData: boolean
  }
  
  // 缓存性能
  cache: {
    hitRate: number
    missRate: number
    size: number
    operations: number
  }
}

export interface ResourceTypeMetrics {
  count: number
  totalSize: number
  averageLoadTime: number
  cached: number
  failed: number
}

/**
 * 性能监控管理器
 */
export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {}
  private observers: PerformanceObserver[] = []
  private intervals: number[] = []
  private startTime = performance.now()
  private reportCallback?: (metrics: PerformanceMetrics) => void
  private thresholds = {
    fcp: 2500,      // First Contentful Paint
    lcp: 4000,      // Largest Contentful Paint  
    fid: 100,       // First Input Delay
    cls: 0.1,       // Cumulative Layout Shift
    ttfb: 800,      // Time to First Byte
    memoryLimit: 100 * 1024 * 1024 // 100MB
  }

  constructor(reportCallback?: (metrics: PerformanceMetrics) => void) {
    this.reportCallback = reportCallback
    this.init()
  }

  /**
   * 初始化性能监控
   */
  private init(): void {
    this.setupNavigationObserver()
    this.setupResourceObserver()
    this.setupLongTaskObserver()
    this.setupUserTimingObserver()
    this.setupMemoryMonitoring()
    this.setupNetworkInformation()
    this.setupUserExperienceMonitoring()
    
    // 页面加载完成后收集初始指标
    if (document.readyState === 'complete') {
      this.collectInitialMetrics()
    } else {
      window.addEventListener('load', () => {
        setTimeout(() => this.collectInitialMetrics(), 0)
      })
    }
  }

  /**
   * 设置导航性能观察器
   */
  private setupNavigationObserver(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.processNavigationEntry(entry as PerformanceNavigationTiming)
          } else if (entry.entryType === 'paint') {
            this.processPaintEntry(entry as PerformancePaintTiming)
          }
        }
      })

      observer.observe({ entryTypes: ['navigation', 'paint'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('导航性能观察器设置失败:', error)
    }
  }

  /**
   * 设置资源性能观察器
   */
  private setupResourceObserver(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processResourceEntry(entry as PerformanceResourceTiming)
        }
      })

      observer.observe({ entryTypes: ['resource'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('资源性能观察器设置失败:', error)
    }
  }

  /**
   * 设置长任务观察器
   */
  private setupLongTaskObserver(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        const longTasks = list.getEntries().length
        if (!this.metrics.runtime) this.metrics.runtime = {} as any
        this.metrics.runtime.longTasks = (this.metrics.runtime.longTasks || 0) + longTasks
        
        // 长任务警告
        if (longTasks > 0) {
          console.warn(`检测到 ${longTasks} 个长任务，可能影响用户体验`)
        }
      })

      observer.observe({ entryTypes: ['longtask'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('长任务观察器设置失败:', error)
    }
  }

  /**
   * 设置用户时间观察器
   */
  private setupUserTimingObserver(): void {
    if (!('PerformanceObserver' in window)) return

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`用户时间标记: ${entry.name} - ${entry.duration}ms`)
        }
      })

      observer.observe({ entryTypes: ['measure'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('用户时间观察器设置失败:', error)
    }
  }

  /**
   * 设置内存监控
   */
  private setupMemoryMonitoring(): void {
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory as MemoryInfo
        
        if (!this.metrics.runtime) this.metrics.runtime = {} as any
        this.metrics.runtime.memoryUsage = memory
        this.metrics.runtime.jsHeapSize = memory.usedJSHeapSize
        
        // 内存使用警告
        if (memory.usedJSHeapSize > this.thresholds.memoryLimit) {
          console.warn('内存使用过高:', memory.usedJSHeapSize / 1024 / 1024, 'MB')
        }
      }
      
      // DOM 节点计数
      this.metrics.runtime = this.metrics.runtime || {} as any
      this.metrics.runtime.domNodes = document.querySelectorAll('*').length
    }

    // 立即执行一次
    monitorMemory()
    
    // 定期监控
    const intervalId = window.setInterval(monitorMemory, 10000) // 每10秒
    this.intervals.push(intervalId)
  }

  /**
   * 设置网络信息监控
   */
  private setupNetworkInformation(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      
      this.metrics.network = {
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      }

      // 监听网络变化
      connection.addEventListener('change', () => {
        this.metrics.network = {
          connectionType: connection.type || 'unknown',
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false
        }
      })
    }
  }

  /**
   * 设置用户体验监控
   */
  private setupUserExperienceMonitoring(): void {
    // 点击延迟监控
    let clickStartTime = 0
    document.addEventListener('pointerdown', () => {
      clickStartTime = performance.now()
    })
    
    document.addEventListener('click', () => {
      if (clickStartTime > 0) {
        const clickDelay = performance.now() - clickStartTime
        if (!this.metrics.userExperience) this.metrics.userExperience = {} as any
        this.metrics.userExperience.clickDelay = clickDelay
        clickStartTime = 0
      }
    })

    // 滚动响应性监控
    let scrollStartTime = 0
    let scrollRafId = 0
    
    document.addEventListener('scroll', () => {
      if (scrollStartTime === 0) {
        scrollStartTime = performance.now()
      }
      
      if (scrollRafId) {
        cancelAnimationFrame(scrollRafId)
      }
      
      scrollRafId = requestAnimationFrame(() => {
        const scrollDelay = performance.now() - scrollStartTime
        if (!this.metrics.userExperience) this.metrics.userExperience = {} as any
        this.metrics.userExperience.scrollResponsiveness = scrollDelay
        scrollStartTime = 0
      })
    })

    // 帧率监控
    this.monitorFrameRate()
  }

  /**
   * 监控帧率
   */
  private monitorFrameRate(): void {
    let frameCount = 0
    let lastTime = performance.now()
    
    const countFrames = () => {
      frameCount++
      const currentTime = performance.now()
      
      if (currentTime - lastTime >= 1000) {
        if (!this.metrics.runtime) this.metrics.runtime = {} as any
        this.metrics.runtime.frameRate = frameCount
        
        if (frameCount < 30) {
          console.warn('帧率较低:', frameCount, 'fps')
        }
        
        frameCount = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(countFrames)
    }
    
    requestAnimationFrame(countFrames)
  }

  /**
   * 处理导航性能条目
   */
  private processNavigationEntry(entry: PerformanceNavigationTiming): void {
    if (!this.metrics.navigation) this.metrics.navigation = {} as any
    
    this.metrics.navigation.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart
    this.metrics.navigation.loadComplete = entry.loadEventEnd - entry.loadEventStart
    this.metrics.navigation.timeToFirstByte = entry.responseStart - entry.requestStart

    // 检查性能阈值
    this.checkPerformanceThresholds()
  }

  /**
   * 处理绘制性能条目
   */
  private processPaintEntry(entry: PerformancePaintTiming): void {
    if (!this.metrics.navigation) this.metrics.navigation = {} as any
    
    if (entry.name === 'first-paint') {
      this.metrics.navigation.firstPaint = entry.startTime
    } else if (entry.name === 'first-contentful-paint') {
      this.metrics.navigation.firstContentfulPaint = entry.startTime
    }
  }

  /**
   * 处理资源性能条目
   */
  private processResourceEntry(entry: PerformanceResourceTiming): void {
    if (!this.metrics.resources) {
      this.metrics.resources = {
        totalResources: 0,
        totalSize: 0,
        totalLoadTime: 0,
        images: { count: 0, totalSize: 0, averageLoadTime: 0, cached: 0, failed: 0 },
        scripts: { count: 0, totalSize: 0, averageLoadTime: 0, cached: 0, failed: 0 },
        stylesheets: { count: 0, totalSize: 0, averageLoadTime: 0, cached: 0, failed: 0 },
        fonts: { count: 0, totalSize: 0, averageLoadTime: 0, cached: 0, failed: 0 }
      }
    }

    const loadTime = entry.responseEnd - entry.startTime
    const size = entry.transferSize || 0
    const cached = entry.transferSize === 0
    
    this.metrics.resources.totalResources++
    this.metrics.resources.totalSize += size
    this.metrics.resources.totalLoadTime += loadTime

    // 按资源类型分类
    const resourceType = this.getResourceType(entry.name)
    if (resourceType && this.metrics.resources[resourceType]) {
      const typeMetrics = this.metrics.resources[resourceType]
      typeMetrics.count++
      typeMetrics.totalSize += size
      typeMetrics.averageLoadTime = (typeMetrics.averageLoadTime * (typeMetrics.count - 1) + loadTime) / typeMetrics.count
      
      if (cached) {
        typeMetrics.cached++
      }
    }
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): keyof Pick<PerformanceMetrics['resources'], 'images' | 'scripts' | 'stylesheets' | 'fonts'> | null {
    if (/\.(png|jpg|jpeg|gif|svg|webp)(\?.*)?$/i.test(url)) {
      return 'images'
    } else if (/\.(js|mjs)(\?.*)?$/i.test(url)) {
      return 'scripts'
    } else if (/\.(css)(\?.*)?$/i.test(url)) {
      return 'stylesheets'
    } else if (/\.(woff|woff2|eot|ttf|otf)(\?.*)?$/i.test(url)) {
      return 'fonts'
    }
    return null
  }

  /**
   * 收集初始指标
   */
  private collectInitialMetrics(): void {
    // 收集 Core Web Vitals
    this.collectCoreWebVitals()
    
    // 生成性能报告
    setTimeout(() => {
      this.generateReport()
    }, 2000)
  }

  /**
   * 收集 Core Web Vitals
   */
  private collectCoreWebVitals(): void {
    // LCP - Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          
          if (!this.metrics.navigation) this.metrics.navigation = {} as any
          this.metrics.navigation.largestContentfulPaint = lastEntry.startTime
        })
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(observer)
      } catch (error) {
        console.warn('LCP 观察器设置失败:', error)
      }
    }

    // FID - First Input Delay
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!this.metrics.navigation) this.metrics.navigation = {} as any
            this.metrics.navigation.firstInputDelay = (entry as any).processingStart - entry.startTime
          }
        })
        
        observer.observe({ entryTypes: ['first-input'] })
        this.observers.push(observer)
      } catch (error) {
        console.warn('FID 观察器设置失败:', error)
      }
    }

    // CLS - Cumulative Layout Shift
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          
          if (!this.metrics.navigation) this.metrics.navigation = {} as any
          this.metrics.navigation.cumulativeLayoutShift = clsValue
        })
        
        observer.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(observer)
      } catch (error) {
        console.warn('CLS 观察器设置失败:', error)
      }
    }
  }

  /**
   * 检查性能阈值
   */
  private checkPerformanceThresholds(): void {
    if (!this.metrics.navigation) return

    const warnings: string[] = []

    if (this.metrics.navigation.firstContentfulPaint > this.thresholds.fcp) {
      warnings.push(`FCP 过慢: ${this.metrics.navigation.firstContentfulPaint}ms`)
    }

    if (this.metrics.navigation.largestContentfulPaint > this.thresholds.lcp) {
      warnings.push(`LCP 过慢: ${this.metrics.navigation.largestContentfulPaint}ms`)
    }

    if (this.metrics.navigation.firstInputDelay > this.thresholds.fid) {
      warnings.push(`FID 过慢: ${this.metrics.navigation.firstInputDelay}ms`)
    }

    if (this.metrics.navigation.cumulativeLayoutShift > this.thresholds.cls) {
      warnings.push(`CLS 过高: ${this.metrics.navigation.cumulativeLayoutShift}`)
    }

    if (this.metrics.navigation.timeToFirstByte > this.thresholds.ttfb) {
      warnings.push(`TTFB 过慢: ${this.metrics.navigation.timeToFirstByte}ms`)
    }

    if (warnings.length > 0) {
      console.warn('性能警告:', warnings)
    }
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceMetrics {
    const report = this.metrics as PerformanceMetrics
    
    console.group('🚀 性能监控报告')
    console.log('导航指标:', report.navigation)
    console.log('资源指标:', report.resources)
    console.log('运行时指标:', report.runtime)
    console.log('用户体验指标:', report.userExperience)
    console.log('网络指标:', report.network)
    console.groupEnd()

    if (this.reportCallback) {
      this.reportCallback(report)
    }

    return report
  }

  /**
   * 添加自定义指标
   */
  addCustomMetric(name: string, value: number): void {
    performance.mark(`custom-${name}`)
    console.log(`自定义指标 ${name}: ${value}`)
  }

  /**
   * 测量代码块执行时间
   */
  measure<T>(name: string, fn: () => T): T {
    const startMark = `${name}-start`
    const endMark = `${name}-end`
    const measureName = `${name}-measure`

    performance.mark(startMark)
    const result = fn()
    performance.mark(endMark)
    performance.measure(measureName, startMark, endMark)

    return result
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.intervals.forEach(id => clearInterval(id))
    this.observers = []
    this.intervals = []
  }
}

// 创建全局实例
export const performanceMonitor = new PerformanceMonitor()

// 导出便利函数
export const measurePerformance = (name: string, fn: () => any) => {
  return performanceMonitor.measure(name, fn)
}

export const addMetric = (name: string, value: number) => {
  performanceMonitor.addCustomMetric(name, value)
}