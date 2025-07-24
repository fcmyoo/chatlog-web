/**
 * 模型配置管理器
 * 负责管理所有AI模型的配置信息
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class ModelConfigManager extends EventEmitter {
  constructor(configDir = path.join(__dirname, '../../../config')) {
    super();
    this.configDir = configDir;
    this.configFile = path.join(configDir, 'ai-models-config.json');
    this.configs = new Map();
    this.watchers = new Map();
    this.isInitialized = false;
  }

  /**
   * 初始化配置管理器
   */
  async initialize() {
    try {
      await this.ensureConfigDir();
      await this.loadConfigs();
      this.isInitialized = true;
      this.emit('initialized');
      console.log('✅ 模型配置管理器初始化完成');
    } catch (error) {
      console.error('❌ 模型配置管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 确保配置目录存在
   */
  async ensureConfigDir() {
    try {
      await fs.access(this.configDir);
    } catch (error) {
      await fs.mkdir(this.configDir, { recursive: true });
      console.log(`📁 配置目录已创建: ${this.configDir}`);
    }
  }

  /**
   * 加载配置文件
   */
  async loadConfigs() {
    try {
      const data = await fs.readFile(this.configFile, 'utf8');
      const configs = JSON.parse(data);
      
      this.configs.clear();
      for (const [key, config] of Object.entries(configs)) {
        this.configs.set(key, this.validateConfig(config));
      }
      
      console.log(`📋 已加载 ${this.configs.size} 个模型配置`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 配置文件不存在，创建默认配置
        await this.createDefaultConfigs();
      } else {
        throw error;
      }
    }
  }

  /**
   * 创建默认配置
   */
  async createDefaultConfigs() {
    const defaultConfigs = {
      'openai:gpt-4': {
        provider: 'OpenAI',
        model: 'gpt-4',
        endpoint: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || '',
        maxTokens: 4096,
        temperature: 0.7,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        costPer1kTokens: 0.03,
        capabilities: {
          supportsStreaming: true,
          supportsImages: true,
          supportsFunctionCalling: true,
          contextWindow: 8192
        },
        rateLimit: {
          requestsPerMinute: 60,
          tokensPerMinute: 90000
        },
        enabled: true,
        priority: 1
      },
      'openai:gpt-3.5-turbo': {
        provider: 'OpenAI',
        model: 'gpt-3.5-turbo',
        endpoint: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || '',
        maxTokens: 4096,
        temperature: 0.7,
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        costPer1kTokens: 0.002,
        capabilities: {
          supportsStreaming: true,
          supportsImages: false,
          supportsFunctionCalling: true,
          contextWindow: 4096
        },
        rateLimit: {
          requestsPerMinute: 60,
          tokensPerMinute: 90000
        },
        enabled: true,
        priority: 2
      },
      'deepseek:deepseek-reasoner': {
        provider: 'DeepSeek',
        model: 'deepseek-reasoner',
        endpoint: 'https://api.deepseek.com/v1',
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        maxTokens: 64000,
        temperature: 1.0,
        timeout: 300000,
        retryAttempts: 3,
        retryDelay: 5000,
        costPer1kTokens: 0.008,
        capabilities: {
          supportsStreaming: true,
          supportsImages: false,
          supportsFunctionCalling: false,
          contextWindow: 64000
        },
        rateLimit: {
          requestsPerMinute: 30,
          tokensPerMinute: 60000
        },
        enabled: true,
        priority: 1
      },
      'google:gemini-2.5-pro': {
        provider: 'Google',
        model: 'gemini-2.5-pro',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: process.env.GEMINI_API_KEY || '',
        maxTokens: 32768,
        temperature: 1.0,
        timeout: 60000,
        retryAttempts: 3,
        retryDelay: 2000,
        costPer1kTokens: 0.01,
        capabilities: {
          supportsStreaming: true,
          supportsImages: true,
          supportsAudio: true,
          supportsVideo: true,
          supportsFunctionCalling: true,
          contextWindow: 32768
        },
        rateLimit: {
          requestsPerMinute: 60,
          tokensPerMinute: 120000
        },
        enabled: true,
        priority: 1
      }
    };

    for (const [key, config] of Object.entries(defaultConfigs)) {
      this.configs.set(key, this.validateConfig(config));
    }

    await this.saveConfigs();
    console.log('📋 默认配置已创建');
  }

  /**
   * 验证配置
   */
  validateConfig(config) {
    const requiredFields = ['provider', 'model', 'endpoint'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`配置缺少必需字段: ${field}`);
      }
    }

    return {
      ...config,
      createdAt: config.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: config.version || '1.0.0'
    };
  }

  /**
   * 保存配置到文件
   */
  async saveConfigs() {
    const configsObj = {};
    for (const [key, config] of this.configs.entries()) {
      configsObj[key] = config;
    }

    await fs.writeFile(this.configFile, JSON.stringify(configsObj, null, 2));
    this.emit('configsSaved');
  }

  /**
   * 获取配置
   */
  getConfig(provider, model) {
    const key = `${provider}:${model}`;
    return this.configs.get(key) || null;
  }

  /**
   * 设置配置
   */
  async setConfig(provider, model, config) {
    const key = `${provider}:${model}`;
    const validatedConfig = this.validateConfig({
      ...config,
      provider,
      model
    });

    this.configs.set(key, validatedConfig);
    await this.saveConfigs();
    
    this.emit('configUpdated', { provider, model, config: validatedConfig });
    console.log(`✅ 配置已更新: ${key}`);
  }

  /**
   * 删除配置
   */
  async deleteConfig(provider, model) {
    const key = `${provider}:${model}`;
    
    if (this.configs.has(key)) {
      this.configs.delete(key);
      await this.saveConfigs();
      
      this.emit('configDeleted', { provider, model });
      console.log(`🗑️ 配置已删除: ${key}`);
      return true;
    }
    
    return false;
  }

  /**
   * 获取提供商的所有配置
   */
  getProviderConfigs(provider) {
    const configs = [];
    
    for (const [key, config] of this.configs.entries()) {
      if (config.provider === provider) {
        configs.push({ key, ...config });
      }
    }
    
    return configs;
  }

  /**
   * 获取所有配置
   */
  getAllConfigs() {
    const configs = {};
    
    for (const [key, config] of this.configs.entries()) {
      configs[key] = config;
    }
    
    return configs;
  }

  /**
   * 获取启用的配置
   */
  getEnabledConfigs() {
    const configs = {};
    
    for (const [key, config] of this.configs.entries()) {
      if (config.enabled !== false) {
        configs[key] = config;
      }
    }
    
    return configs;
  }

  /**
   * 按优先级排序的配置
   */
  getConfigsByPriority(provider = null) {
    let configs = Array.from(this.configs.entries());
    
    if (provider) {
      configs = configs.filter(([key, config]) => config.provider === provider);
    }
    
    return configs
      .filter(([key, config]) => config.enabled !== false)
      .sort(([keyA, configA], [keyB, configB]) => {
        return (configA.priority || 999) - (configB.priority || 999);
      })
      .map(([key, config]) => ({ key, ...config }));
  }

  /**
   * 启用/禁用配置
   */
  async toggleConfig(provider, model, enabled) {
    const key = `${provider}:${model}`;
    const config = this.configs.get(key);
    
    if (config) {
      config.enabled = enabled;
      config.updatedAt = new Date().toISOString();
      
      await this.saveConfigs();
      this.emit('configToggled', { provider, model, enabled });
      
      console.log(`${enabled ? '✅' : '❌'} 配置已${enabled ? '启用' : '禁用'}: ${key}`);
    }
  }

  /**
   * 批量更新配置
   */
  async batchUpdateConfigs(updates) {
    for (const { provider, model, config } of updates) {
      await this.setConfig(provider, model, config);
    }
    
    this.emit('batchConfigsUpdated', updates);
    console.log(`📦 批量更新了 ${updates.length} 个配置`);
  }

  /**
   * 获取配置统计信息
   */
  getStats() {
    const stats = {
      total: this.configs.size,
      enabled: 0,
      disabled: 0,
      byProvider: {},
      byPriority: {}
    };

    for (const [key, config] of this.configs.entries()) {
      // 启用状态统计
      if (config.enabled !== false) {
        stats.enabled++;
      } else {
        stats.disabled++;
      }

      // 按提供商统计
      if (!stats.byProvider[config.provider]) {
        stats.byProvider[config.provider] = 0;
      }
      stats.byProvider[config.provider]++;

      // 按优先级统计
      const priority = config.priority || 999;
      if (!stats.byPriority[priority]) {
        stats.byPriority[priority] = 0;
      }
      stats.byPriority[priority]++;
    }

    return stats;
  }

  /**
   * 重新加载配置
   */
  async reload() {
    await this.loadConfigs();
    this.emit('configsReloaded');
    console.log('🔄 配置已重新加载');
  }

  /**
   * 销毁配置管理器
   */
  async destroy() {
    // 清理文件监听器
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
    
    this.configs.clear();
    this.isInitialized = false;
    this.emit('destroyed');
    
    console.log('🧹 模型配置管理器已销毁');
  }
}

// 创建全局配置管理器实例
const globalConfigManager = new ModelConfigManager();

module.exports = {
  ModelConfigManager,
  globalConfigManager
};