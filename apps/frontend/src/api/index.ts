/**
 * API接口统一管理 - 重构为使用统一ApiClient
 * 保持向后兼容性，逐步迁移到新架构
 */

import type { ChatLogParams, ExportOptions } from '@/types/api'
import apiClient from './ApiClient'

// 向后兼容的默认导出
export default apiClient

// 兼容性包装 - 逐步迁移现有代码时使用
export const compatApi = {
  // 直接代理到统一客户端的方法
  getChatLogs: (params?: ChatLogParams) => apiClient.getChatLogs(params),
  getContacts: () => apiClient.getContacts(),
  getChatrooms: () => apiClient.getChatrooms(),
  getSessions: () => apiClient.getSessions(),
  getChatLogsRaw: (params?: ChatLogParams) => apiClient.chatlog.getChatLogsRaw(params),
  exportChatLogs: (params: ChatLogParams & ExportOptions) => apiClient.chatlog.exportChatLogs(params),

  // 媒体资源URL生成
  getImageUrl: (id: string) => apiClient.chatlog.getImageUrl(id),
  getVideoUrl: (id: string) => apiClient.chatlog.getVideoUrl(id),
  getFileUrl: (id: string) => apiClient.chatlog.getFileUrl(id),
  getVoiceUrl: (id: string) => apiClient.chatlog.getVoiceUrl(id),
  getDataUrl: (path: string) => apiClient.chatlog.getDataUrl(path)
}

// 新架构导出
export { apiClient }
export { aiApi } from './ApiClient'