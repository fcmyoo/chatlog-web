/**

* 统一API客户端
 * 整合chatlog和AI服务的所有API调用
 * 提供统一的错误处理、缓存和配置管理
 */

import axios from 'axios'
import { setupErrorHandling } from './errorHandling.js'

// 服务配置
const SERVICE_CONFIG = {
  chatlog: {
    baseURL: process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:5030' : '',
    timeout: 10000
  },
  ai: {
    baseURL: process.env.NODE_ENV === 'production' ? 'http://localhost:3001' : '',
    timeout: 300000
  }
}

/**
 * 基础HTTP客户端类
 */
class BaseClient {
  constructor (serviceName, config) {
    this.serviceName = serviceName
    this.client = axios.create(config)

    // 设置统一错误处理
    setupErrorHandling(this.client, {
      showNotification: true,
      enableRetry: serviceName === 'Chatlog' // 只对chatlog服务启用重试
    })
  }
}

/**
 * Chatlog API客户端
 */
class ChatlogClient extends BaseClient {
  constructor () {
    super('Chatlog', SERVICE_CONFIG.chatlog)
  }

  // CSV解析工具
  parseCSV (csvText) {
    if (!csvText || typeof csvText !== 'string') {
      console.warn('parseCSV: 输入数据不是字符串', typeof csvText)
      return []
    }

    const lines = csvText.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim())
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      data.push(row)
    }

    return data
  }

  // 会话数据解析
  parseSessions (sessionText) {
    if (!sessionText || typeof sessionText !== 'string') {
      console.warn('parseSessions: 输入数据不是字符串')
      return []
    }

    const lines = sessionText.trim().split('\n').filter(line => line.trim())
    const sessions = []

    for (const line of lines) {
      if (line.trim()) {
        // 解析格式：群名称(群ID) 时间
        const match = line.match(/^(.+?)\((.+?)\)\s+(.+)$/)
        if (match) {
          const [, name, id, lastMessageTime] = match
          sessions.push({
            name: name.trim(),
            id: id.trim(),
            lastMessageTime: lastMessageTime.trim(),
            displayName: name.trim()
          })
        }
      }
    }

    return sessions
  }

  // 聊天记录解析
  parseChatLogs (chatlogText) {
    if (!chatlogText) {
      console.warn('parseChatLogs: 输入数据为空')
      return []
    }

    let textData = chatlogText
    if (typeof chatlogText === 'object') {
      if (Array.isArray(chatlogText)) {
        return chatlogText
      } else {
        textData = JSON.stringify(chatlogText)
      }
    } else if (typeof chatlogText !== 'string') {
      textData = String(chatlogText)
    }

    const lines = textData.trim().split('\n')
    const chatLogs = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line) {
        // 解析格式：发送者(发送者ID) 时间
        const match = line.match(/^(.+?)\((.+?)\)\s+(.+)$/)
        if (match) {
          const [, senderName, senderId, time] = match
          let content = ''

          // 读取消息内容（下一行）
          if (i + 1 < lines.length) {
            content = lines[i + 1].trim()
            i++ // 跳过内容行
          }

          chatLogs.push({
            senderName: senderName.trim(),
            senderId: senderId.trim(),
            time: time.trim(),
            content,
            timestamp: new Date(time.trim()).getTime()
          })
        }
      }
    }

    return chatLogs
  }

  // API方法
  async getChatLogs (params) {
    const response = await this.client.get('/api/v1/chatlog', { params })
    return {
      ...response,
      data: this.parseChatLogs(response.data)
    }
  }

  async getContacts () {
    const response = await this.client.get('/api/v1/contact')
    return {
      ...response,
      data: this.parseCSV(response.data)
    }
  }

  async getChatrooms () {
    const response = await this.client.get('/api/v1/chatroom')
    return {
      ...response,
      data: this.parseCSV(response.data)
    }
  }

  async getSessions () {
    const response = await this.client.get('/api/v1/session')
    return {
      ...response,
      data: this.parseSessions(response.data)
    }
  }

  async getChatLogsRaw (params) {
    return await this.client.get('/api/v1/chatlog', { params })
  }

  async exportChatLogs (params) {
    return await this.client.get('/api/v1/chatlog', {
      params: { ...params, format: 'csv' }
    })
  }

  // 多媒体资源URL生成
  getImageUrl (id) {
    return `${SERVICE_CONFIG.chatlog.baseURL}/image/${id}`
  }

  getVideoUrl (id) {
    return `${SERVICE_CONFIG.chatlog.baseURL}/video/${id}`
  }

  getFileUrl (id) {
    return `${SERVICE_CONFIG.chatlog.baseURL}/file/${id}`
  }

  getVoiceUrl (id) {
    return `${SERVICE_CONFIG.chatlog.baseURL}/voice/${id}`
  }

  getDataUrl (path) {
    return `${SERVICE_CONFIG.chatlog.baseURL}/data/${path}`
  }
}

