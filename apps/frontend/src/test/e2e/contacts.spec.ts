import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../fixtures/base';

describe('联系人页面功能测试', () => {
  beforeEach(async ({ page }: { page: any }) => {
    await TestUtils.mockApiResponses(page);
  });

  afterEach(async ({ page }: { page: any }) => {
    await TestUtils.clearMocks(page);
  });

  test('应该正确加载联系人页面', async ({ contactsPage }) => {
    await contactsPage.goto()
    await contactsPage.waitForContactsToLoad()

    // 验证页面基本结构
    await expect(contactsPage.pageTitle).toBeVisible()
    await expect(contactsPage.refreshButton).toBeVisible()
    await expect(contactsPage.searchInput).toBeVisible()
    await contactsPage.verifyContactsTableStructure()
  })

  test('应该正确显示联系人列表', async ({ contactsPage }) => {
    await contactsPage.goto()
    await contactsPage.waitForContactsToLoad()

    // 验证有联系人数据
    const contactsCount = await contactsPage.getContactsCount()
    expect(contactsCount).toBeGreaterThan(0)

    // 验证表格行包含预期数据
    const firstContact = await contactsPage.getContactByUsername('testuser1')
    await expect(firstContact).toBeVisible()
    await expect(firstContact).toContainText('测试用户1')
  })

  test('搜索功能应该正常工作', async ({ contactsPage, page }) => {
    await contactsPage.goto()
    await contactsPage.waitForContactsToLoad()

    // 搜索联系人
    await contactsPage.searchContacts('search')

    // 等待搜索API调用
    await page.waitForTimeout(1000)

    // 验证搜索结果（根据mock数据，应该显示搜索用户）
    const searchResult = await contactsPage.getContactByUsername('searchuser')
    await expect(searchResult).toBeVisible()
  })

  test('清空搜索应该显示所有联系人', async ({ contactsPage }) => {
    await contactsPage.goto()
    await contactsPage.waitForContactsToLoad()

    // 先搜索
    await contactsPage.searchContacts('search')
    await contactsPage.page.waitForTimeout(1000)

    // 清空搜索
    await contactsPage.clearSearch()

    // 验证显示所有联系人
    const contactsCount = await contactsPage.getContactsCount()
    expect(contactsCount).toBeGreaterThan(1) // 应该显示多个联系人
  })

  test('刷新按钮应该重新加载数据', async ({ contactsPage, page }) => {
    await contactsPage.goto()
    await contactsPage.waitForContactsToLoad()

    // 记录API调用次数
    let apiCallCount = 0
    await page.route('/api/contacts', async route => {
      apiCallCount++
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: TestUtils.mockContactsApiResponse()
      })
    })

    // 点击刷新按钮
    await contactsPage.refreshContacts()

    // 验证API被再次调用
    expect(apiCallCount).toBeGreaterThan(1)
  })

  test('分页功能应该正常工作', async ({ contactsPage, page }) => {
    // 模拟大量数据的API响应
    const largeMockData = Array.from({ length: 50 }, (_, i) => 
      `user${i + 1},用户${i + 1},备注${i + 1},avatar${i + 1}.jpg`
    ).join('\n')
    
    await page.route('/api/contacts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: `username,nickname,remark,avatar\n${largeMockData}`
      })
    })

    await contactsPage.goto()
    await contactsPage.waitForContactsToLoad()

    // 验证分页组件存在
    await contactsPage.verifyPaginationExists()

    // 获取第一页的数据数量
    const firstPageCount = await contactsPage.getContactsCount()
    expect(firstPageCount).toBeLessThanOrEqual(20) // 默认每页20条

    // 切换到第二页（如果有的话）
    const pagination = contactsPage.pagination
    const nextButton = pagination.locator('button:has-text("2")')
    
    if (await nextButton.isVisible()) {
      await contactsPage.goToPage(2)
      
      // 验证页面数据发生变化
      const secondPageCount = await contactsPage.getContactsCount()
      expect(secondPageCount).toBeGreaterThan(0)
    }
  })

  test('查看聊天记录功能应该正常工作', async ({ contactsPage, page }) => {
    await contactsPage.goto()
    await contactsPage.waitForContactsToLoad()

    // 点击查看聊天记录按钮
    await contactsPage.clickViewChatHistory('testuser1')

    // 验证跳转到聊天记录页面
    await expect(page).toHaveURL(/\/chatlog\?talker=testuser1/)
  })

  test('复制联系人ID功能应该正常工作', async ({ contactsPage, page }) => {
    await contactsPage.goto() 
    await contactsPage.waitForContactsToLoad()

    // 模拟clipboard API
    await page.addInitScript(() => {
      const mockClipboard = {
        writeText: async (text: string) => {
          window.__clipboardText = text
        }
      }
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard
      })
    })

    // 点击复制ID按钮
    await contactsPage.clickCopyContactId('testuser1')

    // 验证成功消息（Element Plus消息组件）
    const successMessage = page.locator('.el-message--success')
    await expect(successMessage).toBeVisible({ timeout: 3000 })
    await expect(successMessage).toContainText('已复制到剪贴板')
  })

  test('空状态应该正确显示', async ({ contactsPage, page }) => {
    // 模拟空数据响应
    await page.route('/api/contacts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'username,nickname,remark,avatar\n' // 只有表头，无数据
      })
    })

    await contactsPage.goto()
    await contactsPage.waitForContactsToLoad()

    // 验证空状态显示
    const isEmpty = await contactsPage.isEmptyStateVisible()
    expect(isEmpty).toBe(true)
  })

  test('加载状态应该正确显示', async ({ contactsPage, page }) => {
    // 模拟慢速API响应
    await page.route('/api/contacts', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: TestUtils.mockContactsApiResponse()
      })
    })

    await contactsPage.goto()

    // 验证加载状态显示
    const isLoading = await contactsPage.isLoadingStateVisible()
    expect(isLoading).toBe(true)

    // 等待加载完成
    await contactsPage.waitForContactsToLoad()
    
    // 验证加载状态消失
    const isStillLoading = await contactsPage.isLoadingStateVisible()
    expect(isStillLoading).toBe(false)
  })

  test('网络错误应该正确处理', async ({ contactsPage, page }) => {
    // 模拟网络错误
    await page.route('/api/contacts', async route => {
      await route.abort('failed')
    })

    await contactsPage.goto()

    // 等待错误处理
    await page.waitForTimeout(2000)

    // 验证错误消息显示（具体取决于错误处理实现）
    const errorMessage = page.locator('.el-message--error')
    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('移动端响应式布局应该正常工作', async ({ contactsPage, page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })

    await contactsPage.goto()
    await contactsPage.waitForContactsToLoad()

    // 验证表格在移动端的响应式行为
    const table = contactsPage.contactsTable
    await expect(table).toBeVisible()

    // 验证搜索栏在移动端的布局
    const searchInput = contactsPage.searchInput
    await expect(searchInput).toBeVisible()
    
    // 验证响应式样式
    const searchBarWidth = await searchInput.boundingBox()
    expect(searchBarWidth?.width).toBeLessThan(400) // 适应移动端宽度
  })
})