/**
 * API接口统一管理 - 重构为使用统一ApiClient
 * 保持向后兼容性，逐步迁移到新架构
 */

import apiClient from './ApiClient.js'

// 向后兼容的默认导出
export default apiClient

// 兼容性包装 - 逐步迁移现有代码时使用
export const compatApi = {
  // 直接代理到统一客户端的方法
  getChatLogs: (params) => apiClient.getChatLogs(params),
  getContacts: () => apiClient.getContacts(),
  getChatrooms: () => apiClient.getChatrooms(),
  getSessions: () => apiClient.getSessions(),
  getChatLogsRaw: (params) => apiClient.chatlog.getChatLogsRaw(params),
  exportChatLogs: (params) => apiClient.chatlog.exportChatLogs(params),

  // 媒体资源URL生成
  getImageUrl: (id) => apiClient.chatlog.getImageUrl(id),
  getVideoUrl: (id) => apiClient.chatlog.getVideoUrl(id),
  getFileUrl: (id) => apiClient.chatlog.getFileUrl(id),
  getVoiceUrl: (id) => apiClient.chatlog.getVoiceUrl(id),
  getDataUrl: (path) => apiClient.chatlog.getDataUrl(path)
}

// 新架构导出
export { apiClient }
export { aiApi } from './ApiClient.js'
