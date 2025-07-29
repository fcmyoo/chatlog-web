/**
 * 告警和通知系统
 * 提供智能的性能监控告警、错误通知和系统状态提醒
 */

export interface AlertRule {
  id: string
  name: string
  description: string
  enabled: boolean
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'performance' | 'error' | 'security' | 'system' | 'user'
  condition: {
    metric: string
    operator: '>' | '<' | '>=' | '<=' | '==' | '!='
    threshold: number
    duration?: number // 持续时间（毫秒）
  }
  actions: AlertAction[]
  cooldown: number // 冷却时间（毫秒）
  lastTriggered?: number
  triggerCount: number
  suppressUntil?: number
}

export interface AlertAction {
  type: 'notification' | 'email' | 'webhook' | 'sms' | 'auto-fix'
  config: Record<string, any>
  enabled: boolean
}

export interface Alert {
  id: string
  ruleId: string
  title: string
  message: string
  level: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: string
  timestamp: number
  value: number
  threshold: number
  status: 'active' | 'resolved' | 'suppressed'
  resolvedAt?: number
  suppressedUntil?: number
  context: Record<string, any>
  tags: string[]
  acknowledgedBy?: string
  acknowledgedAt?: number
}

export interface NotificationChannel {
  id: string
  name: string
  type: 'browser' | 'email' | 'webhook' | 'slack' | 'teams' | 'sms'
  config: Record<string, any>
  enabled: boolean
  filters?: {
    categories?: string[]
    priorities?: string[]
    keywords?: string[]
  }
}

/**
 * 告警管理器
 */
export class AlertManager {
  private rules = new Map<string, AlertRule>()
  private alerts = new Map<string, Alert>()
  private channels = new Map<string, NotificationChannel>()
  private evaluationInterval = 30000 // 30秒
  private evaluationTimer?: number
  private maxAlerts = 1000
  private retentionPeriod = 7 * 24 * 60 * 60 * 1000 // 7天

  constructor() {
    this.initializeDefaultRules()
    this.initializeDefaultChannels()
    this.startEvaluation()
  }

