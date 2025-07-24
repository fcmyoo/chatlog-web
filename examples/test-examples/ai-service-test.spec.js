const AIServiceFixtures = require('../../apps/ai-service/tests/fixtures/AIServiceFixtures')
const TestDataFactory = require('../../apps/ai-service/tests/factories/TestDataFactory')
const DatabaseTestFixtures = require('../../packages/shared/test/DatabaseTestFixtures')

/**
 * AI服务测试示例
 * 展示如何使用AIServiceFixtures和DatabaseTestFixtures进行后端服务测试
 */
describe('AI服务测试示例', () => {
  let aiFixtures
  let dbFixtures

  beforeEach(async () => {
    aiFixtures = new AIServiceFixtures()
    dbFixtures = new DatabaseTestFixtures()
    await dbFixtures.initialize()
  })

  afterEach(async () => {
    await aiFixtures.cleanup()
    await dbFixtures.cleanup()
  })

  describe('聊天分析功能', () => {
    it('应该成功分析聊天内容', async () => {
      // 1. 设置模拟AI适配器
      const mockAdapter = aiFixtures.setupMockAdapter('openai', {
        generateResponse: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            summary: '这是一个关于产品开发的讨论',
            sentiment: 'positive',
            keywords: ['产品', '开发', '功能', '用户体验'],
            topics: ['产品规划', '技术实现']
          }),
          usage: { tokens: 150 }
        })
      })

      // 2. 生成测试聊天数据
      const chatData = await aiFixtures.setupChatDataFixture(10)

      // 3. 创建数据库集合并插入数据
      const chatsCollection = dbFixtures.createMockCollection('chats')
      const chatRecord = {
        _id: 'chat_123',
        title: '产品开发讨论',
        messages: chatData,
        createdAt: new Date()
      }
      await chatsCollection.insertOne(chatRecord)

      // 4. 模拟AI服务分析逻辑
      const mockAIService = {
        async analyzeChat(chatId) {
          const chat = await chatsCollection.findOne({ _id: chatId })
          if (!chat) throw new Error('聊天记录不存在')

          const response = await mockAdapter.generateResponse({
            messages: chat.messages,
            prompt: '请分析这段聊天内容'
          })

          return JSON.parse(response.content)
        }
      }

      // 5. 执行分析
      const result = await mockAIService.analyzeChat('chat_123')

      // 6. 验证结果
      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('sentiment', 'positive')
      expect(result).toHaveProperty('keywords')
      expect(result.keywords).toContain('产品')
      expect(result.keywords).toContain('开发')
      expect(mockAdapter.generateResponse).toHaveBeenCalledTimes(1)
    })

    it('应该处理AI适配器错误', async () => {
      // 设置失败的模拟适配器
      const mockAdapter = aiFixtures.setupMockAdapter('openai', {
        generateResponse: jest.fn().mockRejectedValue(new Error('API调用失败'))
      })

      const chatData = TestDataFactory.generateChatData(5)

      const mockAIService = {
        async analyzeChat(messages) {
          try {
            const response = await mockAdapter.generateResponse({
              messages,
              prompt: '请分析这段聊天内容'
            })
            return JSON.parse(response.content)
          } catch (error) {
            throw new Error(`分析失败: ${error.message}`)
          }
        }
      }

      // 验证错误处理
      await expect(mockAIService.analyzeChat(chatData))
        .rejects.toThrow('分析失败: API调用失败')
      
      expect(mockAdapter.generateResponse).toHaveBeenCalledTimes(1)
    })

    it('应该支持不同的AI提供商', async () => {
      const providers = ['openai', 'baidu', 'alibaba']
      
      for (const provider of providers) {
        // 为每个提供商设置不同的模拟响应
        const mockAdapter = aiFixtures.setupMockAdapter(provider, {
          generateResponse: jest.fn().mockResolvedValue({
            content: JSON.stringify({
              summary: `${provider}提供商的分析结果`,
              sentiment: 'neutral',
              provider: provider
            }),
            usage: { tokens: 100 }
          })
        })

        const chatData = TestDataFactory.generateChatData(3)

        const mockAIService = {
          async analyzeWithProvider(messages, providerName) {
            const adapter = aiFixtures.getMockAdapter(providerName)
            const response = await adapter.generateResponse({
              messages,
              prompt: '分析聊天内容'
            })
            return JSON.parse(response.content)
          }
        }

        const result = await mockAIService.analyzeWithProvider(chatData, provider)
        
        expect(result.summary).toContain(provider)
        expect(result.provider).toBe(provider)
      }
    })
  })

  describe('数据持久化功能', () => {
    it('应该正确保存分析结果', async () => {
      // 创建分析结果集合
      const analysisCollection = dbFixtures.createMockCollection('analysis_results')
      
      // 生成测试分析数据
      const analysisData = TestDataFactory.generateAnalysisResult({
        chatId: 'chat_456',
        summary: '用户对新功能表现出积极态度',
        sentiment: 'positive'
      })

      // 保存分析结果
      const insertResult = await analysisCollection.insertOne(analysisData)
      expect(insertResult.acknowledged).toBe(true)

      // 验证数据被正确保存
      const savedAnalysis = await analysisCollection.findOne({ 
        _id: insertResult.insertedId 
      })
      
      expect(savedAnalysis).toBeTruthy()
      expect(savedAnalysis.chatId).toBe('chat_456')
      expect(savedAnalysis.sentiment).toBe('positive')
      expect(savedAnalysis.summary).toContain('积极态度')
    })

    it('应该支持批量操作', async () => {
      const analysisCollection = dbFixtures.createMockCollection('analysis_results')
      
      // 生成多个分析结果
      const analysisResults = Array.from({ length: 5 }, (_, index) => 
        TestDataFactory.generateAnalysisResult({
          chatId: `chat_${index + 1}`,
          summary: `分析结果 ${index + 1}`
        })
      )

      // 批量插入
      const insertResult = await analysisCollection.insertMany(analysisResults)
      expect(insertResult.insertedIds).toHaveLength(5)

      // 批量查询
      const allResults = await analysisCollection.find({}).toArray()
      expect(allResults).toHaveLength(5)

      // 批量更新
      const updateResult = await analysisCollection.updateMany(
        {},
        { $set: { processed: true, updatedAt: new Date() } }
      )
      expect(updateResult.modifiedCount).toBe(5)

      // 验证更新结果
      const updatedResults = await analysisCollection.find({ 
        processed: true 
      }).toArray()
      expect(updatedResults).toHaveLength(5)
    })

    it('应该支持复杂查询', async () => {
      const analysisCollection = dbFixtures.createMockCollection('analysis_results')
      
      // 插入不同情感的分析结果
      const sentiments = ['positive', 'negative', 'neutral']
      const analysisResults = sentiments.map(sentiment => 
        TestDataFactory.generateAnalysisResult({ sentiment })
      )
      
      await analysisCollection.insertMany(analysisResults)

      // 查询积极情感的结果
      const positiveResults = await analysisCollection.find({ 
        sentiment: 'positive' 
      }).toArray()
      expect(positiveResults).toHaveLength(1)
      expect(positiveResults[0].sentiment).toBe('positive')

      // 统计不同情感的数量
      const totalCount = await analysisCollection.countDocuments({})
      expect(totalCount).toBe(3)

      const positiveCount = await analysisCollection.countDocuments({ 
        sentiment: 'positive' 
      })
      expect(positiveCount).toBe(1)
    })
  })

  describe('API端点测试', () => {
    it('应该正确处理分析请求', async () => {
      // 设置测试配置
      const testConfig = aiFixtures.setupTestConfig('api', {
        openai: {
          apiKey: 'test-key',
          model: 'gpt-3.5-turbo'
        }
      })

      // 模拟Express请求和响应
      const mockReq = global.testUtils.createMockReq({
        body: {
          chatId: 'chat_789',
          options: {
            includeKeywords: true,
            includeSentiment: true
          }
        },
        headers: {
          'authorization': 'Bearer test-token'
        }
      })

      const mockRes = global.testUtils.createMockRes()
      const mockNext = global.testUtils.createMockNext()

      // 设置数据库数据
      const chatsCollection = dbFixtures.createMockCollection('chats')
      const chatData = TestDataFactory.generateChatData(8)
      await chatsCollection.insertOne({
        _id: 'chat_789',
        messages: chatData
      })

      // 设置AI适配器
      const mockAdapter = aiFixtures.setupMockAdapter('openai', {
        generateResponse: jest.fn().mockResolvedValue({
          content: JSON.stringify({
            summary: 'API测试分析结果',
            sentiment: 'positive',
            keywords: ['API', '测试', '成功']
          }),
          usage: { tokens: 120 }
        })
      })

      // 模拟API控制器
      const mockController = {
        async analyzeChat(req, res, next) {
          try {
            const { chatId, options } = req.body
            
            // 获取聊天数据
            const chat = await chatsCollection.findOne({ _id: chatId })
            if (!chat) {
              return res.status(404).json({ error: '聊天记录不存在' })
            }

            // 调用AI分析
            const response = await mockAdapter.generateResponse({
              messages: chat.messages,
              prompt: '请分析这段聊天内容'
            })

            const analysis = JSON.parse(response.content)
            
            // 返回结果
            res.status(200).json({
              success: true,
              data: analysis,
              usage: response.usage
            })
          } catch (error) {
            next(error)
          }
        }
      }

      // 执行API调用
      await mockController.analyzeChat(mockReq, mockRes, mockNext)

      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          summary: 'API测试分析结果',
          sentiment: 'positive',
          keywords: ['API', '测试', '成功']
        },
        usage: { tokens: 120 }
      })
    })

    it('应该处理无效请求', async () => {
      const mockReq = global.testUtils.createMockReq({
        body: {} // 缺少必需的chatId
      })

      const mockRes = global.testUtils.createMockRes()

      const mockController = {
        async analyzeChat(req, res) {
          const { chatId } = req.body
          
          if (!chatId) {
            return res.status(400).json({ 
              error: '缺少必需的参数: chatId' 
            })
          }
          
          // 其他逻辑...
        }
      }

      await mockController.analyzeChat(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: '缺少必需的参数: chatId'
      })
    })
  })

  describe('性能和并发测试', () => {
    it('应该处理并发分析请求', async () => {
      // 设置多个模拟适配器
      const mockAdapter = aiFixtures.setupMockAdapter('openai', {
        generateResponse: jest.fn().mockImplementation(async () => {
          // 模拟API延迟
          await new Promise(resolve => setTimeout(resolve, 100))
          return {
            content: JSON.stringify({
              summary: '并发测试分析结果',
              sentiment: 'neutral'
            }),
            usage: { tokens: 80 }
          }
        })
      })

      // 创建多个并发分析任务
      const concurrentTasks = Array.from({ length: 5 }, async (_, index) => {
        const chatData = TestDataFactory.generateChatData(5)
        const response = await mockAdapter.generateResponse({
          messages: chatData,
          prompt: `并发分析任务 ${index + 1}`
        })
        return JSON.parse(response.content)
      })

      // 执行并发任务
      const results = await Promise.all(concurrentTasks)

      // 验证所有任务都成功完成
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toHaveProperty('summary')
        expect(result).toHaveProperty('sentiment', 'neutral')
      })

      // 验证适配器被调用了正确的次数
      expect(mockAdapter.generateResponse).toHaveBeenCalledTimes(5)
    })

    it('应该正确处理大量数据', async () => {
      // 生成大量聊天数据
      const largeChatData = TestDataFactory.generateChatData(100)
      
      const chatsCollection = dbFixtures.createMockCollection('large_chats')
      await chatsCollection.insertOne({
        _id: 'large_chat',
        messages: largeChatData
      })

      // 验证数据插入成功
      const chat = await chatsCollection.findOne({ _id: 'large_chat' })
      expect(chat.messages).toHaveLength(100)

      // 模拟分页查询
      const pageSize = 20
      const page1 = await chatsCollection.find({})
        .skip(0)
        .limit(pageSize)
        .toArray()
      
      expect(page1).toHaveLength(1) // 只有一个聊天记录
      expect(page1[0].messages).toHaveLength(100)
    })
  })
})