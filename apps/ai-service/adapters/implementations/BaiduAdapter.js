const BaseAdapter = require('../base/BaseAdapter');
const { Message, ChatOptions, StreamOptions, ChatResponse, ChatChunk, ModelCapabilities } = require('../interfaces/AIModelAdapter');
const axios = require('axios');

/**
 * 百度文心适配器实现
 * 支持百度文心一言模型
 */
class BaiduAdapter extends BaseAdapter {
  constructor(provider, model, config = {}) {
    super(provider, model, config);
    
    this.apiClient = null;
    this.supportedModels = [
      'wenxin-yiyan'
    ];
  }

  /**
   * 初始化百度适配器
   */
  async initialize() {
    await super.initialize();
    
    this.apiClient = axios.create({
      baseURL: this.config.endpoint || 'https://api.wenxin.baidu.com/v1',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User -Agent': 'ChatlogWeb-AI-Service/1.0.0'
      },
      timeout: this.config.timeout || 30000
    });

    console.log(`✅ 百度适配器初始化完成: ${this.model}`);
  }

  /**
   * 发送聊天请求
   */
  async chat(messages, options = new ChatOptions()) {
    if (!this.checkCircuitBreaker()) {
      throw new Error('熔断器开启，请求被拒绝');
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
   * 构建聊天请求
   */
  buildChatRequest(messages, options) {
    return {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: options.maxTokens || this.config.maxTokens || 2048,
      temperature: options.temperature ?? this.config.temperature ?? 1.0,
      top_p: options.topP ?? 1.0,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0
    };
  }

  /**
   * 解析聊天响应
   */
  parseChatResponse(data, startTime) {
    const content = data.choices?.[0]?.message?.content || '';
    return new ChatResponse(content, {
      model: data.model,
      usage: data.usage || {},
      finishReason: data.choices?.[0]?.finish_reason,
      duration: Date.now() - startTime
    });
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const testMessage = new Message('user', '测试连接');
      const options = new ChatOptions({ maxTokens: 5 });
      
      const startTime = Date.now();
      await this.chat([testMessage], options);
      const responseTime = Date.now() - startTime;

      this.lastHealthCheck = new Date().toISOString();
      this.healthStatus = 'healthy';

      return {
        healthy: true,
        message: '百度适配器健康检查通过',
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
        message: `百度适配器健康检查失败: ${error.message}`,
        details: {
          error: error.message,
          model: this.model,
          endpoint: this.config.endpoint,
          circuitBreakerState: this.circuitBreaker?.state || 'disabled'
        }
      };
    }
  }
}

module.exports = BaiduAdapter;