import axios from 'axios'

// 根据环境选择API基础地址
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'http://127.0.0.1:5030' 
  : '' // 开发环境使用代理

// CSV解析工具函数
const parseCSV = (csvText) => {
  // 类型检查
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
  // 类型检查
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
  // 类型检查和数据转换
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

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 在发送请求之前做些什么
    console.log('API请求:', config.method?.toUpperCase(), config.url, config.params)
    
    // 只对有请求体的方法设置Content-Type
    if (['post', 'put', 'patch'].includes(config.method?.toLowerCase())) {
      config.headers['Content-Type'] = 'application/json'
    }
    
    return config
  },
  (error) => {
    // 对请求错误做些什么
    console.error('API请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 对响应数据做点什么
    console.log('API响应:', response.config.url, response.status)
    console.log('响应数据类型:', typeof response.data)
    console.log('响应数据前100字符:', String(response.data).substring(0, 100))
    return response
  },
  (error) => {
    // 对响应错误做点什么
    console.error('API 请求失败:', error.config?.url, error.response?.status, error.message)
    return Promise.reject(error)
  }
)

export default {
  // 聊天记录查询
  async getChatLogs(params) {
    const response = await api.get('/api/v1/chatlog', { params })
    return {
      ...response,
      data: parseChatLogs(response.data)
    }
  },
  
  // 联系人列表
  async getContacts() {
    const response = await api.get('/api/v1/contact')
    return {
      ...response,
      data: parseCSV(response.data)
    }
  },
  
  // 群聊列表
  async getChatrooms() {
    const response = await api.get('/api/v1/chatroom')
    return {
      ...response,
      data: parseCSV(response.data)
    }
  },
  
  // 会话列表
  async getSessions() {
    const response = await api.get('/api/v1/session')
    return {
      ...response,
      data: parseSessions(response.data)
    }
  },
  
  // 多媒体内容
  getImageUrl(id) {
    const base = process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:5030' : ''
    return `${base}/image/${id}`
  },
  
  getVideoUrl(id) {
    const base = process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:5030' : ''
    return `${base}/video/${id}`
  },
  
  getFileUrl(id) {
    const base = process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:5030' : ''
    return `${base}/file/${id}`
  },
  
  getVoiceUrl(id) {
    const base = process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:5030' : ''
    return `${base}/voice/${id}`
  },
  
  getDataUrl(path) {
    const base = process.env.NODE_ENV === 'production' ? 'http://127.0.0.1:5030' : ''
    return `${base}/data/${path}`
  },
  
  // 导出聊天记录
  exportChatLogs(params) {
    // 移除blob响应类型，让API直接返回文本
    return api.get('/api/v1/chatlog', {
      params: {
        ...params,
        format: 'csv'
      }
    })
  },
  
  // 原始数据（用于导出）
  async getChatLogsRaw(params) {
    const response = await api.get('/api/v1/chatlog', { params })
    console.log('原始API响应:', response.data)
    return response
  }
} 