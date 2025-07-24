/**
 * 企业级多模型适配器架构使用示例
 */

const {
  initializeAdapterSystem,
  createQuickAdapter,
  smartChat,
  getSystemStatus,
  globalAdapterManager,
  globalConfigManager,
  Message,
  ChatOptions
} = require('../index');

/**
 * 示例1: 基础使用
 */
async function basicUsageExample() {
  console.log('📝 示例1: 基础使用');
  
  try {
    // 初始化系统
    await initializeAdapterSystem();
    
    // 创建OpenAI适配器
    const openaiAdapter = await createQuickAdapter(
      'OpenAI', 
      'gpt-3.5-turbo',
      process.env.OPENAI_API_KEY
    );
    
    // 发送聊天请求
    const messages = [
      new Message('user', '你好，请介绍一下你自己')
    ];
    
    const response = await openaiAdapter.chat(messages, new ChatOptions({
      maxTokens: 100,
      temperature: 0.7
    }));
    
    console.log('AI回复:', response.content);
    console.log('使用令牌:', response.metadata.usage.totalTokens);
    console.log('响应时间:', response.metadata.duration + 'ms');
    
  } catch (error) {
    console.error('基础使用示例失败:', error.message);
  }
}

/**
 * 示例2: 智能路由
 */
async function smartRoutingExample() {
  console.log('📝 示例2: 智能路由');
  
  try {
    await initializeAdapterSystem();
    
    // 成本优化请求
    const costOptimizedResponse = await smartChat(
      [new Message('user', '简单问题：1+1等于几？')],
      { costOptimized: true, maxTokens: 10 }
    );
    
    console.log('成本优化回复:', costOptimizedResponse.content);
    
    // 性能优化请求
    const performanceOptimizedResponse = await smartChat(
      [new Message('user', '复杂问题：请详细解释量子计算的原理')],
      { performanceOptimized: true, maxTokens: 500 }
    );
    
    console.log('性能优化回复:', performanceOptimizedResponse.content);
    
  } catch (error) {
    console.error('智能路由示例失败:', error.message);
  }
}

/**
 * 示例3: 配置管理
 */
async function configManagementExample() {
  console.log('📝 示例3: 配置管理');
  
  try {
    await initializeAdapterSystem();
    
    // 添加新的模型配置
    await globalConfigManager.setConfig('OpenAI', 'gpt-4', {
      provider: 'OpenAI',
      model: 'gpt-4',
      endpoint: 'https://api.openai.com/v1',
      apiKey: process.env.OPENAI_API_KEY,
      maxTokens: 8192,
      temperature: 0.7,
      costPer1kTokens: 0.03,
      enabled: true,
      priority: 1
    });
    
    // 获取配置统计
    const stats = globalConfigManager.getStats();
    console.log('配置统计:', stats);
    
    // 获取启用的配置
    const enabledConfigs = globalConfigManager.getEnabledConfigs();
    console.log('启用的配置:', Object.keys(enabledConfigs));
    
  } catch (error) {
    console.error('配置管理示例失败:', error.message);
  }
}

/**
 * 示例4: 健康检查和监控
 */
async function healthCheckExample() {
  console.log('📝 示例4: 健康检查和监控');
  
  try {
    await initializeAdapterSystem();
    
    // 创建适配器
    const adapter = await createQuickAdapter(
      'OpenAI',
      'gpt-3.5-turbo',
      process.env.OPENAI_API_KEY
    );
    
    // 执行健康检查
    const healthResult = await adapter.healthCheck();
    console.log('健康检查结果:', healthResult);
    
    // 获取性能指标
    const metrics = adapter.getMetrics();
    console.log('性能指标:', metrics);
    
    // 获取系统状态
    const systemStatus = getSystemStatus();
    console.log('系统状态:', systemStatus);
    
  } catch (error) {
    console.error('健康检查示例失败:', error.message);
  }
}

/**
 * 示例5: 错误处理和重试
 */
async function errorHandlingExample() {
  console.log('📝 示例5: 错误处理和重试');
  
  try {
    await initializeAdapterSystem();
    
    // 使用无效的API密钥测试错误处理
    const adapter = await createQuickAdapter(
      'OpenAI',
      'gpt-3.5-turbo',
      'invalid-api-key'
    );
    
    try {
      await adapter.chat([new Message('user', '测试')]);
    } catch (error) {
      console.log('捕获到错误:', error.message);
      console.log('错误建议:', error.suggestions);
    }
    
  } catch (error) {
    console.error('错误处理示例失败:', error.message);
  }
}

/**
 * 示例6: 流式响应
 */
async function streamingExample() {
  console.log('📝 示例6: 流式响应');
  
  try {
    await initializeAdapterSystem();
    
    const adapter = await createQuickAdapter(
      'OpenAI',
      'gpt-3.5-turbo',
      process.env.OPENAI_API_KEY
    );
    
    const messages = [
      new Message('user', '请写一首关于春天的诗')
    ];
    
    console.log('开始流式响应:');
    
    for await (const chunk of adapter.stream(messages)) {
      if (chunk.isComplete) {
        console.log('\n流式响应完成');
        console.log('总令牌数:', chunk.metadata.totalTokens);
        break;
      } else {
        process.stdout.write(chunk.content);
      }
    }
    
  } catch (error) {
    console.error('流式响应示例失败:', error.message);
  }
}

/**
 * 示例7: 多适配器并发
 */
async function concurrentAdaptersExample() {
  console.log('📝 示例7: 多适配器并发');
  
  try {
    await initializeAdapterSystem();
    
    const openaiAdapter = await createQuickAdapter(
      'OpenAI',
      'gpt-3.5-turbo',
      process.env.OPENAI_API_KEY
    );
    
    const deepseekAdapter = await createQuickAdapter(
      'DeepSeek',
      'deepseek-chat',
      process.env.DEEPSEEK_API_KEY
    );
    
    const question = '什么是人工智能？';
    const messages = [new Message('user', question)];
    
    // 并发请求多个模型
    const [openaiResponse, deepseekResponse] = await Promise.allSettled([
      openaiAdapter.chat(messages),
      deepseekAdapter.chat(messages)
    ]);
    
    console.log('OpenAI回复:', openaiResponse.status === 'fulfilled' ? 
      openaiResponse.value.content : openaiResponse.reason.message);
    
    console.log('DeepSeek回复:', deepseekResponse.status === 'fulfilled' ? 
      deepseekResponse.value.content : deepseekResponse.reason.message);
    
  } catch (error) {
    console.error('并发适配器示例失败:', error.message);
  }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('🚀 开始运行企业级多模型适配器架构示例\n');
  
  const examples = [
    basicUsageExample,
    smartRoutingExample,
    configManagementExample,
    healthCheckExample,
    errorHandlingExample,
    streamingExample,
    concurrentAdaptersExample
  ];
  
  for (const example of examples) {
    try {
      await example();
      console.log('✅ 示例执行成功\n');
    } catch (error) {
      console.error('❌ 示例执行失败:', error.message, '\n');
    }
  }
  
  console.log('🎉 所有示例执行完成');
}

// 如果直接运行此文件，则执行所有示例
if (require.main === module) {
  runAllExamples().catch(console.error);
}

module.exports = {
  basicUsageExample,
  smartRoutingExample,
  configManagementExample,
  healthCheckExample,
  errorHandlingExample,
  streamingExample,
  concurrentAdaptersExample,
  runAllExamples
};