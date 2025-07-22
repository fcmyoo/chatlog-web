import axios from 'axios'

// 创建AI服务的axios实例
const aiClient = axios.create({
  baseURL: process.env.VUE_APP_AI_API_BASE || 'http://localhost:3001',
  timeout: 300000, // 5分钟超时，AI分析可能需要较长时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
aiClient.interceptors.request.use(
  (config) => {
    console.log('AI API请求:', config.method?.toUpperCase(), config.url, config.data)
    return config
  },
  (error) => {
    console.error('AI API请求拦截器错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
aiClient.interceptors.response.use(
  (response) => {
    console.log('AI API响应:', response.config.url, response.status)
    return response
  },
  (error) => {
    console.error('AI API请求失败:', error.config?.url, error.response?.status, error.message)
    
    // 统一错误处理
    if (error.code === 'ECONNABORTED') {
      error.message = 'AI分析超时，请重试或缩小分析范围'
    } else if (error.response?.status === 504) {
      error.message = 'AI服务超时，请稍后重试'
    } else if (error.response?.status >= 500) {
      error.message = 'AI服务异常，请稍后重试'
    }
    
    return Promise.reject(error)
  }
)

export const aiApi = {
  /**
   * 执行AI分析
   * @param {Object} params - 分析参数
   * @param {string} params.groupName - 群聊名称
   * @param {string} params.analysisType - 分析类型
   * @param {string} params.customPrompt - 自定义提示词
   * @param {string} params.timeRange - 时间范围
   */
  async performAnalysis(params) {
    return await aiClient.post('/api/ai/analysis', params)
  },

  /**
   * 获取分析历史列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.analysisType - 分析类型筛选
   * @param {string} params.groupName - 群聊名称筛选
   */
  async getAnalysisHistory(params) {
    return await aiClient.get('/api/ai/history', { params })
  },

  /**
   * 根据ID获取分析结果
   * @param {string} id - 分析记录ID
   */
  async getAnalysisById(id) {
    return await aiClient.get(`/api/ai/history/${id}`)
  },

  /**
   * 删除分析记录
   * @param {string} id - 分析记录ID
   */
  async deleteAnalysis(id) {
    return await aiClient.delete(`/api/ai/history/${id}`)
  },

  /**
   * 获取支持的分析类型
   */
  async getAnalysisTypes() {
    return await aiClient.get('/api/ai/analysis-types')
  },

  /**
   * 测试AI模型连接
   * @param {Object} params - 连接参数
   * @param {string} params.provider - 提供商
   * @param {string} params.model - 模型名称
   * @param {string} params.apiKey - API密钥
   */
  async testModelConnection(params) {
    return await aiClient.post('/api/ai/models/test', params)
  },

  /**
   * 获取当前模型配置
   */
  async getModelConfig() {
    return await aiClient.get('/api/ai/models/config')
  },

  /**
   * 更新模型配置
   * @param {Object} config - 新配置
   */
  async updateModelConfig(config) {
    return await aiClient.post('/api/ai/models/config', config)
  },

  /**
   * 获取定时任务配置
   */
  async getScheduleConfig() {
    return await aiClient.get('/api/ai/schedule/config')
  },

  /**
   * 更新定时任务配置
   * @param {Object} config - 定时任务配置
   */
  async updateScheduleConfig(config) {
    return await aiClient.post('/api/ai/schedule/config', config)
  },

  /**
   * 手动触发定时分析
   */
  async triggerScheduledAnalysis() {
    return await aiClient.post('/api/ai/schedule/trigger')
  },

  /**
   * 获取AI服务健康状态
   */
  async getHealthStatus() {
    return await aiClient.get('/health')
  }
}

export default aiApi