  /**
   * 初始化默认告警规则
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-response-time',
        name: 'API响应时间过高',
        description: 'API平均响应时间超过阈值',
        enabled: true,
        priority: 'high',
        category: 'performance',
        condition: {
          metric: 'api.response_time_avg',
          operator: '>',
          threshold: 1000,
          duration: 60000
        },
        actions: [
          {
            type: 'notification',
            config: { title: 'API响应慢', urgent: true },
            enabled: true
          }
        ],
        cooldown: 300000, // 5分钟
        triggerCount: 0
      },
      {
        id: 'high-error-rate',
        name: '错误率过高',
        description: '系统错误率超过安全阈值',
        enabled: true,
        priority: 'critical',
        category: 'error',
        condition: {
          metric: 'errors.rate',
          operator: '>',
          threshold: 5,
          duration: 120000
        },
        actions: [
          {
            type: 'notification',
            config: { title: '系统错误率告警', urgent: true },
            enabled: true
          },
          {
            type: 'webhook',
            config: { url: '/api/alerts/critical' },
            enabled: true
          }
        ],
        cooldown: 600000, // 10分钟
        triggerCount: 0
      },
      {
        id: 'memory-usage-high',
        name: '内存使用率过高',
        description: 'JavaScript堆内存使用率超过阈值',
        enabled: true,
        priority: 'high',
        category: 'performance',
        condition: {
          metric: 'memory.usage_percent',
          operator: '>',
          threshold: 85,
          duration: 180000
        },
        actions: [
          {
            type: 'notification',
            config: { title: '内存使用警告' },
            enabled: true
          },
          {
            type: 'auto-fix',
            config: { action: 'clear_cache' },
            enabled: true
          }
        ],
        cooldown: 900000, // 15分钟
        triggerCount: 0
      },
      {
        id: 'core-web-vitals-poor',
        name: 'Core Web Vitals 表现差',
        description: 'LCP超过4秒或FID超过100ms',
        enabled: true,
        priority: 'medium',
        category: 'performance',
        condition: {
          metric: 'vitals.lcp',
          operator: '>',
          threshold: 4000
        },
        actions: [
          {
            type: 'notification',
            config: { title: '用户体验告警' },
            enabled: true
          }
        ],
        cooldown: 1800000, // 30分钟
        triggerCount: 0
      },
      {
        id: 'security-violation',
        name: '安全违规检测',
        description: '检测到潜在的安全威胁',
        enabled: true,
        priority: 'critical',
        category: 'security',
        condition: {
          metric: 'security.violations',
          operator: '>',
          threshold: 0
        },
        actions: [
          {
            type: 'notification',
            config: { title: '安全威胁告警', urgent: true },
            enabled: true
          },
          {
            type: 'webhook',
            config: { url: '/api/security/alert' },
            enabled: true
          }
        ],
        cooldown: 0, // 立即告警
        triggerCount: 0
      }
    ]

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule)
    })
  }

  /**
   * 初始化默认通知渠道
   */
  private initializeDefaultChannels(): void {
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'browser-notifications',
        name: '浏览器通知',
        type: 'browser',
        enabled: true,
        config: {
          icon: '/images/icons/icon-192x192.png',
          badge: '/images/icons/badge-72x72.png'
        }
      },
      {
        id: 'console-log',
        name: '控制台日志',
        type: 'webhook',
        enabled: true,
        config: {
          url: 'console',
          method: 'log'
        }
      }
    ]

    defaultChannels.forEach(channel => {
      this.channels.set(channel.id, channel)
    })
  }

  /**
   * 开始告警评估
   */
  private startEvaluation(): void {
    this.evaluationTimer = window.setInterval(() => {
      this.evaluateRules()
      this.cleanupOldAlerts()
    }, this.evaluationInterval)
  }

  /**
   * 停止告警评估
   */
  private stopEvaluation(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer)
      this.evaluationTimer = undefined
    }
  }

  /**
   * 评估所有告警规则
   */
  private async evaluateRules(): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue

      try {
        await this.evaluateRule(rule)
      } catch (error) {
        console.error(`评估告警规则失败: ${rule.name}`, error)
      }
    }
  }

  /**
   * 评估单个告警规则
   */
  private async evaluateRule(rule: AlertRule): Promise<void> {
    // 检查冷却时间
    if (this.isInCooldown(rule)) {
      return
    }

    // 获取指标值
    const value = await this.getMetricValue(rule.condition.metric)
    if (value === null) return

    // 检查条件
    const conditionMet = this.checkCondition(value, rule.condition)

    if (conditionMet) {
      // 检查持续时间
      if (rule.condition.duration) {
        const sustained = await this.checkSustainedCondition(rule, value)
        if (!sustained) return
      }

      // 触发告警
      await this.triggerAlert(rule, value)
    }
  }

  /**
   * 检查是否在冷却时间内
   */
  private isInCooldown(rule: AlertRule): boolean {
    if (!rule.lastTriggered || rule.cooldown === 0) return false
    return Date.now() - rule.lastTriggered < rule.cooldown
  }

  /**
   * 获取指标值
   */
  private async getMetricValue(metric: string): Promise<number | null> {
    try {
      // 这里需要根据实际的指标系统实现
      switch (metric) {
        case 'api.response_time_avg':
          return this.getAverageResponseTime()
        case 'errors.rate':
          return this.getErrorRate()
        case 'memory.usage_percent':
          return this.getMemoryUsagePercent()
        case 'vitals.lcp':
          return this.getLCP()
        case 'vitals.fid':
          return this.getFID()
        case 'security.violations':
          return this.getSecurityViolations()
        default:
          console.warn(`未知指标: ${metric}`)
          return null
      }
    } catch (error) {
      console.error(`获取指标值失败: ${metric}`, error)
      return null
    }
  }

  /**
   * 检查条件是否满足
   */
  private checkCondition(value: number, condition: AlertRule['condition']): boolean {
    switch (condition.operator) {
      case '>':
        return value > condition.threshold
      case '<':
        return value < condition.threshold
      case '>=':
        return value >= condition.threshold
      case '<=':
        return value <= condition.threshold
      case '==':
        return value === condition.threshold
      case '!=':
        return value !== condition.threshold
      default:
        return false
    }
  }

  /**
   * 检查持续时间条件
   */
  private async checkSustainedCondition(rule: AlertRule, currentValue: number): Promise<boolean> {
    if (!rule.condition.duration) return true

    // 简化实现：检查最近的几个测量值
    // 实际应用中应该维护一个时间序列数据
    const measurements = 5
    let sustainedCount = 0

    for (let i = 0; i < measurements; i++) {
      const value = await this.getMetricValue(rule.condition.metric)
      if (value !== null && this.checkCondition(value, rule.condition)) {
        sustainedCount++
      }
    }

    return sustainedCount >= measurements * 0.8 // 80%的测量值满足条件
  }

  /**
   * 触发告警
   */
  private async triggerAlert(rule: AlertRule, value: number): Promise<void> {
    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      title: rule.name,
      message: `${rule.description} (当前值: ${value}, 阈值: ${rule.condition.threshold})`,
      level: rule.priority,
      category: rule.category,
      timestamp: Date.now(),
      value,
      threshold: rule.condition.threshold,
      status: 'active',
      context: {
        metric: rule.condition.metric,
        operator: rule.condition.operator,
        rule: rule.name
      },
      tags: [rule.category, rule.priority]
    }

    // 存储告警
    this.alerts.set(alert.id, alert)

    // 更新规则统计
    rule.lastTriggered = Date.now()
    rule.triggerCount++

    // 执行告警动作
    await this.executeAlertActions(rule, alert)

    console.log(`🚨 告警触发: ${alert.title}`, alert)
  }

  /**
   * 执行告警动作
   */
  private async executeAlertActions(rule: AlertRule, alert: Alert): Promise<void> {
    for (const action of rule.actions) {
      if (!action.enabled) continue

      try {
        await this.executeAction(action, alert)
      } catch (error) {
        console.error(`执行告警动作失败: ${action.type}`, error)
      }
    }
  }

  /**
   * 执行单个动作
   */
  private async executeAction(action: AlertAction, alert: Alert): Promise<void> {
    switch (action.type) {
      case 'notification':
        await this.sendBrowserNotification(alert, action.config)
        break
      case 'email':
        await this.sendEmail(alert, action.config)
        break
      case 'webhook':
        await this.sendWebhook(alert, action.config)
        break
      case 'sms':
        await this.sendSMS(alert, action.config)
        break
      case 'auto-fix':
        await this.executeAutoFix(alert, action.config)
        break
      default:
        console.warn(`未知动作类型: ${action.type}`)
    }
  }

  /**
   * 发送浏览器通知
   */
  private async sendBrowserNotification(alert: Alert, config: any): Promise<void> {
    if (!('Notification' in window)) return

    let permission = Notification.permission
    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    if (permission !== 'granted') return

    const notification = new Notification(config.title || alert.title, {
      body: alert.message,
      icon: config.icon || '/images/icons/icon-192x192.png',
      badge: config.badge || '/images/icons/badge-72x72.png',
      tag: alert.id,
      requireInteraction: config.urgent || alert.level === 'critical',
      data: {
        alertId: alert.id,
        category: alert.category,
        level: alert.level
      }
    })

    notification.onclick = () => {
      window.focus()
      this.acknowledgeAlert(alert.id)
      notification.close()
    }

    // 自动关闭（除非是紧急告警）
    if (!config.urgent && alert.level !== 'critical') {
      setTimeout(() => {
        notification.close()
      }, 5000)
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmail(alert: Alert, config: any): Promise<void> {
    // 邮件发送实现
    console.log('发送邮件通知:', alert.title, config)
  }

  /**
   * 发送 Webhook
   */
  private async sendWebhook(alert: Alert, config: any): Promise<void> {
    if (config.url === 'console') {
      console.log(`📢 Webhook 告警: ${alert.title}`, alert)
      return
    }

    try {
      await fetch(config.url, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {})
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          source: 'chatlog-web'
        })
      })
    } catch (error) {
      console.error('Webhook 发送失败:', error)
    }
  }

  /**
   * 发送短信
   */
  private async sendSMS(alert: Alert, config: any): Promise<void> {
    // 短信发送实现
    console.log('发送短信通知:', alert.title, config)
  }

  /**
   * 执行自动修复
   */
  private async executeAutoFix(alert: Alert, config: any): Promise<void> {
    console.log(`🔧 自动修复: ${config.action}`, alert)

    switch (config.action) {
      case 'clear_cache':
        // 清理缓存
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(cacheNames.map(name => caches.delete(name)))
          console.log('缓存已清理')
        }
        break
      case 'reload_page':
        // 刷新页面
        setTimeout(() => {
          window.location.reload()
        }, 5000)
        break
      case 'reduce_polling':
        // 减少轮询频率
        this.evaluationInterval = Math.min(this.evaluationInterval * 2, 300000)
        break
      default:
        console.warn(`未知自动修复动作: ${config.action}`)
    }
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, userId?: string): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert || alert.status !== 'active') return false

    alert.acknowledgedBy = userId || 'user'
    alert.acknowledgedAt = Date.now()
    alert.status = 'resolved'
    alert.resolvedAt = Date.now()

    console.log(`✅ 告警已确认: ${alert.title}`)
    return true
  }

  /**
   * 抑制告警
   */
  suppressAlert(alertId: string, duration: number): boolean {
    const alert = this.alerts.get(alertId)
    if (!alert) return false

    alert.status = 'suppressed'
    alert.suppressedUntil = Date.now() + duration

    const rule = this.rules.get(alert.ruleId)
    if (rule) {
      rule.suppressUntil = Date.now() + duration
    }

    console.log(`🔇 告警已抑制: ${alert.title} (${duration}ms)`)
    return true
  }

  /**
   * 清理旧告警
   */
  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - this.retentionPeriod
    const toDelete: string[] = []

    for (const [id, alert] of this.alerts) {
      if (alert.timestamp < cutoff && alert.status !== 'active') {
        toDelete.push(id)
      }
    }

    toDelete.forEach(id => {
      this.alerts.delete(id)
    })

    // 限制告警数量
    if (this.alerts.size > this.maxAlerts) {
      const sorted = Array.from(this.alerts.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      
      const toRemove = sorted.slice(0, this.alerts.size - this.maxAlerts)
      toRemove.forEach(([id]) => {
        this.alerts.delete(id)
      })
    }
  }

  /**
   * 获取平均响应时间
   */
  private getAverageResponseTime(): number {
    // 模拟数据
    return Math.random() * 1500 + 500
  }

  /**
   * 获取错误率
   */
  private getErrorRate(): number {
    // 模拟数据
    return Math.random() * 10
  }

  /**
   * 获取内存使用百分比
   */
  private getMemoryUsagePercent(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    }
    return Math.random() * 100
  }

  /**
   * 获取 LCP 值
   */
  private getLCP(): number {
    // 模拟数据
    return Math.random() * 6000 + 2000
  }

  /**
   * 获取 FID 值
   */
  private getFID(): number {
    // 模拟数据
    return Math.random() * 200 + 50
  }

  /**
   * 获取安全违规数量
   */
  private getSecurityViolations(): number {
    // 模拟数据
    return Math.random() > 0.95 ? 1 : 0
  }

  /**
   * 生成告警ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 添加告警规则
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule)
  }

  /**
   * 更新告警规则
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId)
    if (!rule) return false

    Object.assign(rule, updates)
    return true
  }

  /**
   * 删除告警规则
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId)
  }

  /**
   * 获取所有告警规则
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values())
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.status === 'active')
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * 获取所有告警
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * 添加通知渠道
   */
  addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel)
  }

  /**
   * 更新通知渠道
   */
  updateChannel(channelId: string, updates: Partial<NotificationChannel>): boolean {
    const channel = this.channels.get(channelId)
    if (!channel) return false

    Object.assign(channel, updates)
    return true
  }

  /**
   * 获取所有通知渠道
   */
  getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values())
  }

  /**
   * 销毁告警管理器
   */
  destroy(): void {
    this.stopEvaluation()
    this.rules.clear()
    this.alerts.clear()
    this.channels.clear()
  }
}

// 创建全局实例
export const alertManager = new AlertManager()

// 导出便利函数
export const addAlertRule = (rule: AlertRule) => {
  alertManager.addRule(rule)
}

export const getActiveAlerts = () => {
  return alertManager.getActiveAlerts()
}

export const acknowledgeAlert = (alertId: string) => {
  return alertManager.acknowledgeAlert(alertId)
}

export const suppressAlert = (alertId: string, duration: number) => {
  return alertManager.suppressAlert(alertId, duration)
}