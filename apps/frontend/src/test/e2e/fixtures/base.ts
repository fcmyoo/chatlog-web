import { test as base, Page } from '@playwright/test'
import { NavigationPage } from '../pages/NavigationPage'
import { ContactsPage } from '../pages/ContactsPage'
import { DashboardPage } from '../pages/DashboardPage'

// 扩展基础测试以包含页面对象
type TestFixtures = {
  navigationPage: NavigationPage
  contactsPage: ContactsPage
  dashboardPage: DashboardPage
}

export const test = base.extend<TestFixtures>({
  navigationPage: async ({ page }, use) => {
    const navigationPage = new NavigationPage(page)
    await use(navigationPage)
  },

  contactsPage: async ({ page }, use) => {
    const contactsPage = new ContactsPage(page)
    await use(contactsPage)
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page)
    await use(dashboardPage)
  },
})

export { expect } from '@playwright/test'

// 测试数据工厂
export class TestDataFactory {
  static mockContactsApiResponse() {
    return `username,nickname,remark,avatar
testuser1,测试用户1,测试备注1,avatar1.jpg
testuser2,测试用户2,测试备注2,avatar2.jpg
chatroom@example,测试群聊,群聊备注,room.jpg`
  }

  static mockChatroomsApiResponse() {
    return `username,nickname,memberCount,description
room1@chatroom,技术讨论群,25,讨论技术问题的群聊
room2@chatroom,项目协作群,15,项目团队协作群聊`
  }

  static mockSessionsApiResponse() {
    return `会话ID: session1
联系人: testuser1
最后消息时间: 2024-01-01 12:00:00
消息数量: 100

会话ID: session2
联系人: testuser2
最后消息时间: 2024-01-02 13:00:00
消息数量: 50`
  }

  static mockChatLogsApiResponse() {
    return `[2024-01-01 12:00:00] testuser1: 你好
[2024-01-01 12:01:00] testuser2: 你好，很高兴认识你
[2024-01-01 12:02:00] testuser1: 我也很高兴认识你`
  }
}

// 全局设置和清理工具
export class TestUtils {
  static async mockApiResponses(page: Page) {
    // 模拟联系人API
    await page.route('/api/contacts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: TestDataFactory.mockContactsApiResponse()
      })
    })

    // 模拟聊天室API
    await page.route('/api/chatrooms', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: TestDataFactory.mockChatroomsApiResponse()
      })
    })

    // 模拟会话API
    await page.route('/api/sessions', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: TestDataFactory.mockSessionsApiResponse()
      })
    })

    // 模拟聊天记录API
    await page.route('/api/chatlog*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: TestDataFactory.mockChatLogsApiResponse()
      })
    })

    // 模拟搜索API
    await page.route('/api/search/*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'username,nickname\nsearchuser,搜索用户'
      })
    })
  }

  static async clearMocks(page: Page) {
    await page.unroute('/api/**')
  }

  static async waitForNetworkIdle(page: Page, timeout = 3000) {
    await page.waitForLoadState('networkidle', { timeout })
  }

  static async takeScreenshot(page: Page, name: string) {
    await page.screenshot({ 
      path: `test-results/${name}.png`,
      fullPage: true 
    })
  }
}