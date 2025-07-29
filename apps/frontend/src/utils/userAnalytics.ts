/**
 * 用户行为分析系统
 * 收集、分析和报告用户交互行为数据
 */

export interface UserEvent {
  id: string
  timestamp: number
  type: 'click' | 'view' | 'navigation' | 'search' | 'action' | 'performance' | 'error'
  category: string
  action: string
  label?: string
  value?: number
  userId?: string
  sessionId: string
  page: {
    url: string
    title: string
    referrer: string
  }
  user: {
    userAgent: string
    language: string
    timezone: string
    screen: {
      width: number
      height: number
      colorDepth: number
    }
  }
  device: {
    type: 'desktop' | 'tablet' | 'mobile'
    os: string
    browser: string
  }
  context: Record<string, any>
  custom: Record<string, any>
}

export interface UserSession {
  sessionId: string
  userId?: string
  startTime: number
  endTime?: number
  events: UserEvent[]
  pages: string[]
  duration: number
  bounced: boolean
  converted: boolean
  device: UserEvent['device']
  location?: {
    country?: string
    city?: string
    ip?: string
  }
}

export interface AnalyticsMetrics {
  // 页面分析
  pageViews: Record<string, number>
  uniquePageViews: Record<string, number>
  averageTimeOnPage: Record<string, number>
  bounceRate: Record<string, number>
  exitRate: Record<string, number>
  
  // 用户分析
  totalUsers: number
  newUsers: number
  returningUsers: number
  userRetention: number[]
  sessionDuration: number
  pagesPerSession: number
  
  // 行为分析
  topEvents: Array<{ event: string; count: number }>
  conversionRate: number
  goalCompletions: Record<string, number>
  funnelAnalysis: Array<{ step: string; users: number; dropoff: number }>
  
  // 技术分析
  deviceTypes: Record<string, number>
  browsers: Record<string, number>
  operatingSystems: Record<string, number>
  screenResolutions: Record<string, number>
  
  // 性能分析
  loadTimes: {
    average: number
    p50: number
    p95: number
    p99: number
  }
  errorRate: number
  crashRate: number
}

/**
 * 用户行为分析器
 */
export class UserAnalytics {
  private events: UserEvent[] = []
  private sessions = new Map<string, UserSession>()
  private currentSession: UserSession
  private goals = new Map<string, (event: UserEvent) => boolean>()
  private funnels = new Map<string, string[]>()
  private reportEndpoint = '/api/analytics'
  private reportCallback?: (event: UserEvent) => void
  private batchSize = 20
  private flushInterval = 30000 // 30秒
  private flushTimer?: number
  private isTracking = true

  constructor(options: {
    reportEndpoint?: string
    reportCallback?: (event: UserEvent) => void
    batchSize?: number
    flushInterval?: number
  } = {}) {
    Object.assign(this, options)
    this.currentSession = this.createSession()
    this.init()
  }

  /**
   * 初始化分析器
   */
  private init(): void {
    this.setupPageTracking()
    this.setupUserInteractionTracking()
    this.setupPerformanceTracking()
    this.setupVisibilityTracking()
    this.startFlushTimer()
    
    // 记录初始页面浏览
    this.trackPageView()
  }

