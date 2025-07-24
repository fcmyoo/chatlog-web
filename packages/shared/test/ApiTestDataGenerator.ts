/**
 * API测试数据生成器
 * 为前端和后端API测试提供统一的数据生成功能
 */
export class ApiTestDataGenerator {
  /**
   * 生成聊天消息API数据
   * @param overrides - 覆盖的属性
   * @returns 聊天消息对象
   */
  static generateChatMessage(overrides: any = {}) {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: '这是一条测试消息',
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text',
      metadata: {
        platform: 'web',
        userAgent: 'test-agent',
        sessionId: `session_${Date.now()}`
      },
      ...overrides
    }
  }

  /**
   * 生成批量聊天消息
   * @param count - 消息数量
   * @param baseOverrides - 基础覆盖属性
   * @returns 聊天消息数组
   */
  static generateChatMessages(count: number = 5, baseOverrides: any = {}) {
    return Array.from({ length: count }, (_, index) => 
      this.generateChatMessage({
        id: `msg_${Date.now()}_${index}`,
        content: `测试消息 ${index + 1}`,
        sender: index % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date(Date.now() - (count - index) * 60000).toISOString(),
        ...baseOverrides
      })
    )
  }

  /**
   * 生成AI分析结果API数据
   * @param overrides - 覆盖的属性
   * @returns AI分析结果对象
   */
  static generateAnalysisResult(overrides: any = {}) {
    return {
      id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      summary: '这是一个测试分析摘要，包含了聊天内容的主要信息。',
      sentiment: 'positive',
      confidence: 0.85,
      keywords: ['测试', '分析', '聊天', '数据'],
      topics: ['技术讨论', '产品开发', '用户体验'],
      statistics: {
        messageCount: 10,
        wordCount: 150,
        averageMessageLength: 15,
        participantCount: 2,
        timeSpan: '2小时30分钟'
      },
      insights: [
        '用户对产品功能表现出积极态度',
        '讨论主要集中在技术实现细节',
        '存在一些用户体验改进建议'
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'completed',
      ...overrides
    }
  }

  /**
   * 生成用户API数据
   * @param overrides - 覆盖的属性
   * @returns 用户对象
   */
  static generateUser(overrides: any = {}) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      id: userId,
      username: `testuser_${userId.slice(-6)}`,
      email: `test_${userId.slice(-6)}@example.com`,
      displayName: '测试用户',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      role: 'user',
      status: 'active',
      preferences: {
        language: 'zh-CN',
        theme: 'light',
        notifications: true
      },
      metadata: {
        lastLogin: new Date().toISOString(),
        loginCount: Math.floor(Math.random() * 100) + 1,
        registrationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    }
  }

  /**
   * 生成会话API数据
   * @param overrides - 覆盖的属性
   * @returns 会话对象
   */
  static generateSession(overrides: any = {}) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      id: sessionId,
      title: '测试聊天会话',
      description: '这是一个用于测试的聊天会话',
      participants: [
        this.generateUser({ role: 'user' }),
        this.generateUser({ role: 'assistant', username: 'ai_assistant' })
      ],
      messageCount: Math.floor(Math.random() * 50) + 1,
      status: 'active',
      type: 'chat',
      tags: ['测试', '开发', 'API'],
      metadata: {
        platform: 'web',
        source: 'test',
        version: '1.0.0'
      },
      settings: {
        isPrivate: false,
        allowAnalysis: true,
        retentionDays: 30
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ...overrides
    }
  }

  /**
   * 生成API响应包装器
   * @param data - 响应数据
   * @param status - HTTP状态码
   * @param message - 响应消息
   * @returns API响应对象
   */
  static generateApiResponse(data: any, status: number = 200, message: string = 'Success') {
    return {
      success: status >= 200 && status < 300,
      status,
      message,
      data,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      meta: {
        version: '1.0.0',
        rateLimit: {
          remaining: 100,
          reset: Date.now() + 3600000
        }
      }
    }
  }

  /**
   * 生成API错误响应
   * @param message - 错误消息
   * @param status - HTTP状态码
   * @param code - 错误代码
   * @returns API错误响应对象
   */
  static generateApiError(message: string = '测试错误', status: number = 500, code: string = 'TEST_ERROR') {
    return {
      success: false,
      status,
      message,
      error: {
        code,
        details: `这是一个测试错误: ${message}`,
        timestamp: new Date().toISOString(),
        trace: `Error at test:${Math.floor(Math.random() * 100)}`
      },
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  /**
   * 生成分页响应数据
   * @param items - 数据项数组
   * @param page - 当前页码
   * @param pageSize - 每页大小
   * @param total - 总数量
   * @returns 分页响应对象
   */
  static generatePaginatedResponse(items: any[], page: number = 1, pageSize: number = 10, total?: number) {
    const totalItems = total || items.length
    const totalPages = Math.ceil(totalItems / pageSize)
    
    return this.generateApiResponse({
      items,
      pagination: {
        page,
        pageSize,
        total: totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    })
  }

  /**
   * 生成文件上传响应
   * @param overrides - 覆盖的属性
   * @returns 文件上传响应对象
   */
  static generateFileUploadResponse(overrides: any = {}) {
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return this.generateApiResponse({
      file: {
        id: fileId,
        name: 'test-file.txt',
        originalName: 'test-file.txt',
        mimeType: 'text/plain',
        size: 1024,
        url: `https://example.com/files/${fileId}`,
        thumbnailUrl: `https://example.com/thumbnails/${fileId}`,
        uploadedAt: new Date().toISOString(),
        ...overrides
      }
    })
  }

  /**
   * 生成搜索结果响应
   * @param query - 搜索查询
   * @param results - 搜索结果
   * @param overrides - 覆盖的属性
   * @returns 搜索响应对象
   */
  static generateSearchResponse(query: string = '测试查询', results: any[] = [], overrides: any = {}) {
    return this.generateApiResponse({
      query,
      results,
      searchMeta: {
        totalResults: results.length,
        searchTime: Math.random() * 100,
        suggestions: ['测试建议1', '测试建议2'],
        filters: {
          applied: [],
          available: ['类型', '日期', '用户']
        }
      },
      ...overrides
    })
  }

  /**
   * 生成批量操作响应
   * @param operations - 操作结果数组
   * @param overrides - 覆盖的属性
   * @returns 批量操作响应对象
   */
  static generateBatchResponse(operations: any[] = [], overrides: any = {}) {
    const successful = operations.filter(op => op.success).length
    const failed = operations.length - successful
    
    return this.generateApiResponse({
      operations,
      summary: {
        total: operations.length,
        successful,
        failed,
        successRate: operations.length > 0 ? (successful / operations.length) * 100 : 0
      },
      ...overrides
    })
  }
}

export default ApiTestDataGenerator