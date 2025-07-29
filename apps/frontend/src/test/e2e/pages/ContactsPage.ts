import { Page, Locator, expect } from '@playwright/test'

export class ContactsPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly refreshButton: Locator
  readonly searchInput: Locator
  readonly contactsTable: Locator
  readonly tableRows: Locator
  readonly loadingState: Locator
  readonly emptyState: Locator
  readonly pagination: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h3:has-text("联系人管理")')
    this.refreshButton = page.locator('button:has-text("刷新")')
    this.searchInput = page.locator('input[placeholder="搜索联系人..."]')
    this.contactsTable = page.locator('.el-table')
    this.tableRows = page.locator('.el-table tbody tr')
    this.loadingState = page.locator('.loading')
    this.emptyState = page.locator('.empty-state')
    this.pagination = page.locator('.pagination')
  }

  async goto() {
    await this.page.goto('/contacts')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForContactsToLoad() {
    // 等待加载状态消失
    await this.loadingState.waitFor({ state: 'hidden', timeout: 10000 })
  }

  async refreshContacts() {
    await this.refreshButton.click()
    await this.waitForContactsToLoad()
  }

  async searchContacts(keyword: string) {
    await this.searchInput.fill(keyword)
    await this.searchInput.press('Enter')
    await this.page.waitForTimeout(1000) // 等待搜索完成
  }

  async clearSearch() {
    await this.searchInput.clear()
    await this.page.waitForTimeout(1000)
  }

  async getContactsCount(): Promise<number> {
    try {
      await this.tableRows.first().waitFor({ timeout: 3000 })
      return await this.tableRows.count()
    } catch {
      return 0
    }
  }

  async getContactByUsername(username: string): Promise<Locator> {
    return this.page.locator(`tr:has-text("${username}")`)
  }

  async clickViewChatHistory(username: string) {
    const contactRow = await this.getContactByUsername(username)
    const viewButton = contactRow.locator('button:has-text("查看聊天记录")')
    await viewButton.click()
  }

  async clickCopyContactId(username: string) {
    const contactRow = await this.getContactByUsername(username)
    const copyButton = contactRow.locator('button:has-text("复制ID")')
    await copyButton.click()
  }

  async goToPage(pageNumber: number) {
    const pageButton = this.page.locator(`.el-pagination button:has-text("${pageNumber}")`)
    await pageButton.click()
    await this.page.waitForTimeout(500)
  }

  async isEmptyStateVisible(): Promise<boolean> {
    try {
      await this.emptyState.waitFor({ state: 'visible', timeout: 3000 })
      return true
    } catch {
      return false
    }
  }

  async isLoadingStateVisible(): Promise<boolean> {
    try {
      await this.loadingState.waitFor({ state: 'visible', timeout: 1000 })
      return true
    } catch {
      return false
    }
  }

  async verifyContactsTableStructure() {
    await expect(this.contactsTable).toBeVisible()
    
    // 验证表头
    const headers = ['用户名', '昵称', '备注', '操作']
    for (const header of headers) {
      await expect(this.page.locator(`th:has-text("${header}")`)).toBeVisible()
    }
  }

  async verifyPaginationExists() {
    await expect(this.pagination).toBeVisible()
  }
}