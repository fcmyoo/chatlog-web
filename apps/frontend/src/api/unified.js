/**
 * 统一API客户端配置
 * 消除硬编码地址，使用统一服务配置
 */

import axios from 'axios'

// 导入统一服务配置（适配浏览器环境）
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// 服务地址配置
const SERVICE_URLS = {
  // Chatlog API - 生产环境使用完整地址，开发环境使用代理
  chatlog: isProduction ? 'http://127.0.0.1:5030' : '',
  // AI API - 开发环境使用代理路径
  ai: isProduction ? 'http://localhost:3001' : ''
}

// CSV解析工具函数
const parseCSV = (csvText) => {
  if (!csvText || typeof csvText !== 'string') {
    console.warn('parseCSV: 输入数据不是字符串', typeof csvText, csvText)
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

// 会话数据解析函数
const parseSessions = (sessionText) => {
  if (!sessionText || typeof sessionText !== 'string') {
    console.warn('parseSessions: 输入数据不是字符串', typeof sessionText, sessionText)
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

// 聊天记录数据解析函数
const parseChatLogs = (chatlogText) => {
  if (!chatlogText) {
    console.warn('parseChatLogs: 输入数据为空')
    return []
  }
  
  // 如果是对象或数组，尝试转换为字符串
  let textData = chatlogText
  if (typeof chatlogText === 'object') {
    if (Array.isArray(chatlogText)) {
      console.warn('parseChatLogs: 输入数据是数组，直接返回')
      return chatlogText
    } else {
      console.warn('parseChatLogs: 输入数据是对象，尝试转换为字符串')
      textData = JSON.stringify(chatlogText)
    }
  } else if (typeof chatlogText !== 'string') {
    console.warn('parseChatLogs: 输入数据类型异常，尝试转换为字符串', typeof chatlogText)
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
          content: content,
          timestamp: new Date(time.trim()).getTime()
        })
      }
    }
  }
  
  return chatLogs
}

// 创建 Chatlog API 客户端
const chatlogAPI = axios.create({
  baseURL: SERVICE_URLS.chatlog,
  timeout: 10000
})

// 创建 AI API 客户端
const aiAPI = axios.create({
  baseURL: SERVICE_URLS.ai,
  timeout: 30000 // AI请求通常需要更长时间
})

// Chatlog API 请求拦截器
chatlogAPI.interceptors.request.use(
  (config) => {
    console.log('Chatlog API请求:', config.method?.toUpperCase(), config.url, config.params)
    
    if (['post', 'put', 'patch'].includes(config.method?.toLowerCase())) {
      config.headers['Content-Type'] = 'application/json'
    }
    
    return config
  },
  (error) => {
    console.error('Chatlog API请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// AI API 请求拦截器  
aiAPI.interceptors.request.use(
  (config) => {
    console.log('AI API请求:', config.method?.toUpperCase(), config.url, config.data)
    
    if (['post', 'put', 'patch'].includes(config.method?.toLowerCase())) {
      config.headers['Content-Type'] = 'application/json'
    }
    
    return config
  },
  (error) => {
    console.error('AI API请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// Chatlog API 响应拦截器
chatlogAPI.interceptors.response.use(
  (response) => {
    console.log('Chatlog API响应:', response.config.url, response.status)
    return response
  },
  (error) => {
    console.error('Chatlog API请求失败:', error.config?.url, error.response?.status, error.message)
    return Promise.reject(error)
  }
)

// AI API 响应拦截器
aiAPI.interceptors.response.use(
  (response) => {
    console.log('AI API响应:', response.config.url, response.status)
    return response
  },
  (error) => {
    console.error('AI API请求失败:', error.config?.url, error.response?.status, error.message)
    return Promise.reject(error)
  }
)

// 统一API接口
export default {
  // ==================== Chatlog API ====================
  
  // 聊天记录查询
  async getChatLogs(params) {
    const response = await chatlogAPI.get('/api/v1/chatlog', { params })
    return {
      ...response,
      data: parseChatLogs(response.data)
    }
  },
  
  // 联系人列表
  async getContacts() {
    const response = await chatlogAPI.get('/api/v1/contact')
    return {
      ...response,
      data: parseCSV(response.data)
    }
  },
  
  // 群聊列表
  async getChatrooms() {
    const response = await chatlogAPI.get('/api/v1/chatroom')
    return {
      ...response,
      data: parseCSV(response.data)
    }
  },
  
  // 会话列表
  async getSessions() {
    const response = await chatlogAPI.get('/api/v1/session')
    return {
      ...response,
      data: parseSessions(response.data)
    }
  },

  // 原始数据（用于导出）
  async getChatLogsRaw(params) {
    const response = await chatlogAPI.get('/api/v1/chatlog', { params })
    console.log('原始API响应:', response.data)
    return response
  },

  // 导出聊天记录
  exportChatLogs(params) {
    return chatlogAPI.get('/api/v1/chatlog', {
      params: {
        ...params,
        format: 'csv'
      }
    })
  },

  // ==================== AI API ====================
  
  // 开始分析
  async startAnalysis(data) {
    const response = await aiAPI.post(isDevelopment ? '/ai-api/analyze' : '/api/ai/analyze', data)
    return response.data
  },

  // 获取分析历史
  async getAnalysisHistory(params = {}) {
    const response = await aiAPI.get(isDevelopment ? '/ai-api/history' : '/api/ai/history', { params })
    return response.data
  },

  // 删除分析记录
  async deleteAnalysis(analysisId) {
    const response = await aiAPI.delete(isDevelopment ? `/ai-api/history/${analysisId}` : `/api/ai/history/${analysisId}`)
    return response.data
  },

  // 获取可用模型
  async getAvailableModels() {
    const response = await aiAPI.get(isDevelopment ? '/ai-api/models' : '/api/ai/models')
    return response.data
  },

  // 测试连接
  async testConnection() {
    const response = await aiAPI.get(isDevelopment ? '/ai-api/test' : '/api/ai/test')
    return response.data
  },

  // ==================== 多媒体资源 ====================
  
  // 多媒体内容URL生成
  getImageUrl(id) {
    return `${SERVICE_URLS.chatlog}/image/${id}`
  },
  
  getVideoUrl(id) {
    return `${SERVICE_URLS.chatlog}/video/${id}`
  },
  
  getFileUrl(id) {
    return `${SERVICE_URLS.chatlog}/file/${id}`
  },
  
  getVoiceUrl(id) {
    return `${SERVICE_URLS.chatlog}/voice/${id}`
  },
  
  getDataUrl(path) {
    return `${SERVICE_URLS.chatlog}/data/${path}`
  }
}