/**
 * 统一服务配置管理
 * 集中管理所有服务地址和端口配置
 */

// 环境检测
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

// 服务配置
const services = {
  // Chatlog API 服务
  chatlog: {
    host: process.env.CHATLOG_HOST || '127.0.0.1',
    port: process.env.CHATLOG_PORT || 5030,
    protocol: process.env.CHATLOG_PROTOCOL || 'http',
    get baseURL() {
      return `${this.protocol}://${this.host}:${this.port}`
    },
    get apiPath() {
      return `${this.baseURL}/api/v1`
    }
  },

  // AI 分析服务
  ai: {
    host: process.env.AI_HOST || 'localhost',
    port: process.env.AI_PORT || 3001,
    protocol: process.env.AI_PROTOCOL || 'http',
    get baseURL() {
      return `${this.protocol}://${this.host}:${this.port}`
    },
    get apiPath() {
      return `${this.baseURL}/api/ai`
    }
  },

  // 前端服务
  frontend: {
    host: process.env.FRONTEND_HOST || 'localhost',
    port: process.env.FRONTEND_PORT || 8080,
    protocol: process.env.FRONTEND_PROTOCOL || 'http',
    get baseURL() {
      return `${this.protocol}://${this.host}:${this.port}`
    }
  }
}

// 代理配置（用于Vue开发服务器）
const proxyConfig = {
  '/api': {
    target: services.chatlog.baseURL,
    changeOrigin: true,
    ws: true, // 支持WebSocket
    pathRewrite: {
      '^/api': '/api'
    }
  },
  '/ai-api': {
    target: services.ai.baseURL,
    changeOrigin: true,
    ws: true, // 支持WebSocket
    pathRewrite: {
      '^/ai-api': '/api/ai'
    }
  },
  '/image': {
    target: services.chatlog.baseURL,
    changeOrigin: true,
    pathRewrite: {
      '^/image': '/image'
    }
  },
  '/video': {
    target: services.chatlog.baseURL,
    changeOrigin: true,
    pathRewrite: {
      '^/video': '/video'
    }
  },
  '/voice': {
    target: services.chatlog.baseURL,
    changeOrigin: true,
    pathRewrite: {
      '^/voice': '/voice'
    }
  },
  '/file': {
    target: services.chatlog.baseURL,
    changeOrigin: true,
    pathRewrite: {
      '^/file': '/file'
    }
  },
  '/data': {
    target: services.chatlog.baseURL,
    changeOrigin: true,
    pathRewrite: {
      '^/data': '/data'
    }
  }
}

// 工具函数
const getServiceUrl = (serviceName) => {
  const service = services[serviceName]
  if (!service) {
    throw new Error(`未知的服务: ${serviceName}`)
  }
  return service.baseURL
}

const getApiUrl = (serviceName) => {
  const service = services[serviceName]
  if (!service) {
    throw new Error(`未知的服务: ${serviceName}`)
  }
  return service.apiPath || service.baseURL
}

// 检查服务连接状态
const checkServiceHealth = async (serviceName) => {
  const axios = require('axios')
  const service = services[serviceName]
  
  try {
    const response = await axios.get(`${service.baseURL}/health`, { 
      timeout: 5000 
    })
    return { status: 'healthy', response: response.status }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message,
      code: error.code 
    }
  }
}

// 导出配置
module.exports = {
  services,
  proxyConfig,
  getServiceUrl,
  getApiUrl,
  checkServiceHealth,
  isDevelopment,
  isProduction,
  isTest
}

// ES6 模块支持
if (typeof module === 'undefined') {
  window.ServiceConfig = {
    services,
    getServiceUrl,
    getApiUrl,
    isDevelopment,
    isProduction,
    isTest
  }
}