  /**
   * 设置页面追踪
   */
  private setupPageTracking(): void {
    // 监听路由变化（SPA）
    window.addEventListener('popstate', () => {
      this.trackPageView()
    })

    // 监听 pushState 和 replaceState
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function(...args) {
      originalPushState.apply(history, args)
      setTimeout(() => userAnalytics.trackPageView(), 0)
    }

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args)
      setTimeout(() => userAnalytics.trackPageView(), 0)
    }
  }

  /**
   * 设置用户交互追踪
   */
  private setupUserInteractionTracking(): void {
    // 点击事件
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const tagName = target.tagName?.toLowerCase()
      const text = target.textContent?.trim().substring(0, 50)
      const id = target.id
      const className = target.className

      this.track('click', 'interaction', 'click', {
        element: tagName,
        text,
        id,
        className,
        x: event.clientX,
        y: event.clientY
      })

      // 特殊元素追踪
      if (tagName === 'a') {
        const href = (target as HTMLAnchorElement).href
        this.track('click', 'link', 'click', { href, text })
      } else if (tagName === 'button') {
        this.track('click', 'button', 'click', { text, id, className })
      }
    })

    // 表单提交
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement
      this.track('action', 'form', 'submit', {
        action: form.action,
        method: form.method,
        id: form.id,
        className: form.className
      })
    })

    // 输入事件
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement
      if (target.tagName?.toLowerCase() === 'input') {
        this.track('action', 'input', 'change', {
          type: target.type,
          name: target.name,
          id: target.id,
          valueLength: target.value.length
        })
      }
    })

    // 滚动事件
    let scrollTimeout: number
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = window.setTimeout(() => {
        const scrollPercent = Math.round(
          (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
        )
        
        this.track('action', 'scroll', 'scroll', {
          scrollY: window.scrollY,
          scrollPercent: Math.min(scrollPercent, 100)
        })
      }, 250)
    })
  }

  /**
   * 设置性能追踪
   */
  private setupPerformanceTracking(): void {
    // 页面加载性能
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          this.track('performance', 'timing', 'page_load', {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstByte: navigation.responseStart - navigation.requestStart,
            domInteractive: navigation.domInteractive - navigation.navigationStart
          })
        }
      }, 0)
    })

    // Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // FCP - First Contentful Paint
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.track('performance', 'vitals', 'fcp', {
                value: entry.startTime
              })
            }
          }
        })
        observer.observe({ entryTypes: ['paint'] })

        // LCP - Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          this.track('performance', 'vitals', 'lcp', {
            value: lastEntry.startTime
          })
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // CLS - Cumulative Layout Shift
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          this.track('performance', 'vitals', 'cls', {
            value: clsValue
          })
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
      } catch (error) {
        console.warn('Performance Observer 设置失败:', error)
      }
    }
  }

  /**
   * 设置可见性追踪
   */
  private setupVisibilityTracking(): void {
    let startTime = Date.now()
    let isVisible = !document.hidden

    const updateVisibility = () => {
      const now = Date.now()
      const timeSpent = now - startTime

      if (isVisible && document.hidden) {
        // 页面变为隐藏
        this.track('view', 'visibility', 'hidden', {
          timeOnPage: timeSpent
        })
        isVisible = false
      } else if (!isVisible && !document.hidden) {
        // 页面变为可见
        this.track('view', 'visibility', 'visible')
        isVisible = true
      }

      startTime = now
    }

    document.addEventListener('visibilitychange', updateVisibility)
    window.addEventListener('beforeunload', () => {
      if (isVisible) {
        const timeSpent = Date.now() - startTime
        this.track('view', 'session', 'end', {
          sessionDuration: timeSpent,
          totalEvents: this.events.length
        })
      }
    })
  }

  /**
   * 追踪事件
   */
  track(
    type: UserEvent['type'],
    category: string,
    action: string,
    context?: Record<string, any>,
    value?: number
  ): void {
    if (!this.isTracking) return

    const event: UserEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      type,
      category,
      action,
      value,
      sessionId: this.currentSession.sessionId,
      page: {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer
      },
      user: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth
        }
      },
      device: this.getDeviceInfo(),
      context: context || {},
      custom: {}
    }

    // 添加到事件列表
    this.events.push(event)
    this.currentSession.events.push(event)

    // 更新会话信息
    this.updateSession(event)

    // 检查目标完成
    this.checkGoalCompletion(event)

    // 批量发送
    if (this.events.length >= this.batchSize) {
      this.flush()
    }

    // 回调通知
    if (this.reportCallback) {
      this.reportCallback(event)
    }
  }

  /**
   * 追踪页面浏览
   */
  trackPageView(customData?: Record<string, any>): void {
    this.track('view', 'page', 'view', {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      ...customData
    })

    // 更新当前会话的页面列表
    const currentUrl = window.location.href
    if (!this.currentSession.pages.includes(currentUrl)) {
      this.currentSession.pages.push(currentUrl)
    }
  }

  /**
   * 追踪搜索
   */
  trackSearch(query: string, results?: number, category?: string): void {
    this.track('search', category || 'site', 'search', {
      query: query.substring(0, 100), // 限制长度
      results,
      queryLength: query.length
    })
  }

  /**
   * 追踪转化
   */
  trackConversion(goal: string, value?: number, context?: Record<string, any>): void {
    this.track('action', 'conversion', goal, context, value)
    this.currentSession.converted = true
  }

  /**
   * 追踪错误
   */
  trackError(error: string, category?: string, context?: Record<string, any>): void {
    this.track('error', category || 'javascript', 'error', {
      error: error.substring(0, 200),
      url: window.location.href,
      ...context
    })
  }

  /**
   * 创建会话
   */
  private createSession(): UserSession {
    const sessionId = this.generateSessionId()
    const session: UserSession = {
      sessionId,
      startTime: Date.now(),
      events: [],
      pages: [],
      duration: 0,
      bounced: false,
      converted: false,
      device: this.getDeviceInfo()
    }

    this.sessions.set(sessionId, session)
    return session
  }

  /**
   * 更新会话
   */
  private updateSession(event: UserEvent): void {
    this.currentSession.endTime = event.timestamp
    this.currentSession.duration = event.timestamp - this.currentSession.startTime

    // 判断是否为跳出
    if (this.currentSession.events.length === 1 && this.currentSession.pages.length === 1) {
      this.currentSession.bounced = true
    } else {
      this.currentSession.bounced = false
    }
  }

  /**
   * 获取设备信息
   */
  private getDeviceInfo(): UserEvent['device'] {
    const userAgent = navigator.userAgent.toLowerCase()
    
    let deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop'
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(userAgent)) {
      deviceType = 'mobile'
    } else if (/tablet|ipad|android/i.test(userAgent)) {
      deviceType = 'tablet'
    }

    let os = 'unknown'
    if (userAgent.includes('windows')) os = 'Windows'
    else if (userAgent.includes('mac')) os = 'macOS'
    else if (userAgent.includes('linux')) os = 'Linux'
    else if (userAgent.includes('android')) os = 'Android'
    else if (userAgent.includes('ios')) os = 'iOS'

    let browser = 'unknown'
    if (userAgent.includes('chrome')) browser = 'Chrome'
    else if (userAgent.includes('firefox')) browser = 'Firefox'
    else if (userAgent.includes('safari')) browser = 'Safari'
    else if (userAgent.includes('edge')) browser = 'Edge'

    return { type: deviceType, os, browser }
  }

  /**
   * 检查目标完成
   */
  private checkGoalCompletion(event: UserEvent): void {
    for (const [goalName, goalCheck] of this.goals) {
      if (goalCheck(event)) {
        this.trackConversion(goalName, undefined, { triggerEvent: event.action })
      }
    }
  }

  /**
   * 定义目标
   */
  defineGoal(name: string, condition: (event: UserEvent) => boolean): void {
    this.goals.set(name, condition)
  }

  /**
   * 定义漏斗
   */
  defineFunnel(name: string, steps: string[]): void {
    this.funnels.set(name, steps)
  }

  /**
   * 分析漏斗
   */
  analyzeFunnel(name: string): Array<{ step: string; users: number; dropoff: number }> {
    const steps = this.funnels.get(name)
    if (!steps) return []

    const sessions = Array.from(this.sessions.values())
    const result: Array<{ step: string; users: number; dropoff: number }> = []

    let previousUsers = sessions.length

    steps.forEach((step, index) => {
      const usersAtStep = sessions.filter(session =>
        session.events.some(event => event.action === step)
      ).length

      const dropoff = index === 0 ? 0 : ((previousUsers - usersAtStep) / previousUsers) * 100

      result.push({
        step,
        users: usersAtStep,
        dropoff
      })

      previousUsers = usersAtStep
    })

    return result
  }

  /**
   * 获取分析指标
   */
  getMetrics(timeRange?: { start: number; end: number }): AnalyticsMetrics {
    let events = this.events
    let sessions = Array.from(this.sessions.values())

    if (timeRange) {
      events = events.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end)
      sessions = sessions.filter(s => s.startTime >= timeRange.start && s.startTime <= timeRange.end)
    }

    const pageViews = this.groupBy(events.filter(e => e.type === 'view'), 'page.url')
    const deviceTypes = this.groupBy(events, 'device.type')
    const browsers = this.groupBy(events, 'device.browser')
    const operatingSystems = this.groupBy(events, 'device.os')

    return {
      pageViews,
      uniquePageViews: this.getUniquePageViews(events),
      averageTimeOnPage: this.getAverageTimeOnPage(sessions),
      bounceRate: this.getBounceRate(sessions),
      exitRate: this.getExitRate(sessions),
      totalUsers: new Set(events.map(e => e.sessionId)).size,
      newUsers: sessions.filter(s => s.events.length === 1).length,
      returningUsers: sessions.filter(s => s.events.length > 1).length,
      userRetention: this.getUserRetention(sessions),
      sessionDuration: this.getAverageSessionDuration(sessions),
      pagesPerSession: this.getAveragePagesPerSession(sessions),
      topEvents: this.getTopEvents(events),
      conversionRate: this.getConversionRate(sessions),
      goalCompletions: this.getGoalCompletions(events),
      funnelAnalysis: [],
      deviceTypes,
      browsers,
      operatingSystems,
      screenResolutions: this.getScreenResolutions(events),
      loadTimes: this.getLoadTimes(events),
      errorRate: this.getErrorRate(events),
      crashRate: 0
    }
  }

  /**
   * 按字段分组统计
   */
  private groupBy(items: any[], field: string): Record<string, number> {
    return items.reduce((groups, item) => {
      const keys = field.split('.')
      let value = item
      for (const key of keys) {
        value = value?.[key]
      }
      const key = value || 'unknown'
      groups[key] = (groups[key] || 0) + 1
      return groups
    }, {})
  }

  /**
   * 获取唯一页面浏览量
   */
  private getUniquePageViews(events: UserEvent[]): Record<string, number> {
    const uniqueViews = new Map<string, Set<string>>()
    
    events.filter(e => e.type === 'view').forEach(event => {
      const url = event.page.url
      if (!uniqueViews.has(url)) {
        uniqueViews.set(url, new Set())
      }
      uniqueViews.get(url)!.add(event.sessionId)
    })

    const result: Record<string, number> = {}
    for (const [url, sessions] of uniqueViews) {
      result[url] = sessions.size
    }
    return result
  }

  /**
   * 获取平均页面停留时间
   */
  private getAverageTimeOnPage(sessions: UserSession[]): Record<string, number> {
    const pageTimes = new Map<string, number[]>()
    
    sessions.forEach(session => {
      session.pages.forEach((page, index) => {
        if (index < session.pages.length - 1) {
          const timeOnPage = session.duration / session.pages.length
          if (!pageTimes.has(page)) {
            pageTimes.set(page, [])
          }
          pageTimes.get(page)!.push(timeOnPage)
        }
      })
    })

    const result: Record<string, number> = {}
    for (const [page, times] of pageTimes) {
      result[page] = times.reduce((sum, time) => sum + time, 0) / times.length
    }
    return result
  }

  /**
   * 获取跳出率
   */
  private getBounceRate(sessions: UserSession[]): Record<string, number> {
    const pageStats = new Map<string, { total: number; bounced: number }>()
    
    sessions.forEach(session => {
      const firstPage = session.pages[0]
      if (firstPage) {
        if (!pageStats.has(firstPage)) {
          pageStats.set(firstPage, { total: 0, bounced: 0 })
        }
        const stats = pageStats.get(firstPage)!
        stats.total++
        if (session.bounced) {
          stats.bounced++
        }
      }
    })

    const result: Record<string, number> = {}
    for (const [page, stats] of pageStats) {
      result[page] = (stats.bounced / stats.total) * 100
    }
    return result
  }

  /**
   * 获取退出率
   */
  private getExitRate(sessions: UserSession[]): Record<string, number> {
    const pageStats = new Map<string, { total: number; exits: number }>()
    
    sessions.forEach(session => {
      const lastPage = session.pages[session.pages.length - 1]
      if (lastPage) {
        session.pages.forEach(page => {
          if (!pageStats.has(page)) {
            pageStats.set(page, { total: 0, exits: 0 })
          }
          pageStats.get(page)!.total++
        })
        
        if (pageStats.has(lastPage)) {
          pageStats.get(lastPage)!.exits++
        }
      }
    })

    const result: Record<string, number> = {}
    for (const [page, stats] of pageStats) {
      result[page] = (stats.exits / stats.total) * 100
    }
    return result
  }

  /**
   * 获取用户留存率
   */
  private getUserRetention(sessions: UserSession[]): number[] {
    // 简化实现：返回模拟数据
    return [100, 85, 70, 60, 55, 50, 45]
  }

  /**
   * 获取平均会话时长
   */
  private getAverageSessionDuration(sessions: UserSession[]): number {
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0)
    return sessions.length > 0 ? totalDuration / sessions.length : 0
  }

  /**
   * 获取平均页面数/会话
   */
  private getAveragePagesPerSession(sessions: UserSession[]): number {
    const totalPages = sessions.reduce((sum, session) => sum + session.pages.length, 0)
    return sessions.length > 0 ? totalPages / sessions.length : 0
  }

  /**
   * 获取热门事件
   */
  private getTopEvents(events: UserEvent[]): Array<{ event: string; count: number }> {
    const eventCounts = new Map<string, number>()
    
    events.forEach(event => {
      const key = `${event.category}:${event.action}`
      eventCounts.set(key, (eventCounts.get(key) || 0) + 1)
    })

    return Array.from(eventCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  /**
   * 获取转化率
   */
  private getConversionRate(sessions: UserSession[]): number {
    const convertedSessions = sessions.filter(s => s.converted).length
    return sessions.length > 0 ? (convertedSessions / sessions.length) * 100 : 0
  }

  /**
   * 获取目标完成情况
   */
  private getGoalCompletions(events: UserEvent[]): Record<string, number> {
    const conversions = events.filter(e => e.category === 'conversion')
    return this.groupBy(conversions, 'action')
  }

  /**
   * 获取屏幕分辨率分布
   */
  private getScreenResolutions(events: UserEvent[]): Record<string, number> {
    const resolutions = events.map(e => `${e.user.screen.width}x${e.user.screen.height}`)
    return resolutions.reduce((groups, resolution) => {
      groups[resolution] = (groups[resolution] || 0) + 1
      return groups
    }, {} as Record<string, number>)
  }

  /**
   * 获取加载时间统计
   */
  private getLoadTimes(events: UserEvent[]): AnalyticsMetrics['loadTimes'] {
    const loadEvents = events.filter(e => e.category === 'timing' && e.action === 'page_load')
    const loadTimes = loadEvents.map(e => e.context.loadComplete || 0).filter(t => t > 0)
    
    if (loadTimes.length === 0) {
      return { average: 0, p50: 0, p95: 0, p99: 0 }
    }

    loadTimes.sort((a, b) => a - b)
    
    return {
      average: loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length,
      p50: loadTimes[Math.floor(loadTimes.length * 0.5)],
      p95: loadTimes[Math.floor(loadTimes.length * 0.95)],
      p99: loadTimes[Math.floor(loadTimes.length * 0.99)]
    }
  }

  /**
   * 获取错误率
   */
  private getErrorRate(events: UserEvent[]): number {
    const errorEvents = events.filter(e => e.type === 'error').length
    return events.length > 0 ? (errorEvents / events.length) * 100 : 0
  }

  /**
   * 开始定时刷新
   */
  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  /**
   * 刷新事件到服务器
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      if (this.reportEndpoint) {
        await fetch(this.reportEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            events: eventsToSend,
            session: {
              sessionId: this.currentSession.sessionId,
              startTime: this.currentSession.startTime,
              duration: this.currentSession.duration
            }
          })
        })
      }
    } catch (error) {
      console.error('分析数据发送失败:', error)
      // 重新加入队列
      this.events.unshift(...eventsToSend)
    }
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): void {
    this.currentSession.userId = userId
  }

  /**
   * 启用/禁用追踪
   */
  setTracking(enabled: boolean): void {
    this.isTracking = enabled
  }

  /**
   * 清除所有数据
   */
  clearData(): void {
    this.events = []
    this.sessions.clear()
    this.currentSession = this.createSession()
  }

  /**
   * 销毁分析器
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush()
    this.clearData()
  }
}

// 创建全局实例
export const userAnalytics = new UserAnalytics({
  reportCallback: (event) => {
    console.log(`📊 用户行为追踪: ${event.category}:${event.action}`, event)
  }
})

// 自动初始化常见目标
userAnalytics.defineGoal('contact_view', (event) => 
  event.category === 'page' && event.action === 'view' && event.page.url.includes('/contacts')
)

userAnalytics.defineGoal('search_performed', (event) => 
  event.category === 'site' && event.action === 'search'
)

// 导出便利函数
export const trackEvent = (category: string, action: string, context?: Record<string, any>) => {
  userAnalytics.track('action', category, action, context)
}

export const trackPageView = (customData?: Record<string, any>) => {
  userAnalytics.trackPageView(customData)
}

export const trackConversion = (goal: string, value?: number) => {
  userAnalytics.trackConversion(goal, value)
}