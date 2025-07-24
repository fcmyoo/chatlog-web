/**
 * 企业级多模型适配器架构入口文件
 * 统一导出所有适配器组件
 */

// 核心组件
const AdapterManager = require('./AdapterManager');
const { AdapterRegistry, globalRegistry } = require('./AdapterRegistry');
const { ModelConfigManager, globalConfigManager } = require('./config/ModelConfigManager');

// 接口和基类
const { 
  AIModelAdapter, 
  Message, 
  ChatOptions, 
  StreamOptions, 
  ChatResponse, 
  ChatChunk, 
  ModelCapabilities, 
  ModelMetrics 
} = require('./interfaces/AIModelAdapter');
const BaseAdapter = require('./base/BaseAdapter');

// 适配器实现
const OpenAIAdapter = require('./implementations/OpenAIAdapter');
const DeepSeekAdapter = require('./implementations/DeepSeekAdapter');

// 创建全局管理器实例
const globalAdapterManager = new AdapterManager();

/**
 * 初始化适配器系统
 */
async function initializeAdapterSystem() {
  try {
    console.log('🚀 初始化企业级多模型适配器系统...');
    
    await globalAdapterManager.initialize();
    
    console.log('✅ 适配器系统初始化完成');
    return globalAdapterManager;
    
  } catch (error) {
    console.error('❌ 适配器系统初始化失败:', error);
    throw error;
  }
}

/**
 * 快速创建适配器
 */
async function createQuickAdapter(provider, model, apiKey) {
  const config = {
    provider,
    model,
    apiKey,
    enabled: true
  };
  
  return await globalAdapterManager.createAdapter(provider, model, config);
}

/**
 * 智能聊天接口
 * 自动选择最佳适配器
 */
async function smartChat(messages, options = {}) {
  const request = { messages, options };
  const selectedProvider = await globalAdapterManager.selectAdapter(request);
  
  const adapter = await globalAdapterManager.createAdapter(
    selectedProvider.provider, 
    selectedProvider.model
  );
  
  return await adapter.chat(messages, options);
}

/**
 * 获取系统状态
 */
function getSystemStatus() {
  return {
    manager: globalAdapterManager.getStatus(),
    registry: globalRegistry.getStats(),
    config: globalConfigManager.getStats()
  };
}

/**
 * 销毁适配器系统
 */
async function destroyAdapterSystem() {
  await globalAdapterManager.destroy();
  await globalRegistry.cleanup();
  await globalConfigManager.destroy();
  
  console.log('🧹 适配器系统已完全销毁');
}

module.exports = {
  // 核心组件
  AdapterManager,
  AdapterRegistry,
  ModelConfigManager,
  
  // 全局实例
  globalAdapterManager,
  globalRegistry,
  globalConfigManager,
  
  // 接口和基类
  AIModelAdapter,
  BaseAdapter,
  Message,
  ChatOptions,
  StreamOptions,
  ChatResponse,
  ChatChunk,
  ModelCapabilities,
  ModelMetrics,
  
  // 适配器实现
  OpenAIAdapter,
  DeepSeekAdapter,
  
  // 便捷函数
  initializeAdapterSystem,
  createQuickAdapter,
  smartChat,
  getSystemStatus,
  destroyAdapterSystem
};