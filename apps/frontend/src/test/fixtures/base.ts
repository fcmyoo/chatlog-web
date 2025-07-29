import { test, expect } from 'vitest';

// base.ts - 基础测试工具和模拟数据

export const TestUtils = {
  mockApiResponses: async (page: any) => {
    // 模拟API响应
    await page.route('/api/contacts', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }) // 示例空数据
      });
    });
  },
  clearMocks: async (page: any) => {
    // 清除所有模拟
    await page.unroute('/api/contacts');
  },
  mockContactsApiResponse: () => {
    // 返回模拟的联系人数据
    return `username,nickname,remark,avatar
    testuser1,测试用户1,,avatar1.jpg
    testuser2,测试用户2,,avatar2.jpg`;
  }
};