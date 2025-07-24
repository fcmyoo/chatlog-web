/**
 * 适配器注册中心
 * 管理所有可用的AI模型适配器
 */

class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.instances = new Map();
    this.defaultProvider = null;
  }

  /**
   * 注册适配器类
   * @param {string} provider - 提供商名称
   * @param {class} AdapterClass - 适配器类
   * @param {object} metadata - 元数据
   */
  register(provider, AdapterClass, metadata = {}) {
    if (!provider || typeof provider !== 'string') {
      throw new Error('提供商名称必须是非空字符串');
    }

    if (!AdapterClass || typeof AdapterClass !== 'function') {
      throw new Error('适配器类必须是有效的构造函数');
    }

    this.adapters.set(provider, {
      AdapterClass,
      metadata: {
        name: metadata.name || provider,
        description: metadata.description || '',
        version: metadata.version || '1.0.0',
        supportedModels: metadata.supportedModels || [],
        capabilities: metadata.capabilities || {},
        registeredAt: new Date().toISOString()
      }
    });

    console.log(`✅ 适配器已注册: ${provider}`);
  }

  /**
   * 注销适配器
   * @param {string} provider - 提供商名称
   */
  unregister(provider) {
    if (this.adapters.has(provider)) {
      // 销毁所有该提供商的实例
      for (const [key, instance] of this.instances.entries()) {
        if (key.startsWith(`${provider}:`)) {
          instance.destroy();
          this.instances.delete(key);
        }
      }
      
      this.adapters.delete(provider);
      console.log(`🗑️ 适配器已注销: ${provider}`);
    }
  }

  /**
   * 创建适配器实例
   * @param {string} provider - 提供商名称
   * @param {string} model - 模型名称
   * @param {object} config - 配置参数
   * @returns {AIModelAdapter}
   */
  createAdapter(provider, model, config = {}) {
    if (!this.adapters.has(provider)) {
      throw new Error(`未注册的AI提供商: ${provider}`);
    }

    const instanceKey = `${provider}:${model}`;
    
    // 检查是否已有实例（单例模式）
    if (this.instances.has(instanceKey)) {
      return this.instances.get(instanceKey);
    }

    const { AdapterClass } = this.adapters.get(provider);
    
    try {
      const instance = new AdapterClass(provider, model, config);
      this.instances.set(instanceKey, instance);
      
      console.log(`🚀 适配器实例已创建: ${instanceKey}`);
      return instance;
      
    } catch (error) {
      console.error(`❌ 创建适配器实例失败: ${instanceKey}`, error);
      throw new Error(`创建适配器实例失败: ${error.message}`);
    }
  }

  /**
   * 获取适配器实例
   * @param {string} provider - 提供商名称
   * @param {string} model - 模型名称
   * @returns {AIModelAdapter|null}
   */
  getInstance(provider, model) {
    const instanceKey = `${provider}:${model}`;
    return this.instances.get(instanceKey) || null;
  }

  /**
   * 获取所有已注册的提供商
   * @returns {string[]}
   */
  getProviders() {
    return Array.from(this.adapters.keys());
  }

  /**
   * 获取提供商的元数据
   * @param {string} provider - 提供商名称
   * @returns {object|null}
   */
  getProviderMetadata(provider) {
    const adapter = this.adapters.get(provider);
    return adapter ? adapter.metadata : null;
  }

  /**
   * 获取所有适配器信息
   * @returns {object}
   */
  getAllAdapters() {
    const result = {};
    
    for (const [provider, adapter] of this.adapters.entries()) {
      result[provider] = {
        ...adapter.metadata,
        instances: this.getProviderInstances(provider)
      };
    }
    
    return result;
  }

  /**
   * 获取提供商的所有实例
   * @param {string} provider - 提供商名称
   * @returns {object[]}
   */
  getProviderInstances(provider) {
    const instances = [];
    
    for (const [key, instance] of this.instances.entries()) {
      if (key.startsWith(`${provider}:`)) {
        instances.push({
          key,
          model: key.split(':')[1],
          info: instance.getInfo()
        });
      }
    }
    
    return instances;
  }

  /**
   * 设置默认提供商
   * @param {string} provider - 提供商名称
   */
  setDefaultProvider(provider) {
    if (!this.adapters.has(provider)) {
      throw new Error(`无法设置默认提供商，未注册: ${provider}`);
    }
    
    this.defaultProvider = provider;
    console.log(`🎯 默认提供商已设置: ${provider}`);
  }

  /**
   * 获取默认提供商
   * @returns {string|null}
   */
  getDefaultProvider() {
    return this.defaultProvider;
  }

  /**
   * 检查提供商是否已注册
   * @param {string} provider - 提供商名称
   * @returns {boolean}
   */
  isRegistered(provider) {
    return this.adapters.has(provider);
  }

  /**
   * 获取注册统计信息
   * @returns {object}
   */
  getStats() {
    return {
      totalProviders: this.adapters.size,
      totalInstances: this.instances.size,
      defaultProvider: this.defaultProvider,
      providers: this.getProviders(),
      instancesByProvider: this.getProviders().reduce((acc, provider) => {
        acc[provider] = this.getProviderInstances(provider).length;
        return acc;
      }, {})
    };
  }

  /**
   * 清理所有实例
   */
  async cleanup() {
    console.log('🧹 开始清理适配器实例...');
    
    for (const [key, instance] of this.instances.entries()) {
      try {
        await instance.destroy();
        console.log(`✅ 实例已销毁: ${key}`);
      } catch (error) {
        console.error(`❌ 销毁实例失败: ${key}`, error);
      }
    }
    
    this.instances.clear();
    console.log('🧹 适配器实例清理完成');
  }

  /**
   * 健康检查所有实例
   * @returns {Promise<object>}
   */
  async healthCheckAll() {
    const results = {};
    
    for (const [key, instance] of this.instances.entries()) {
      try {
        results[key] = await instance.healthCheck();
      } catch (error) {
        results[key] = {
          healthy: false,
          message: `健康检查失败: ${error.message}`,
          error: error.message
        };
      }
    }
    
    return results;
  }
}

// 创建全局注册中心实例
const globalRegistry = new AdapterRegistry();

module.exports = {
  AdapterRegistry,
  globalRegistry
};