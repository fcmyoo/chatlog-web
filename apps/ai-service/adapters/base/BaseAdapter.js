const { AIModelAdapter, Message, ChatOptions, StreamOptions, ChatResponse, ChatChunk, ModelCapabilities, ModelMetrics } = require('../interfaces/AIModelAdapter');
const { EventEmitter } = require('events');

/**
 * 基础适配器类
 * 提供所有适配器的通用功能
 */
class BaseAdapter extends AIModelAdapter {
  constructor(provider, model, config = {}) {
    super(provider, model, config);
    
    this.eventEmitter = new EventEmitter();
    this.requestQueue = [];
    this.isProcessing = false;
    this.rateLimiter = null;
    this.circuitBreaker = null;
    this.retryConfig = {
      maxAttempts: config.retryAttempts || 3,
      baseDelay: config.retryDelay || 1000,
      maxDelay: config.maxRetryDelay || 30000,
      backoffFactor: config.backoffFactor || 2
    };
  }

  /**
   * 初始化适配器
   */
  async initialize() {
    try {
      await this.validateConfig();
      await this.setupRateLimiter();
      await this.setupCircuitBreaker();
      
      this.isInitialized = true;
      this.healthStatus = 'healthy';
      this.lastHealthCheck = new Date().toISOString();
      
      this.eventEmitter.emit('initialized', {
        provider: this.provider,
        model: this.model
      });
      
      console.log(`✅ 适配器初始化成功: ${this.provider}:${this.model}`);
    } catch (error) {
      this.healthStatus = 'unhealthy';
      console.error(`❌ 适配器初始化失败: ${this.provider}:${this.model}`, error);
      throw error;
    }
  }

  /**
   * 设置速率限制器
   */
  async setupRateLimiter() {
    if (this.config.rateLimit) {
      this.rateLimiter = {
        requestsPerMinute: this.config.rateLimit.requestsPerMinute || 60,
        tokensPerMinute: this.config.rateLimit.tokensPerMinute || 90000,
        requestHistory: [],
        tokenHistory: []
      };
    }
  }

