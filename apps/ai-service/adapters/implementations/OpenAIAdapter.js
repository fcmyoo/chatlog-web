const BaseAdapter = require('../base/BaseAdapter');
const { Message, ChatOptions, StreamOptions, ChatResponse, ChatChunk, ModelCapabilities } = require('../interfaces/AIModelAdapter');
const axios = require('axios');

/**
 * OpenAI适配器实现
 * 支持GPT-4、GPT-3.5-turbo等模型
 */
class OpenAIAdapter extends BaseAdapter {
  constructor(provider, model, config = {}) {
    super(provider, model, config);
    
    this.apiClient = null;
    this.supportedModels = [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k'
    ];
  }

  /**
   * 初始化OpenAI适配器
   */
  async initialize() {
    await super.initialize();
    
    this.apiClient = axios.create({
      baseURL: this.config.endpoint || 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ChatlogWeb-AI-Service/1.0.0'
      },
      timeout: this.config.timeout || 30000
    });

    // 添加请求拦截器
    this.apiClient.interceptors.request.use(
      (config) => {
        this.emit('requestStart', {
          url: config.url,
          method: config.method,
          timestamp: new Date().toISOString()
        });
        return config;
      },
      (error) => {
        this.emit('requestError', { error: error.message });
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    this.apiClient.interceptors.response.use(
      (response) => {
        this.emit('requestSuccess', {
          status: response.status,
          timestamp: new Date().toISOString()
        });
        return response;
      },
      (error) => {
        this.emit('requestError', {
          status: error.response?.status,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        return Promise.reject(error);
      }
    );

    console.log(`✅ OpenAI适配器初始化完成: ${this.model}`);
  }

  /**
   * 发送聊天请求
   */
  async chat(messages, options = new ChatOptions()) {
    if (!this.checkCircuitBreaker()) {
      throw new Error('熔断器开启，请求被拒绝');
    }

    if (!this.checkRateLimit(options.maxTokens)) {
      throw new Error('超出速率限制');
    }

    const processedMessages = this.preprocessMessages(messages);
    const startTime = Date.now();

    return await this.withRetry(async () => {
      const requestBody = this.buildChatRequest(processedMessages, options);
      
      const response = await this.apiClient.post('/chat/completions', requestBody);
      
      const chatResponse = this.parseChatResponse(response.data, startTime);
      
      return this.postprocessResponse(
        chatResponse, 
        startTime, 
        response.data.usage?.total_tokens || 0
      );
    });
  }

  /**
   * 发送流式聊天请求
   */
  async* stream(messages, options = new StreamOptions()) {
    if (!this.checkCircuitBreaker()) {
      throw new Error('熔断器开启，请求被拒绝');
    }

    if (!this.checkRateLimit(options.maxTokens)) {
      throw new Error('超出速率限制');
    }

    const processedMessages = this.preprocessMessages(messages);
    const startTime = Date.now();
    let totalTokens = 0;

    try {
      const requestBody = this.buildChatRequest(processedMessages, options, true);
      
      const response = await this.apiClient.post('/chat/completions', requestBody, {
        responseType: 'stream'
      });

      let buffer = '';
      let content = '';

      for await (const chunk of response.data) {
        buffer += chunk.toString();
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              yield new ChatChunk('', true, {
                totalTokens,
                duration: Date.now() - startTime
              });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.content) {
                content += delta.content;
                totalTokens += this.estimateTokens(delta.content);
                
                yield new ChatChunk(delta.content, false, {
                  totalContent: content,
                  estimatedTokens: totalTokens
                });
              }
            } catch (error) {
              console.warn('解析流式响应失败:', error.message);
            }
          }
        }
      }

      this.recordSuccess();
      this.recordRequest(totalTokens);

    } catch (error) {
      this.recordFailure();
      throw this.enhanceError(error);
    }
  }

  /**
   * 构建聊天请求
   */
  buildChatRequest(messages, options, stream = false) {
    const requestBody = {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: options.maxTokens || this.config.maxTokens || 4096,
      temperature: options.temperature ?? this.config.temperature ?? 0.7,
      top_p: options.topP ?? 1.0,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stream
    };

    if (options.stop && options.stop.length > 0) {
      requestBody.stop = options.stop;
    }

    return requestBody;
  }

  /**
   * 解析聊天响应
   */
  parseChatResponse(data, startTime) {
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('无效的响应格式');
    }

    const content = choice.message?.content || '';
    const usage = data.usage || {};

    return new ChatResponse(content, {
      model: data.model,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0
      },
      finishReason: choice.finish_reason,
      duration: Date.now() - startTime
    });
  }

  /**
   * 估算令牌数量
   */
  estimateTokens(text) {
    // 简单的令牌估算：英文约4字符/令牌，中文约1.5字符/令牌
    const englishChars = (text.match(/[a-zA-Z0-9\s]/g) || []).length;
    const chineseChars = text.length - englishChars;
    
    return Math.ceil(englishChars / 4 + chineseChars / 1.5);
  }

  /**
   * 增强错误信息
   */
  enhanceError(error) {
    let errorMessage = error.message || '未知错误';
    let suggestions = [];

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 401:
          errorMessage = 'API密钥无效或已过期';
          suggestions = ['请检查API密钥是否正确', '确认API密钥是否有足够的权限'];
          break;

        case 429:
          errorMessage = 'API调用频率超限';
          suggestions = ['请稍后重试', '考虑升级API计划', '检查速率限制配置'];
          break;

        case 400:
          if (data?.error?.code === 'context_length_exceeded') {
            errorMessage = '输入内容超出模型上下文长度限制';
            suggestions = ['减少输入内容长度', '使用支持更长上下文的模型'];
          } else {
            errorMessage = `请求参数错误: ${data?.error?.message || '未知错误'}`;
            suggestions = ['检查请求参数是否正确'];
          }
          break;

        case 500:
        case 502:
        case 503:
          errorMessage = 'OpenAI服务器错误，请稍后重试';
          suggestions = ['稍后重试', '检查OpenAI服务状态'];
          break;

        default:
          errorMessage = `API请求失败 (${status}): ${data?.error?.message || errorMessage}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = '请求超时';
      suggestions = ['增加超时时间', '检查网络连接', '稍后重试'];
    }

    const enhancedError = new Error(errorMessage);
    enhancedError.suggestions = suggestions;
    enhancedError.originalError = error;
    enhancedError.provider = this.provider;
    enhancedError.model = this.model;

    return enhancedError;
  }

  /**
   * 获取模型能力
   */
  getCapabilities() {
    const baseCapabilities = {
      maxTokens: this.getModelMaxTokens(),
      supportsStreaming: true,
      supportsImages: this.model.includes('gpt-4') && !this.model.includes('turbo'),
      supportsFunctionCalling: true,
      contextWindow: this.getModelContextWindow(),
      costPer1kTokens: this.getModelCost(),
      languages: ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'pt', 'ru']
    };

    return new ModelCapabilities(baseCapabilities);
  }

  /**
   * 获取模型最大令牌数
   */
  getModelMaxTokens() {
    const tokenLimits = {
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384
    };

    return tokenLimits[this.model] || 4096;
  }

  /**
   * 获取模型上下文窗口
   */
  getModelContextWindow() {
    return this.getModelMaxTokens();
  }

  /**
   * 获取模型成本
   */
  getModelCost() {
    const costs = {
      'gpt-4': 0.03,
      'gpt-4-turbo': 0.01,
      'gpt-4o': 0.005,
      'gpt-3.5-turbo': 0.002,
      'gpt-3.5-turbo-16k': 0.004
    };

    return costs[this.model] || 0.002;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const testMessage = new Message('user', 'Hello');
      const options = new ChatOptions({ maxTokens: 5 });
      
      const startTime = Date.now();
      await this.chat([testMessage], options);
      const responseTime = Date.now() - startTime;

      this.lastHealthCheck = new Date().toISOString();
      this.healthStatus = 'healthy';

      return {
        healthy: true,
        message: 'OpenAI适配器健康检查通过',
        details: {
          responseTime,
          model: this.model,
          endpoint: this.config.endpoint,
          circuitBreakerState: this.circuitBreaker?.state || 'disabled',
          metrics: this.getMetrics()
        }
      };

    } catch (error) {
      this.healthStatus = 'unhealthy';
      return {
        healthy: false,
        message: `OpenAI适配器健康检查失败: ${error.message}`,
        details: {
          error: error.message,
          model: this.model,
          endpoint: this.config.endpoint,
          circuitBreakerState: this.circuitBreaker?.state || 'disabled'
        }
      };
    }
  }

  /**
   * 配置验证
   */
  async validateConfig() {
    const baseValidation = await super.validateConfig();
    const errors = [...baseValidation.errors];

    // 检查模型是否支持
    if (!this.supportedModels.includes(this.model)) {
      errors.push(`不支持的模型: ${this.model}`);
    }

    // 检查API密钥格式
    if (this.config.apiKey && !this.config.apiKey.startsWith('sk-')) {
      errors.push('OpenAI API密钥格式不正确');
    }

    // 检查端点URL
    if (this.config.endpoint && !this.config.endpoint.startsWith('http')) {
      errors.push('API端点URL格式不正确');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = OpenAIAdapter;