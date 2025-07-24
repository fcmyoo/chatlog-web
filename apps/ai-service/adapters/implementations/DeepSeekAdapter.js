const BaseAdapter = require('../base/BaseAdapter');
const { Message, ChatOptions, StreamOptions, ChatResponse, ChatChunk, ModelCapabilities } = require('../interfaces/AIModelAdapter');
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

/**
 * DeepSeek适配器实现
 * 基于现有的DeepSeek集成代码改造
 */
class DeepSeekAdapter extends BaseAdapter {
  constructor(provider, model, config = {}) {
    super(provider, model, config);
    
    this.langchainModel = null;
    this.supportedModels = [
      'deepseek-chat',
      'deepseek-reasoner',
      'deepseek-coder'
    ];
  }

  /**
   * 初始化DeepSeek适配器
   */
  async initialize() {
    await super.initialize();
    
    try {
      this.langchainModel = new ChatOpenAI({
        modelName: this.model,
        openAIApiKey: this.config.apiKey,
        configuration: {
          baseURL: this.config.endpoint || 'https://api.deepseek.com/v1'
        },
        temperature: this.config.temperature || 1.0,
        maxTokens: this.config.maxTokens || 64000,
        timeout: this.config.timeout || 300000
      });

      console.log(`✅ DeepSeek适配器初始化完成: ${this.model}`);
    } catch (error) {
      console.error(`❌ DeepSeek适配器初始化失败: ${error.message}`);
      throw error;
    }
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
      
      const response = await this.langchainModel.invoke(requestBody);
      
      const chatResponse = this.parseChatResponse(response, startTime);
      
      return this.postprocessResponse(
        chatResponse, 
        startTime, 
        response.usage?.total_tokens || 0
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
      max_tokens: options.maxTokens || this.config.maxTokens || 64000,
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
        message: 'DeepSeek适配器健康检查通过',
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
        message: `DeepSeek适配器健康检查失败: ${error.message}`,
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

module.exports = DeepSeekAdapter;