/**
 * AI API客户端
 */
class AIClient extends BaseClient {
  constructor () {
    super('AI', SERVICE_CONFIG.ai)
  }

  async performAnalysis (params) {
    const response = await this.client.post('/ai-api/analysis', params)
    return response.data
  }

  async getAnalysisHistory (params) {
    const response = await this.client.get('/ai-api/history', { params })
    return response.data
  }

  async getAnalysisById (id) {
    const response = await this.client.get(`/ai-api/history/${id}`)
    return response.data
  }

  async deleteAnalysis (id) {
    const response = await this.client.delete(`/ai-api/history/${id}`)
    return response.data
  }

  async getAnalysisTypes () {
    const response = await this.client.get('/ai-api/analysis-types')
    return response.data
  }

  async testModelConnection (params) {
    const response = await this.client.post('/ai-api/models/test', params)
    return response.data
  }

  async getModelConfig () {
    const response = await this.client.get('/ai-api/models/config')
    return response.data
  }

  async updateModelConfig (config) {
    const response = await this.client.post('/ai-api/models/config', config)
    return response.data
  }

  async getScheduleConfig () {
    const response = await this.client.get('/ai-api/schedule/config')
    return response.data
  }

  async updateScheduleConfig (config) {
    const response = await this.client.post('/ai-api/schedule/config', config)
    return response.data
  }

  async triggerScheduledAnalysis () {
    const response = await this.client.post('/ai-api/schedule/trigger')
    return response.data
  }

  async getHealthStatus () {
    const response = await this.client.get('/health')
    return response.data
  }
}

/**
 * 统一API客户端
 */
class ApiClient {
  constructor () {
    this.chatlog = new ChatlogClient()
    this.ai = new AIClient()
  }

  // 便捷方法 - 向后兼容
  async getChatLogs (params) {
    return await this.chatlog.getChatLogs(params)
  }

  async getContacts () {
    return await this.chatlog.getContacts()
  }

  async getChatrooms () {
    return await this.chatlog.getChatrooms()
  }

  async getSessions () {
    return await this.chatlog.getSessions()
  }

  async performAnalysis (params) {
    return await this.ai.performAnalysis(params)
  }

  async getAnalysisHistory (params) {
    return await this.ai.getAnalysisHistory(params)
  }

  // 健康检查
  async healthCheck () {
    const results = {}

    try {
      // 检查Chatlog服务
      await this.chatlog.getSessions()
      results.chatlog = { status: 'healthy', timestamp: new Date().toISOString() }
    } catch (error) {
      results.chatlog = { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() }
    }

    try {
      // 检查AI服务
      await this.ai.getHealthStatus()
      results.ai = { status: 'healthy', timestamp: new Date().toISOString() }
    } catch (error) {
      results.ai = { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() }
    }

    return results
  }
}

// 创建单例实例
const apiClient = new ApiClient()

// 向后兼容的导出
export { apiClient as default, ChatlogClient, AIClient, ApiClient }

// 保持原有的导出格式以兼容现有代码
export const aiApi = apiClient.ai
