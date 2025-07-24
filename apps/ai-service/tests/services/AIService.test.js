const AIService = require('../../services/AIService');
const ConfigManager = require('../../config/ConfigManager');
const { ChatOpenAI } = require('@langchain/openai');
const { GoogleGenerativeAI } = require('@langchain/google-genai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

// 模拟外部依赖
jest.mock('../../config/ConfigManager');
jest.mock('@langchain/openai');
jest.mock('@langchain/google-genai');
jest.mock('@langchain/core/messages');

describe('AIService', () => {
  let aiService;
  let mockConfigManager;
  let mockChatOpenAI;
  let mockGoogleGenerativeAI;
  let mockHumanMessage;
  let mockSystemMessage;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();

    // 模拟ConfigManager
    mockConfigManager = {
      getModelConfig: jest.fn(),
      saveModelConfig: jest.fn(),
      getAISettings: jest.fn()
    };
    ConfigManager.mockImplementation(() => mockConfigManager);

    // 模拟LangChain消息类
    mockHumanMessage = { content: 'test human message' };
    mockSystemMessage = { content: 'test system message' };
    HumanMessage.mockImplementation((content) => ({ content }));
    SystemMessage.mockImplementation((content) => ({ content }));

    // 模拟AI模型
    mockChatOpenAI = {
      invoke: jest.fn()
    };
    mockGoogleGenerativeAI = {
      invoke: jest.fn()
    };

    ChatOpenAI.mockImplementation(() => mockChatOpenAI);
    GoogleGenerativeAI.mockImplementation(() => mockGoogleGenerativeAI);

    // 创建AIService实例
    aiService = new AIService();
  });

  describe('constructor', () => {
    it('应该正确初始化AIService实例', () => {
      expect(aiService.configManager).toBeDefined();
      expect(aiService.models).toBeInstanceOf(Map);
      expect(aiService.models.size).toBe(0);
    });
  });

  describe('getModel', () => {
    it('应该为DeepSeek创建并缓存模型实例', async () => {
      const provider = 'DeepSeek';
      const config = {
        model: 'deepseek-reasoner',
        apiKey: 'test-api-key',
        baseURL: 'https://api.deepseek.com/v1'
      };

      const model = await aiService.getModel(provider, config);

      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: 'deepseek-reasoner',
        openAIApiKey: 'test-api-key',
        configuration: {
          baseURL: 'https://api.deepseek.com/v1'
        },
        temperature: 1.0,
        maxTokens: 64000,
        timeout: 300000
      });

      expect(model).toBe(mockChatOpenAI);
      expect(aiService.models.has('DeepSeek-deepseek-reasoner')).toBe(true);
    });

    it('应该为Gemini创建并缓存模型实例', async () => {
      const provider = 'Gemini';
      const config = {
        model: 'gemini-2.5-pro',
        apiKey: 'test-gemini-key'
      };

      const model = await aiService.getModel(provider, config);

      expect(GoogleGenerativeAI).toHaveBeenCalledWith({
        apiKey: 'test-gemini-key',
        modelName: 'gemini-2.5-pro',
        maxOutputTokens: 32768,
        temperature: 1.0
      });

      expect(model).toBe(mockGoogleGenerativeAI);
      expect(aiService.models.has('Gemini-gemini-2.5-pro')).toBe(true);
    });

    it('应该使用默认模型名称', async () => {
      const provider = 'DeepSeek';
      const config = { apiKey: 'test-key' };

      await aiService.getModel(provider, config);

      expect(ChatOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          modelName: 'deepseek-reasoner'
        })
      );
    });

    it('应该从缓存返回已存在的模型实例', async () => {
      const provider = 'DeepSeek';
      const config = { model: 'deepseek-chat', apiKey: 'test-key' };

      // 第一次调用
      const model1 = await aiService.getModel(provider, config);
      // 第二次调用
      const model2 = await aiService.getModel(provider, config);

      expect(model1).toBe(model2);
      expect(ChatOpenAI).toHaveBeenCalledTimes(1);
    });

    it('应该抛出不支持提供商的错误', async () => {
      const provider = 'UnsupportedProvider';
      const config = { apiKey: 'test-key' };

      await expect(aiService.getModel(provider, config))
        .rejects
        .toThrow('不支持的AI提供商: UnsupportedProvider');
    });

    it('应该处理模型创建错误', async () => {
      const provider = 'DeepSeek';
      const config = { apiKey: 'test-key' };

      ChatOpenAI.mockImplementation(() => {
        throw new Error('模型创建失败');
      });

      await expect(aiService.getModel(provider, config))
        .rejects
        .toThrow('模型初始化失败: 模型创建失败');
    });
  });

  describe('callAI', () => {
    beforeEach(() => {
      mockConfigManager.getModelConfig.mockResolvedValue({
        provider: 'DeepSeek',
        config: {
          model: 'deepseek-reasoner',
          apiKey: 'test-key'
        }
      });
    });

    it('应该成功调用AI并返回响应', async () => {
      const prompt = '测试提示词';
      const systemPrompt = '系统提示词';
      const expectedResponse = 'AI响应内容';

      mockChatOpenAI.invoke.mockResolvedValue({
        content: expectedResponse
      });

      const result = await aiService.callAI(prompt, systemPrompt);

      expect(result).toBe(expectedResponse);
      expect(mockChatOpenAI.invoke).toHaveBeenCalledWith([
        { content: systemPrompt },
        { content: prompt }
      ]);
    });

    it('应该在失败时进行重试', async () => {
      const prompt = '测试提示词';
      const systemPrompt = '系统提示词';
      const error = new Error('ECONNRESET');

      mockChatOpenAI.invoke
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ content: '重试成功' });

      // 模拟延迟
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return 123;
      });

      const result = await aiService.callAI(prompt, systemPrompt);

      expect(result).toBe('重试成功');
      expect(mockChatOpenAI.invoke).toHaveBeenCalledTimes(3);
    });

    it('应该在达到最大重试次数后抛出增强错误', async () => {
      const prompt = '测试提示词';
      const systemPrompt = '系统提示词';
      const error = new Error('ECONNRESET');

      mockChatOpenAI.invoke.mockRejectedValue(error);

      // 模拟延迟
      jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callback();
        return 123;
      });

      await expect(aiService.callAI(prompt, systemPrompt))
        .rejects
        .toThrow();

      expect(mockChatOpenAI.invoke).toHaveBeenCalledTimes(4); // 初始调用 + 3次重试
    });

    it('应该在非可重试错误时立即失败', async () => {
      const prompt = '测试提示词';
      const systemPrompt = '系统提示词';
      const error = new Error('Invalid API key');

      mockChatOpenAI.invoke.mockRejectedValue(error);

      await expect(aiService.callAI(prompt, systemPrompt))
        .rejects
        .toThrow();

      expect(mockChatOpenAI.invoke).toHaveBeenCalledTimes(1);
    });
  });

  describe('isRetryableError', () => {
    it('应该识别可重试的网络错误', () => {
      const retryableErrors = [
        new Error('ECONNABORTED'),
        new Error('socket hang up'),
        new Error('ECONNRESET'),
        new Error('ETIMEDOUT'),
        new Error('timeout occurred'),
        new Error('rate limit exceeded'),
        new Error('server overloaded')
      ];

      retryableErrors.forEach(error => {
        expect(aiService.isRetryableError(error)).toBe(true);
      });
    });

    it('应该识别服务器错误状态码', () => {
      const serverError = new Error('Server Error');
      serverError.response = { status: 500 };

      const rateLimitError = new Error('Rate Limit');
      rateLimitError.response = { status: 429 };

      expect(aiService.isRetryableError(serverError)).toBe(true);
      expect(aiService.isRetryableError(rateLimitError)).toBe(true);
    });

    it('应该拒绝不可重试的错误', () => {
      const nonRetryableErrors = [
        new Error('Invalid API key'),
        new Error('Bad request'),
        { response: { status: 400 } },
        { response: { status: 401 } },
        { response: { status: 403 } }
      ];

      nonRetryableErrors.forEach(error => {
        expect(aiService.isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('enhanceError', () => {
    it('应该增强超时错误', () => {
      const error = new Error('timeout');
      const enhanced = aiService.enhanceError(error);

      expect(enhanced.message).toContain('分析超时');
      expect(enhanced.suggestions).toContain('建议缩小时间范围');
      expect(enhanced.originalError).toBe(error);
    });

    it('应该增强连接错误', () => {
      const error = new Error('socket hang up');
      const enhanced = aiService.enhanceError(error);

      expect(enhanced.message).toContain('AI服务连接中断');
      expect(enhanced.suggestions).toContain('🔄 系统已自动重试3次，建议稍等1-2分钟后再试');
    });

    it('应该增强认证错误', () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      const enhanced = aiService.enhanceError(error);

      expect(enhanced.message).toContain('API密钥无效');
      expect(enhanced.suggestions).toContain('请在设置中验证API密钥是否正确');
    });

    it('应该增强频率限制错误', () => {
      const error = new Error('Too Many Requests');
      error.response = { status: 429 };
      const enhanced = aiService.enhanceError(error);

      expect(enhanced.message).toContain('API调用频率超限');
      expect(enhanced.suggestions).toContain('建议等待一段时间后重试');
    });
  });

  describe('testConnection', () => {
    it('应该成功测试连接', async () => {
      const provider = 'DeepSeek';
      const config = { model: 'deepseek-chat', apiKey: 'test-key' };
      const mockResponse = { content: '连接测试响应' };

      mockChatOpenAI.invoke.mockResolvedValue(mockResponse);

      const result = await aiService.testConnection(provider, config);

      expect(result.success).toBe(true);
      expect(result.message).toBe('连接测试成功');
      expect(result.response).toBe('连接测试响应');
      expect(result.provider).toBe(provider);
      expect(result.model).toBe(config.model);
      expect(result.duration).toBeDefined();
    });

    it('应该处理连接测试失败', async () => {
      const provider = 'DeepSeek';
      const config = { model: 'deepseek-chat', apiKey: 'invalid-key' };
      const error = new Error('Unauthorized');
      error.response = { status: 401 };

      mockChatOpenAI.invoke.mockRejectedValue(error);

      const result = await aiService.testConnection(provider, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API密钥无效');
    });
  });

  describe('handleTestError', () => {
    it('应该处理401认证错误', () => {
      const error = { response: { status: 401 } };
      const result = aiService.handleTestError(error);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API密钥无效');
    });

    it('应该处理429频率限制错误', () => {
      const error = { response: { status: 429 } };
      const result = aiService.handleTestError(error);

      expect(result.success).toBe(false);
      expect(result.error).toContain('API调用频率超限');
    });

    it('应该处理连接超时错误', () => {
      const error = { code: 'ECONNABORTED' };
      const result = aiService.handleTestError(error);

      expect(result.success).toBe(false);
      expect(result.error).toContain('连接超时');
    });

    it('应该处理通用错误', () => {
      const error = new Error('Generic error');
      const result = aiService.handleTestError(error);

      expect(result.success).toBe(false);
      expect(result.error).toContain('连接失败: Generic error');
    });
  });

  describe('getCurrentConfig', () => {
    it('应该返回当前配置', async () => {
      const expectedConfig = {
        provider: 'DeepSeek',
        config: { model: 'deepseek-reasoner', apiKey: 'test-key' }
      };

      mockConfigManager.getModelConfig.mockResolvedValue(expectedConfig);

      const result = await aiService.getCurrentConfig();

      expect(result).toEqual(expectedConfig);
      expect(mockConfigManager.getModelConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateConfig', () => {
    it('应该成功更新配置并测试连接', async () => {
      const newConfig = {
        provider: 'DeepSeek',
        config: { model: 'deepseek-reasoner', apiKey: 'new-test-key' }
      };

      const savedConfig = { ...newConfig, updatedAt: '2023-01-01T00:00:00.000Z' };

      mockConfigManager.saveModelConfig.mockResolvedValue(savedConfig);
      mockChatOpenAI.invoke.mockResolvedValue({ content: '测试响应' });

      const result = await aiService.updateConfig(newConfig);

      expect(aiService.models.size).toBe(0); // 模型缓存应该被清除
      expect(mockConfigManager.saveModelConfig).toHaveBeenCalledWith(newConfig);
      expect(result.config).toEqual(savedConfig);
      expect(result.testResult.success).toBe(true);
    });

    it('应该在配置更新失败时抛出错误', async () => {
      const newConfig = {
        provider: 'DeepSeek',
        config: { model: 'deepseek-reasoner', apiKey: 'new-test-key' }
      };

      mockConfigManager.saveModelConfig.mockRejectedValue(new Error('保存失败'));

      await expect(aiService.updateConfig(newConfig))
        .rejects
        .toThrow('保存失败');
    });
  });

  describe('getAvailableModels', () => {
    it('应该返回可用的模型列表', () => {
      const models = aiService.getAvailableModels();

      expect(models).toHaveProperty('DeepSeek');
      expect(models).toHaveProperty('Gemini');
      expect(models.DeepSeek.models).toHaveLength(3);
      expect(models.Gemini.models).toHaveLength(2);
      
      // 验证DeepSeek模型
      expect(models.DeepSeek.models).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'deepseek-chat' }),
          expect.objectContaining({ id: 'deepseek-reasoner' }),
          expect.objectContaining({ id: 'deepseek-coder' })
        ])
      );

      // 验证Gemini模型
      expect(models.Gemini.models).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'gemini-2.5-pro' }),
          expect.objectContaining({ id: 'gemini-pro' })
        ])
      );
    });
  });

  describe('getModelStatus', () => {
    it('应该返回当前模型状态', async () => {
      const mockConfig = {
        provider: 'DeepSeek',
        config: {
          model: 'deepseek-reasoner',
          apiKey: 'test-key'
        }
      };

      mockConfigManager.getModelConfig.mockResolvedValue(mockConfig);

      // 添加一些模型到缓存
      await aiService.getModel('DeepSeek', { model: 'deepseek-chat', apiKey: 'test' });

      const status = await aiService.getModelStatus();

      expect(status.currentProvider).toBe('DeepSeek');
      expect(status.currentModel).toBe('deepseek-reasoner');
      expect(status.hasApiKey).toBe(true);
      expect(status.modelsLoaded).toBe(1);
      expect(status.availableProviders).toEqual(['DeepSeek', 'Gemini']);
    });

    it('应该正确处理没有API密钥的情况', async () => {
      const mockConfig = {
        provider: 'DeepSeek',
        config: {
          model: 'deepseek-reasoner',
          apiKey: ''
        }
      };

      mockConfigManager.getModelConfig.mockResolvedValue(mockConfig);

      const status = await aiService.getModelStatus();

      expect(status.hasApiKey).toBe(false);
    });
  });

  describe('边界条件和错误处理', () => {
    describe('callAI边界条件', () => {
      beforeEach(() => {
        mockConfigManager.getModelConfig.mockResolvedValue({
          provider: 'DeepSeek',
          config: { model: 'deepseek-reasoner', apiKey: 'test-key' }
        });
      });

      it('应该处理空提示词', async () => {
        const prompt = '';
        const systemPrompt = '系统提示词';

        mockChatOpenAI.invoke.mockResolvedValue({ content: '空提示词响应' });

        const result = await aiService.callAI(prompt, systemPrompt);

        expect(result).toBe('空提示词响应');
        expect(mockChatOpenAI.invoke).toHaveBeenCalledWith([
          { content: systemPrompt },
          { content: '' }
        ]);
      });

      it('应该处理空系统提示词', async () => {
        const prompt = '用户提示词';
        const systemPrompt = '';

        mockChatOpenAI.invoke.mockResolvedValue({ content: '空系统提示词响应' });

        const result = await aiService.callAI(prompt, systemPrompt);

        expect(result).toBe('空系统提示词响应');
        expect(mockChatOpenAI.invoke).toHaveBeenCalledWith([
          { content: '' },
          { content: prompt }
        ]);
      });

      it('应该处理非常长的提示词', async () => {
        const longPrompt = 'a'.repeat(100000);
        const systemPrompt = '系统提示词';

        mockChatOpenAI.invoke.mockResolvedValue({ content: '长提示词响应' });

        const result = await aiService.callAI(longPrompt, systemPrompt);

        expect(result).toBe('长提示词响应');
        expect(mockChatOpenAI.invoke).toHaveBeenCalledWith([
          { content: systemPrompt },
          { content: longPrompt }
        ]);
      });
    });

    describe('重试机制详细测试', () => {
      beforeEach(() => {
        mockConfigManager.getModelConfig.mockResolvedValue({
          provider: 'DeepSeek',
          config: { model: 'deepseek-reasoner', apiKey: 'test-key' }
        });

        // 模拟setTimeout
        jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
          callback();
          return 123;
        });
      });

      it('应该在第一次重试后成功', async () => {
        const prompt = '测试提示词';
        const systemPrompt = '系统提示词';
        const error = new Error('ECONNRESET');

        mockChatOpenAI.invoke
          .mockRejectedValueOnce(error)
          .mockResolvedValue({ content: '重试成功' });

        const result = await aiService.callAI(prompt, systemPrompt);

        expect(result).toBe('重试成功');
        expect(mockChatOpenAI.invoke).toHaveBeenCalledTimes(2);
      });

      it('应该正确计算重试延迟', async () => {
        const prompt = '测试提示词';
        const systemPrompt = '系统提示词';
        const error = new Error('socket hang up');

        mockChatOpenAI.invoke.mockRejectedValue(error);

        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

        try {
          await aiService.callAI(prompt, systemPrompt);
        } catch (e) {
          // 预期会失败
        }

        // 验证延迟时间：5000, 10000, 20000
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 20000);
      });
    });

    describe('错误增强详细测试', () => {
      it('应该处理ECONNABORTED错误', () => {
        const error = new Error('Request aborted');
        error.code = 'ECONNABORTED';

        const enhanced = aiService.enhanceError(error);

        expect(enhanced.message).toContain('分析超时');
        expect(enhanced.suggestions).toEqual([
          '建议缩小时间范围',
          '尝试分批次分析',
          '或稍后重试'
        ]);
      });

      it('应该处理未知错误', () => {
        const error = new Error('Unknown error');

        const enhanced = aiService.enhanceError(error);

        expect(enhanced.message).toBe('Unknown error');
        expect(enhanced.suggestions).toEqual([]);
        expect(enhanced.originalError).toBe(error);
      });

      it('应该处理没有message的错误', () => {
        const error = {};

        const enhanced = aiService.enhanceError(error);

        expect(enhanced.message).toBe('未知错误');
        expect(enhanced.originalError).toBe(error);
      });
    });
  });

  describe('性能和内存测试', () => {
    it('应该正确管理模型缓存', async () => {
      const provider = 'DeepSeek';
      const config1 = { model: 'deepseek-chat', apiKey: 'key1' };
      const config2 = { model: 'deepseek-reasoner', apiKey: 'key2' };

      // 创建两个不同的模型
      await aiService.getModel(provider, config1);
      await aiService.getModel(provider, config2);

      expect(aiService.models.size).toBe(2);
      expect(aiService.models.has('DeepSeek-deepseek-chat')).toBe(true);
      expect(aiService.models.has('DeepSeek-deepseek-reasoner')).toBe(true);
    });

    it('应该在updateConfig时清除模型缓存', async () => {
      const provider = 'DeepSeek';
      const config = { model: 'deepseek-chat', apiKey: 'key1' };

      // 先创建一个模型
      await aiService.getModel(provider, config);
      expect(aiService.models.size).toBe(1);

      // 更新配置
      const newConfig = {
        provider: 'Gemini',
        config: { model: 'gemini-pro', apiKey: 'new-key' }
      };

      mockConfigManager.saveModelConfig.mockResolvedValue(newConfig);
      mockGoogleGenerativeAI.invoke.mockResolvedValue({ content: '测试' });

      await aiService.updateConfig(newConfig);

      // 缓存应该被清除
      expect(aiService.models.size).toBe(0);
    });
  });

  describe('集成测试', () => {
    it('应该完整地执行AI调用流程', async () => {
      // 设置配置
      mockConfigManager.getModelConfig.mockResolvedValue({
        provider: 'DeepSeek',
        config: {
          model: 'deepseek-reasoner',
          apiKey: 'test-api-key',
          baseURL: 'https://api.deepseek.com/v1'
        }
      });

      // 设置AI响应
      mockChatOpenAI.invoke.mockResolvedValue({
        content: '这是一个完整的AI响应'
      });

      const prompt = '请分析这段对话';
      const systemPrompt = '你是一个专业的对话分析师';

      const result = await aiService.callAI(prompt, systemPrompt);

      expect(result).toBe('这是一个完整的AI响应');
      expect(mockConfigManager.getModelConfig).toHaveBeenCalled();
      expect(ChatOpenAI).toHaveBeenCalledWith({
        modelName: 'deepseek-reasoner',
        openAIApiKey: 'test-api-key',
        configuration: {
          baseURL: 'https://api.deepseek.com/v1'
        },
        temperature: 1.0,
        maxTokens: 64000,
        timeout: 300000
      });
      expect(mockChatOpenAI.invoke).toHaveBeenCalledWith([
        { content: systemPrompt },
        { content: prompt }
      ]);
    });

    it('应该完整地执行配置更新和测试流程', async () => {
      const newConfig = {
        provider: 'Gemini',
        config: {
          model: 'gemini-2.5-pro',
          apiKey: 'new-test-key'
        }
      };

      mockConfigManager.saveModelConfig.mockResolvedValue(newConfig);
      mockGoogleGenerativeAI.invoke.mockResolvedValue({ content: 'Gemini响应' });

      const result = await aiService.updateConfig(newConfig);

      expect(result.config).toEqual(newConfig);
      expect(mockConfigManager.saveModelConfig).toHaveBeenCalledWith(newConfig);
      expect(mockGoogleGenerativeAI.invoke).toHaveBeenCalledWith([
        { content: '测试连接' }
      ]);
    });
  });
});