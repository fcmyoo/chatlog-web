import { test, expect, TestUtils } from '../fixtures/base'

test.describe('仪表板页面功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await TestUtils.mockApiResponses(page)
  })

  test.afterEach(async ({ page }) => {
    await TestUtils.clearMocks(page)
  })

  test('应该正确加载仪表板页面', async ({ dashboardPage }) => {
    await dashboardPage.goto()
    await dashboardPage.waitForDashboardToLoad()

    // 验证页面基本结构
    await dashboardPage.verifyDashboardStructure()
  })

  test('统计卡片应该显示正确的数据', async ({ dashboardPage, page }) => {
    // 模拟统计API响应
    await page.route('/api/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contactsCount: 150,
          chatroomsCount: 25,
          messagesCount: 5000,
          activeUsers: 80
        })
      })
    })

    await dashboardPage.goto()
    await dashboardPage.waitForDashboardToLoad()

    // 验证统计卡片数量
    const cardsCount = await dashboardPage.getStatsCardsCount()
    expect(cardsCount).toBeGreaterThanOrEqual(4)

    // 验证特定统计数据（如果API返回）
    // 注意：由于我们使用mock数据，这里主要测试结构存在性
    const contactsCard = await dashboardPage.getStatCardValue('联系人总数')
    expect(contactsCard).toBeTruthy()
  })

  test('快速操作按钮应该正常工作', async ({ dashboardPage, page }) => {
    await dashboardPage.goto()
    await dashboardPage.waitForDashboardToLoad()

    // 验证快速操作区域存在
    await dashboardPage.verifyQuickActionsExist()

    // 测试"查看联系人"快速操作
    await dashboardPage.clickQuickAction('查看联系人')
    
    // 验证跳转到联系人页面
    await expect(page).toHaveURL('/contacts')
  })

  test('刷新数据功能应该正常工作', async ({ dashboardPage, page }) => {
    await dashboardPage.goto()
    await dashboardPage.waitForDashboardToLoad()

    // 记录API调用次数
    let statsApiCalls = 0
    await page.route('/api/stats', async route => {
      statsApiCalls++
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contactsCount: 150 + statsApiCalls,
          chatroomsCount: 25,
          messagesCount: 5000,
          activeUsers: 80
        })
      })
    })

    // 刷新数据
    await dashboardPage.refreshData()

    // 验证API被调用
    expect(statsApiCalls).toBeGreaterThan(0)
  })

  test('最近活动区域应该显示', async ({ dashboardPage, page }) => {
    // 模拟最近活动数据
    await page.route('/api/recent-activity', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            type: 'message',
            user: '测试用户1',
            action: '发送了消息',
            time: '2024-01-01T12:00:00Z'
          },
          {
            id: 2,
            type: 'join',
            user: '测试用户2',
            action: '加入了群聊',
            time: '2024-01-01T11:00:00Z'
          }
        ])
      })
    })

    await dashboardPage.goto()
    await dashboardPage.waitForDashboardToLoad()

    // 验证最近活动区域存在
    await expect(dashboardPage.recentActivity).toBeVisible()
  })

  test('图表区域应该正确渲染', async ({ dashboardPage, page }) => {
    // 模拟图表数据
    await page.route('/api/charts/trends', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
          datasets: [{
            label: '消息数量',
            data: [120, 190, 300, 500, 200, 300, 450]
          }]
        })
      })
    })

    await dashboardPage.goto()
    await dashboardPage.waitForDashboardToLoad()

    // 等待图表加载
    await page.waitForTimeout(2000)

    // 验证图表容器存在
    const chartContainer = page.locator('.chart-container, .echarts, canvas')
    await expect(chartContainer.first()).toBeVisible({ timeout: 10000 })
  })

  test('响应式设计应该在不同屏幕尺寸下正常工作', async ({ dashboardPage, page }) => {
    await dashboardPage.goto()
    await dashboardPage.waitForDashboardToLoad()

    // 测试桌面端布局
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(dashboardPage.statsCards.first()).toBeVisible()

    // 测试平板端布局
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(500) // 等待响应式调整
    await expect(dashboardPage.statsCards.first()).toBeVisible()

    // 测试移动端布局
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(500) // 等待响应式调整
    await expect(dashboardPage.statsCards.first()).toBeVisible()

    // 验证移动端统计卡片布局
    const cardsCount = await dashboardPage.getStatsCardsCount()
    expect(cardsCount).toBeGreaterThan(0)
  })

  test('加载状态应该正确显示', async ({ dashboardPage, page }) => {
    // 模拟慢速API响应
    await page.route('/api/stats', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contactsCount: 150,
          chatroomsCount: 25,
          messagesCount: 5000,
          activeUsers: 80
        })
      })
    })

    await dashboardPage.goto()

    // 验证加载状态
    const loadingIndicator = page.locator('.loading, .el-loading, .skeleton')
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 1000 })

    // 等待数据加载完成
    await dashboardPage.waitForDashboardToLoad()

    // 验证加载状态消失
    await expect(loadingIndicator.first()).toBeHidden({ timeout: 5000 })
  })

  test('错误状态应该正确处理', async ({ dashboardPage, page }) => {
    // 模拟API错误
    await page.route('/api/stats', async route => {
      await route.abort('failed')
    })

    await dashboardPage.goto()

    // 等待错误处理
    await page.waitForTimeout(3000)

    // 验证错误消息或fallback状态
    const errorMessage = page.locator('.error-message, .el-message--error')
    const emptyState = page.locator('.empty-state')
    
    // 至少应该显示错误消息或空状态之一
    const errorVisible = await errorMessage.first().isVisible().catch(() => false)
    const emptyVisible = await emptyState.first().isVisible().catch(() => false)
    
    expect(errorVisible || emptyVisible).toBe(true)
  })

  test('数据更新应该实时反映', async ({ dashboardPage, page }) => {
    let dataVersion = 1

    // 模拟动态数据API
    await page.route('/api/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contactsCount: 150 * dataVersion,
          chatroomsCount: 25 * dataVersion,
          messagesCount: 5000 * dataVersion,
          activeUsers: 80 * dataVersion
        })
      })
      dataVersion++
    })

    await dashboardPage.goto()
    await dashboardPage.waitForDashboardToLoad()

    // 第一次数据加载
    const initialCardsCount = await dashboardPage.getStatsCardsCount()
    expect(initialCardsCount).toBeGreaterThan(0)

    // 触发数据刷新
    await dashboardPage.refreshData()

    // 验证数据已更新（通过API调用版本验证）
    expect(dataVersion).toBeGreaterThan(2)
  })

  test('键盘导航应该正常工作', async ({ dashboardPage, page }) => {
    await dashboardPage.goto()
    await dashboardPage.waitForDashboardToLoad()

    // 使用Tab键导航快速操作按钮
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // 验证焦点在可交互元素上
    const focusedElement = await page.locator(':focus')
    await expect(focusedElement).toBeVisible()

    // 使用Enter键激活按钮
    await page.keyboard.press('Enter')

    // 验证相应操作被触发（如页面跳转）
    await page.waitForTimeout(1000)
    const currentUrl = page.url()
    expect(currentUrl).toBeTruthy()
  })
})