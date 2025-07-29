import { Page, Locator } from '@playwright/test'

export class NavigationPage {
  readonly page: Page
  readonly sidebarToggle: Locator
  readonly menuItems: Locator
  readonly dashboardLink: Locator
  readonly contactsLink: Locator
  readonly chatroomsLink: Locator
  readonly chatlogLink: Locator
  readonly analyticsLink: Locator

  constructor(page: Page) {
    this.page = page
    this.sidebarToggle = page.locator('.sidebar-toggle')
    this.menuItems = page.locator('.menu-item')
    this.dashboardLink = page.locator('a[href="/dashboard"]')
    this.contactsLink = page.locator('a[href="/contacts"]')
    this.chatroomsLink = page.locator('a[href="/chatrooms"]')
    this.chatlogLink = page.locator('a[href="/chatlog"]')
    this.analyticsLink = page.locator('a[href="/analytics"]')
  }

  async goto() {
    await this.page.goto('/')
  }

  async navigateToDashboard() {
    await this.dashboardLink.click()
    await this.page.waitForURL('/dashboard')
  }

  async navigateToContacts() {
    await this.contactsLink.click()
    await this.page.waitForURL('/contacts')
  }

  async navigateToChatrooms() {
    await this.chatroomsLink.click()
    await this.page.waitForURL('/chatrooms')
  }

  async navigateToChatlog() {
    await this.chatlogLink.click()
    await this.page.waitForURL('/chatlog')
  }

  async navigateToAnalytics() {
    await this.analyticsLink.click()
    await this.page.waitForURL('/analytics')
  }

  async toggleSidebar() {
    await this.sidebarToggle.click()
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
  }
}