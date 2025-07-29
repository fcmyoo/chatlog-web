import { Page, Locator, expect } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly statsCards: Locator
  readonly quickActions: Locator
  readonly recentActivity: Locator
  readonly refreshButton: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1:has-text("数据面板")')
    this.statsCards = page.locator('.stats-card')
    this.quickActions = page.locator('.quick-actions')
    this.recentActivity = page.locator('.recent-activity')
    this.refreshButton = page.locator('button:has-text("刷新数据")')
  }

  async goto() {
    await this.page.goto('/dashboard')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForDashboardToLoad() {
    await this.pageTitle.waitFor({ state: 'visible', timeout: 10000 })
  }

  async refreshData() {
    await this.refreshButton.click()
    await this.page.waitForTimeout(1000)
  }

  async getStatsCardsCount(): Promise<number> {
    try {
      await this.statsCards.first().waitFor({ timeout: 3000 })
      return await this.statsCards.count()
    } catch {
      return 0
    }
  }

  async getStatCardValue(title: string): Promise<string> {
    const card = this.page.locator(`.stats-card:has-text("${title}")`)
    const value = card.locator('.stat-value')
    return await value.textContent() || '0'
  }

  async verifyDashboardStructure() {
    await expect(this.pageTitle).toBeVisible()
    
    // 验证统计卡片存在
    const expectedStats = ['联系人总数', '聊天室总数', '消息总数', '活跃用户']
    for (const stat of expectedStats) {
      const card = this.page.locator(`.stats-card:has-text("${stat}")`)
      await expect(card).toBeVisible({ timeout: 5000 })
    }
  }

  async verifyQuickActionsExist() {
    await expect(this.quickActions).toBeVisible()
    
    const actions = ['查看联系人', '查看聊天室', '分析数据', '查看日志']
    for (const action of actions) {
      const actionButton = this.page.locator(`button:has-text("${action}")`)
      await expect(actionButton).toBeVisible()
    }
  }

  async clickQuickAction(actionText: string) {
    const actionButton = this.page.locator(`button:has-text("${actionText}")`)
    await actionButton.click()
  }
}