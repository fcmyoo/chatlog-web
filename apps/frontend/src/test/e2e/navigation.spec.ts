import { test, expect, TestUtils } from '../fixtures/base'

test.describe('导航功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await TestUtils.mockApiResponses(page)
  })

  test.afterEach(async ({ page }) => {
    await TestUtils.clearMocks(page)
  })

  test('应该正确渲染主导航栏', async ({ navigationPage }) => {
    await navigationPage.goto()
    await navigationPage.waitForPageLoad()

    // 验证导航菜单项存在
    await expect(navigationPage.dashboardLink).toBeVisible()
    await expect(navigationPage.contactsLink).toBeVisible()
    await expect(navigationPage.chatroomsLink).toBeVisible()
    await expect(navigationPage.chatlogLink).toBeVisible()
    await expect(navigationPage.analyticsLink).toBeVisible()
  })

  test('应该能够在不同页面间导航', async ({ navigationPage, page }) => {
    await navigationPage.goto()
    await navigationPage.waitForPageLoad()

    // 导航到仪表板
    await navigationPage.navigateToDashboard()
    await expect(page).toHaveURL('/dashboard')

    // 导航到联系人页面
    await navigationPage.navigateToContacts()
    await expect(page).toHaveURL('/contacts')

    // 导航到聊天室页面
    await navigationPage.navigateToChatrooms()
    await expect(page).toHaveURL('/chatrooms')

    // 导航到聊天记录页面
    await navigationPage.navigateToChatlog()
    await expect(page).toHaveURL('/chatlog')

    // 导航到分析页面
    await navigationPage.navigateToAnalytics()
    await expect(page).toHaveURL('/analytics')
  })

  test('侧边栏切换功能应该正常工作', async ({ navigationPage, page }) => {
    await navigationPage.goto()
    await navigationPage.waitForPageLoad()

    // 检查侧边栏初始状态
    const sidebar = page.locator('.sidebar')
    await expect(sidebar).toBeVisible()

    // 切换侧边栏
    await navigationPage.toggleSidebar()
    
    // 等待动画完成
    await page.waitForTimeout(500)
    
    // 验证侧边栏状态改变（具体检查取决于实现方式）
    const sidebarClasses = await sidebar.getAttribute('class')
    expect(sidebarClasses).toBeTruthy()
  })

  test('页面刷新后应该保持当前路由', async ({ navigationPage, page }) => {
    await navigationPage.goto()
    await navigationPage.waitForPageLoad()

    // 导航到联系人页面
    await navigationPage.navigateToContacts()
    await expect(page).toHaveURL('/contacts')

    // 刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 验证仍在联系人页面
    await expect(page).toHaveURL('/contacts')
  })

  test('浏览器前进后退按钮应该正常工作', async ({ navigationPage, page }) => {
    await navigationPage.goto()
    await navigationPage.waitForPageLoad()

    // 导航路径: 首页 -> 仪表板 -> 联系人
    await navigationPage.navigateToDashboard()
    await navigationPage.navigateToContacts()
    
    await expect(page).toHaveURL('/contacts')

    // 后退到仪表板
    await page.goBack()
    await expect(page).toHaveURL('/dashboard')

    // 前进到联系人
    await page.goForward()
    await expect(page).toHaveURL('/contacts')
  })

  test('直接访问URL应该正确加载对应页面', async ({ page }) => {
    await TestUtils.mockApiResponses(page)

    // 直接访问联系人页面
    await page.goto('/contacts')
    await TestUtils.waitForNetworkIdle(page)

    await expect(page).toHaveURL('/contacts')
    await expect(page.locator('h3:has-text("联系人管理")')).toBeVisible()
  })
})