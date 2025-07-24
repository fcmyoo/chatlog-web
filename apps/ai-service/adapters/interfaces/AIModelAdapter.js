/**
 * AI模型适配器接口定义
 * 统一的AI模型接口抽象层，支持多种AI模型提供商
 */

/**
 * 消息类型定义
 */
class Message {
  constructor(role, content, metadata = {}) {
    this.role = role; // 'system', 'user', 'assistant'
    this.content = content;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 聊天选项配置
 */
class ChatOptions {
  constructor(options = {}) {
    this.temperature = options.temperature || 0.7;
    this.maxTokens = options.maxTokens || 4096;
    this.topP = options.topP || 1.0;
    this.frequencyPenalty = options.frequencyPenalty || 0;
    this.presencePenalty = options.presencePenalty || 0;
    this.stop = options.stop || [];
    this.stream = options.stream || false;
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }
}

/**
 * 流式选项配置
 */
class StreamOptions extends ChatOptions {
  constructor(options = {}) {
    super(options);
    this.stream = true;
    this.onChunk = options.onChunk || null;
    this.onComplete = options.onComplete || null;
    this.onError = options.onError || null;
  }
}

/**
 * 聊天响应结果
 */
class ChatResponse {
  constructor(content, metadata = {}) {
    this.content = content;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
    this.usage = metadata.usage || {};
    this.model = metadata.model || '';
    this.provider = metadata.provider || '';
    this.duration = metadata.duration || 0;
    this.cost = metadata.cost || 0;
  }
}

/**
 * 流式响应块
 */
class ChatChunk {
  constructor(content, isComplete = false, metadata = {}) {
    this.content = content;
    this.isComplete = isComplete;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 模型能力描述
 */
class ModelCapabilities {
  constructor(capabilities = {}) {
    this.maxTokens = capabilities.maxTokens || 4096;
    this.supportsStreaming = capabilities.supportsStreaming || false;
    this.supportsImages = capabilities.supportsImages || false;
    this.supportsAudio = capabilities.supportsAudio || false;
    this.supportsVideo = capabilities.supportsVideo || false;
    this.supportsFunctionCalling = capabilities.supportsFunctionCalling || false;
    this.languages = capabilities.languages || ['zh', 'en'];
    this.contextWindow = capabilities.contextWindow || 4096;
    this.costPer1kTokens = capabilities.costPer1kTokens || 0;
  }
}

/**
 * 模型性能指标
 */
class ModelMetrics {
  constructor() {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.averageResponseTime = 0;
    this.totalTokensUsed = 0;
    this.totalCost = 0;
    this.lastRequestTime = null;
    this.errorRate = 0;
    this.availability = 100;
  }

  updateMetrics(duration, tokens, cost, success) {
    this.totalRequests++;
    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }
    
    this.averageResponseTime = (this.averageResponseTime * (this.totalRequests - 1) + duration) / this.totalRequests;
    this.totalTokensUsed += tokens || 0;
    this.totalCost += cost || 0;
    this.lastRequestTime = new Date().toISOString();
    this.errorRate = (this.failedRequests / this.totalRequests) * 100;
    this.availability = (this.successfulRequests / this.totalRequests) * 100;
  }
}

/**
 * AI模型适配器接口
 * 所有AI模型适配器必须实现此接口
 */
class AIModelAdapter {
  constructor(provider, model, config = {}) {
    if (this.constructor === AIModelAdapter) {
      throw new Error('AIModelAdapter是抽象类，不能直接实例化');
    }
    
    this.provider = provider;
    this.model = model;
    this.config = config;
    this.metrics = new ModelMetrics();
    this.isInitialized = false;
    this.lastHealthCheck = null;
    this.healthStatus = 'unknown';
  }

  /**
   * 初始化适配器
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize方法必须被子类实现');
  }

  /**
   * 发送聊天请求
   * @param {Message[]} messages - 消息列表
   * @param {ChatOptions} options - 聊天选项
   * @returns {Promise<ChatResponse>}
   */
  async chat(messages, options = new ChatOptions()) {
    throw new Error('chat方法必须被子类实现');
  }

  /**
   * 发送流式聊天请求
   * @param {Message[]} messages - 消息列表
   * @param {StreamOptions} options - 流式选项
   * @returns {AsyncIterator<ChatChunk>}
   */
  async* stream(messages, options = new StreamOptions()) {
    throw new Error('stream方法必须被子类实现');
  }

  /**
   * 获取模型能力
   * @returns {ModelCapabilities}
   */
  getCapabilities() {
    throw new Error('getCapabilities方法必须被子类实现');
  }

  /**
   * 获取性能指标
   * @returns {ModelMetrics}
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * 健康检查
   * @returns {Promise<{healthy: boolean, message: string, details: object}>}
   */
  async healthCheck() {
    throw new Error('healthCheck方法必须被子类实现');
  }

  /**
   * 验证配置
   * @returns {Promise<{valid: boolean, errors: string[]}>}
   */
  async validateConfig() {
    throw new Error('validateConfig方法必须被子类实现');
  }

  /**
   * 获取适配器信息
   * @returns {object}
   */
  getInfo() {
    return {
      provider: this.provider,
      model: this.model,
      isInitialized: this.isInitialized,
      healthStatus: this.healthStatus,
      lastHealthCheck: this.lastHealthCheck,
      metrics: this.getMetrics()
    };
  }

  /**
   * 销毁适配器
   * @returns {Promise<void>}
   */
  async destroy() {
    this.isInitialized = false;
    this.healthStatus = 'destroyed';
  }
}

module.exports = {
  AIModelAdapter,
  Message,
  ChatOptions,
  StreamOptions,
  ChatResponse,
  ChatChunk,
  ModelCapabilities,
  ModelMetrics
};