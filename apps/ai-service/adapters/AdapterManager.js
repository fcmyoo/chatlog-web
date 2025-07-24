/**
 * 适配器管理器
 * 企业级多模型适配器架构的核心组件
 */

const { globalRegistry } = require('./AdapterRegistry');
const { globalConfigManager } = require('./config/ModelConfigManager');
const OpenAIAdapter = require('./implementations/OpenAIAdapter');
const DeepSeekAdapter = require('./implementations/DeepSeekAdapter');
const { EventEmitter } = require('events');

class AdapterManager extends EventEmitter {
  constructor() {
    super();
    
    this.registry = globalRegistry;
    this.configManager = globalConfigManager;
    this.loadBalancer = null;
    this.smartRouter = null;
    this.isInitialized = false;
    this.healthCheckInterval = null;
    this.metricsCollector = null;
  }

  /**
   * 初始化适配器管理器
   */
  async initialize() {
    try {
      console.log('🚀 初始化适配器管理器...');
      
      // 初始化配置管理器
      await this.configManager.initialize();
      
      // 注册内置适配器
      await this.registerBuiltinAdapters();
      
      // 初始化负载均衡器
      await this.initializeLoadBalancer();
      
      // 初始化智能路由
      await this.initializeSmartRouter();
      
      // 启动健康检查
      this.startHealthCheck();
      
      // 启动指标收集
      this.startMetricsCollection();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ 适配器管理器初始化完成');
      
    } catch (error) {
      console.error('❌ 适配器管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 注册内置适配器
   */
  async registerBuiltinAdapters() {
    console.log('📋 注册内置适配器...');
    
    // 注册OpenAI适配器
    this.registry.register('OpenAI', OpenAIAdapter, {
      name: 'OpenAI GPT Models',
      description: 'OpenAI GPT系列模型适配器',
      version: '1.0.0',
      supportedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'],
      capabilities: {
        supportsStreaming: true,
        supportsImages: true,
        supportsFunctionCalling: true
      }
    });

    // 注册DeepSeek适配器
    this.registry.register('DeepSeek', DeepSeekAdapter, {
      name: 'DeepSeek Models',
      description: 'DeepSeek系列模型适配器',
      version: '1.0.0',
      supportedModels: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
      capabilities: {
        supportsStreaming: true,
        supportsImages: false,
        supportsFunctionCalling: false
      }
    });

    console.log('✅ 内置适配器注册完成');
  }

  /**
   * 初始化负载均衡器
   */
  async initializeLoadBalancer() {
    this.loadBalancer = {
      strategy: 'weighted_round_robin', // round_robin, weighted_round_robin, least_connections, response_time
      weights: new Map(),
      connections: new Map(),
      responseTimes: new Map(),
      currentIndex: 0
    };

    console.log('⚖️ 负载均衡器初始化完成');
  }

  /**
   * 初始化智能路由
   */
  async initializeSmartRouter() {
    this.smartRouter = {
      rules: [],
      fallbackProvider: null,
      costOptimization: true,
      performanceOptimization: true
    };

    // 添加默认路由规则
    this.addRoutingRule({
      name: 'cost_optimization',
      condition: (request) => request.options?.costOptimized === true,
      action: (providers) => this.selectByCost(providers)
    });

    this.addRoutingRule({
      name: 'performance_optimization',
      condition: (request) => request.options?.performanceOptimized === true,
      action: (providers) => this.selectByPerformance(providers)
    });

    console.log('🧠 智能路由初始化完成');
  }

  /**
   * 添加路由规则
   */
  addRoutingRule(rule) {
    this.smartRouter.rules.push(rule);
    console.log(`📋 路由规则已添加: ${rule.name}`);
  }

  /**
   * 创建适配器实例
   */
  async createAdapter(provider, model, config = null) {
    try {
      // 获取配置
      const adapterConfig = config || this.configManager.getConfig(provider, model);
      if (!adapterConfig) {
        throw new Error(`未找到配置: ${provider}:${model}`);
      }

      // 检查适配器是否启用
      if (adapterConfig.enabled === false) {
        throw new Error(`适配器已禁用: ${provider}:${model}`);
      }

      // 创建适配器实例
      const adapter = this.registry.createAdapter(provider, model, adapterConfig);
      
      // 初始化适配器
      await adapter.initialize();
      
      // 设置事件监听
      this.setupAdapterEvents(adapter);
      
      console.log(`✅ 适配器实例创建成功: ${provider}:${model}`);
      return adapter;
      
    } catch (error) {
      console.error(`❌ 创建适配器实例失败: ${provider}:${model}`, error);
      throw error;
    }
  }

  /**
   * 设置适配器事件监听
   */
  setupAdapterEvents(adapter) {
    adapter.on('requestStart', (data) => {
      this.emit('adapterRequestStart', { adapter: adapter.getInfo(), ...data });
    });

    adapter.on('requestSuccess', (data) => {
      this.updateLoadBalancerMetrics(adapter, data);
      this.emit('adapterRequestSuccess', { adapter: adapter.getInfo(), ...data });
    });

    adapter.on('requestError', (data) => {
      this.updateLoadBalancerMetrics(adapter, data, true);
      this.emit('adapterRequestError', { adapter: adapter.getInfo(), ...data });
    });
  }

  /**
   * 更新负载均衡器指标
   */
  updateLoadBalancerMetrics(adapter, data, isError = false) {
    const key = `${adapter.provider}:${adapter.model}`;
    
    if (!this.loadBalancer.connections.has(key)) {
      this.loadBalancer.connections.set(key, 0);
      this.loadBalancer.responseTimes.set(key, []);
    }

    if (isError) {
      // 错误时增加连接计数（表示负载）
      this.loadBalancer.connections.set(key, this.loadBalancer.connections.get(key) + 1);
    } else {
      // 成功时记录响应时间
      const responseTimes = this.loadBalancer.responseTimes.get(key);
      responseTimes.push(data.responseTime || 0);
      
      // 只保留最近100次的响应时间
      if (responseTimes.length > 100) {
        responseTimes.shift();
      }
    }
  }

  /**
   * 智能选择适配器
   */
  async selectAdapter(request) {
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('没有可用的适配器');
    }

    // 应用路由规则
    for (const rule of this.smartRouter.rules) {
      if (rule.condition(request)) {
        const selected = rule.action(availableProviders);
        if (selected) {
          return selected;
        }
      }
    }

    // 默认负载均衡选择
    return this.selectByLoadBalancer(availableProviders);
  }

  /**
   * 获取可用的提供商
   */
  getAvailableProviders() {
    const enabledConfigs = this.configManager.getEnabledConfigs();
    return Object.keys(enabledConfigs).map(key => {
      const [provider, model] = key.split(':');
      return { provider, model, config: enabledConfigs[key] };
    });
  }

  /**
   * 按成本选择
   */
  selectByCost(providers) {
    return providers.reduce((cheapest, current) => {
      const currentCost = current.config.costPer1kTokens || 0;
      const cheapestCost = cheapest.config.costPer1kTokens || 0;
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  /**
   * 按性能选择
   */
  selectByPerformance(providers) {
    let best = providers[0];
    let bestScore = 0;

    for (const provider of providers) {
      const key = `${provider.provider}:${provider.model}`;
      const responseTimes = this.loadBalancer.responseTimes.get(key) || [];
      
      if (responseTimes.length === 0) {
        continue;
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const score = 1000 / (avgResponseTime + 1); // 响应时间越短分数越高
      
      if (score > bestScore) {
        best = provider;
        bestScore = score;
      }
    }

    return best;
  }

  /**
   * 负载均衡选择
   */
  selectByLoadBalancer(providers) {
    switch (this.loadBalancer.strategy) {
      case 'round_robin':
        return this.roundRobinSelect(providers);
      
      case 'weighted_round_robin':
        return this.weightedRoundRobinSelect(providers);
      
      case 'least_connections':
        return this.leastConnectionsSelect(providers);
      
      case 'response_time':
        return this.responseTimeSelect(providers);
      
      default:
        return providers[0];
    }
  }

  /**
   * 轮询选择
   */
  roundRobinSelect(providers) {
    const selected = providers[this.loadBalancer.currentIndex % providers.length];
    this.loadBalancer.currentIndex++;
    return selected;
  }

  /**
   * 加权轮询选择
   */
  weightedRoundRobinSelect(providers) {
    // 简化实现：按优先级选择
    return providers.sort((a, b) => (a.config.priority || 999) - (b.config.priority || 999))[0];
  }

  /**
   * 最少连接选择
   */
  leastConnectionsSelect(providers) {
    let selected = providers[0];
    let minConnections = Infinity;

    for (const provider of providers) {
      const key = `${provider.provider}:${provider.model}`;
      const connections = this.loadBalancer.connections.get(key) || 0;
      
      if (connections < minConnections) {
        minConnections = connections;
        selected = provider;
      }
    }

    return selected;
  }

  /**
   * 响应时间选择
   */
  responseTimeSelect(providers) {
    return this.selectByPerformance(providers);
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('健康检查失败:', error);
      }
    }, 60000); // 每分钟检查一次

    console.log('💓 健康检查已启动');
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    const results = await this.registry.healthCheckAll();
    
    for (const [key, result] of Object.entries(results)) {
      if (!result.healthy) {
        console.warn(`⚠️ 适配器健康检查失败: ${key} - ${result.message}`);
        this.emit('adapterUnhealthy', { key, result });
      }
    }

    this.emit('healthCheckCompleted', results);
  }

  /**
   * 启动指标收集
   */
  startMetricsCollection() {
    this.metricsCollector = setInterval(() => {
      this.collectMetrics();
    }, 30000); // 每30秒收集一次

    console.log('📊 指标收集已启动');
  }

  /**
   * 收集指标
   */
  collectMetrics() {
    const stats = this.registry.getStats();
    const configStats = this.configManager.getStats();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      adapters: stats,
      configs: configStats,
      loadBalancer: {
        strategy: this.loadBalancer.strategy,
        connections: Object.fromEntries(this.loadBalancer.connections),
        responseTimes: Object.fromEntries(
          Array.from(this.loadBalancer.responseTimes.entries()).map(([key, times]) => [
            key,
            {
              count: times.length,
              average: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
              min: times.length > 0 ? Math.min(...times) : 0,
              max: times.length > 0 ? Math.max(...times) : 0
            }
          ])
        )
      }
    };

    this.emit('metricsCollected', metrics);
  }

  /**
   * 获取管理器状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      adapters: this.registry.getStats(),
      configs: this.configManager.getStats(),
      loadBalancer: {
        strategy: this.loadBalancer.strategy,
        activeConnections: this.loadBalancer.connections.size
      },
      smartRouter: {
        rulesCount: this.smartRouter.rules.length,
        fallbackProvider: this.smartRouter.fallbackProvider
      }
    };
  }

  /**
   * 销毁管理器
   */
  async destroy() {
    console.log('🧹 销毁适配器管理器...');
    
    // 停止健康检查
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // 停止指标收集
    if (this.metricsCollector) {
      clearInterval(this.metricsCollector);
    }

    // 清理注册中心
    await this.registry.clear();

    console.log('✅ 适配器管理器已销毁');
  }
}

module.exports = AdapterManager;