  /**
   * 设置熔断器
   */
  async setupCircuitBreaker() {
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureCount: 0,
      failureThreshold: this.config.failureThreshold || 5,
      timeout: this.config.circuitBreakerTimeout || 60000,
      lastFailureTime: null,
      successCount: 0,
      halfOpenMaxCalls: this.config.halfOpenMaxCalls || 3
    };
  }

  /**
   * 检查速率限制
   */
  checkRateLimit(estimatedTokens = 1000) {
    if (!this.rateLimiter) return true;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // 清理过期记录
    this.rateLimiter.requestHistory = this.rateLimiter.requestHistory.filter(time => time > oneMinuteAgo);
    this.rateLimiter.tokenHistory = this.rateLimiter.tokenHistory.filter(record => record.time > oneMinuteAgo);

    // 检查请求频率
    if (this.rateLimiter.requestHistory.length >= this.rateLimiter.requestsPerMinute) {
      return false;
    }

    // 检查令牌使用量
    const tokensUsed = this.rateLimiter.tokenHistory.reduce((sum, record) => sum + record.tokens, 0);
    if (tokensUsed + estimatedTokens > this.rateLimiter.tokensPerMinute) {
      return false;
    }

    return true;
  }

  /**
   * 记录请求
   */
  recordRequest(tokens = 0) {
    if (this.rateLimiter) {
      const now = Date.now();
      this.rateLimiter.requestHistory.push(now);
      if (tokens > 0) {
        this.rateLimiter.tokenHistory.push({ time: now, tokens });
      }
    }
  }

  /**
   * 检查熔断器状态
   */
  checkCircuitBreaker() {
    if (!this.circuitBreaker) return true;

    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now - this.circuitBreaker.lastFailureTime > this.circuitBreaker.timeout) {
          this.circuitBreaker.state = 'HALF_OPEN';
          this.circuitBreaker.successCount = 0;
          console.log(`🔄 熔断器进入半开状态: ${this.provider}:${this.model}`);
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return this.circuitBreaker.successCount < this.circuitBreaker.halfOpenMaxCalls;

      default:
        return true;
    }
  }

  /**
   * 记录成功请求
   */
  recordSuccess() {
    if (this.circuitBreaker) {
      if (this.circuitBreaker.state === 'HALF_OPEN') {
        this.circuitBreaker.successCount++;
        if (this.circuitBreaker.successCount >= this.circuitBreaker.halfOpenMaxCalls) {
          this.circuitBreaker.state = 'CLOSED';
          this.circuitBreaker.failureCount = 0;
          console.log(`✅ 熔断器恢复正常: ${this.provider}:${this.model}`);
        }
      } else {
        this.circuitBreaker.failureCount = 0;
      }
    }
  }

  /**
   * 记录失败请求
   */
  recordFailure() {
    if (this.circuitBreaker) {
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = Date.now();

      if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
        this.circuitBreaker.state = 'OPEN';
        console.log(`🚨 熔断器开启: ${this.provider}:${this.model}`);
      }
    }
  }

  /**
   * 重试机制
   */
  async withRetry(operation, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ 重试成功: ${this.provider}:${this.model} (第${attempt}次尝试)`);
        }
        
        this.recordSuccess();
        return result;
        
      } catch (error) {
        lastError = error;
        
        console.log(`❌ 请求失败: ${this.provider}:${this.model} (第${attempt}次尝试) - ${error.message}`);
        
        this.recordFailure();
        
        // 检查是否应该重试
        if (attempt === this.retryConfig.maxAttempts || !this.shouldRetry(error)) {
          break;
        }
        
        // 计算延迟时间
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1),
          this.retryConfig.maxDelay
        );
        
        console.log(`⏳ ${delay}ms后进行第${attempt + 1}次重试...`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(error) {
    const retryableErrors = [
      'ECONNABORTED',
      'ECONNRESET',
      'ETIMEDOUT',
      'socket hang up',
      'timeout',
      'rate limit',
      'overloaded'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const hasRetryableKeyword = retryableErrors.some(keyword => 
      errorMessage.includes(keyword)
    );

    const isServerError = error.response?.status >= 500 && error.response?.status < 600;
    const isRateLimit = error.response?.status === 429;

    return hasRetryableKeyword || isServerError || isRateLimit;
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 预处理消息
   */
  preprocessMessages(messages) {
    return messages.map(msg => {
      if (!(msg instanceof Message)) {
        return new Message(msg.role, msg.content, msg.metadata);
      }
      return msg;
    });
  }

  /**
   * 后处理响应
   */
  postprocessResponse(response, startTime, tokens = 0) {
    const duration = Date.now() - startTime;
    const cost = this.calculateCost(tokens);
    
    this.metrics.updateMetrics(duration, tokens, cost, true);
    this.recordRequest(tokens);
    
    if (response instanceof ChatResponse) {
      response.metadata.duration = duration;
      response.metadata.cost = cost;
      response.metadata.provider = this.provider;
      response.metadata.model = this.model;
    }
    
    return response;
  }

  /**
   * 计算成本
   */
  calculateCost(tokens) {
    const costPer1k = this.config.costPer1kTokens || 0;
    return (tokens / 1000) * costPer1k;
  }

  /**
   * 健康检查实现
   */
  async healthCheck() {
    try {
      // 检查熔断器状态
      if (!this.checkCircuitBreaker()) {
        return {
          healthy: false,
          message: '熔断器开启状态',
          details: {
            circuitBreakerState: this.circuitBreaker.state,
            failureCount: this.circuitBreaker.failureCount
          }
        };
      }

      // 执行简单的连接测试
      const testMessage = new Message('user', '测试连接');
      const startTime = Date.now();
      
      await this.chat([testMessage], new ChatOptions({ maxTokens: 10 }));
      
      const responseTime = Date.now() - startTime;
      this.lastHealthCheck = new Date().toISOString();
      this.healthStatus = 'healthy';

      return {
        healthy: true,
        message: '健康检查通过',
        details: {
          responseTime,
          circuitBreakerState: this.circuitBreaker?.state || 'disabled',
          metrics: this.getMetrics()
        }
      };

    } catch (error) {
      this.healthStatus = 'unhealthy';
      return {
        healthy: false,
        message: `健康检查失败: ${error.message}`,
        details: {
          error: error.message,
          circuitBreakerState: this.circuitBreaker?.state || 'disabled'
        }
      };
    }
  }

  /**
   * 配置验证实现
   */
  async validateConfig() {
    const errors = [];

    // 检查必需字段
    if (!this.config.apiKey) {
      errors.push('缺少API密钥');
    }

    if (!this.config.endpoint) {
      errors.push('缺少API端点');
    }

    // 检查数值字段
    if (this.config.maxTokens && (this.config.maxTokens < 1 || this.config.maxTokens > 100000)) {
      errors.push('maxTokens必须在1-100000之间');
    }

    if (this.config.temperature && (this.config.temperature < 0 || this.config.temperature > 2)) {
      errors.push('temperature必须在0-2之间');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取适配器能力（需要子类实现）
   */
  getCapabilities() {
    return new ModelCapabilities({
      maxTokens: this.config.maxTokens || 4096,
      supportsStreaming: true,
      contextWindow: this.config.contextWindow || 4096,
      costPer1kTokens: this.config.costPer1kTokens || 0
    });
  }

  /**
   * 销毁适配器
   */
  async destroy() {
    await super.destroy();
    
    this.eventEmitter.removeAllListeners();
    this.requestQueue = [];
    this.rateLimiter = null;
    this.circuitBreaker = null;
    
    console.log(`🧹 适配器已销毁: ${this.provider}:${this.model}`);
  }

  /**
   * 事件监听
   */
  on(event, listener) {
    this.eventEmitter.on(event, listener);
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    this.eventEmitter.emit(event, data);
  }
}

module.exports = BaseAdapter;