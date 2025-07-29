import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import ConfigManager from '../config/ConfigManager.js';

// 导入类型定义
import type { ModelConfig } from '../types/index.js';

class AIService {
  private configManager: ConfigManager;
  private models: Map<string, any>;

  constructor() {
    this.configManager = new ConfigManager();
    this.models = new Map();
  }

  /**
   * 获取或创建AI模型实例
   */
  async getModel(provider: string, config: any): Promise<any> {
    const key = `${provider}-${config.model}`;
    
    if (this.models.has(key)) {
      return this.models.get(key);
    }

    let model;

    try {
      switch (provider) {
        case 'DeepSeek':
          model = new ChatOpenAI({
            modelName: config.model || 'deepseek-reasoner',
            openAIApiKey: config.apiKey,
            configuration: {
              baseURL: config.baseURL || 'https://api.deepseek.com/v1'
            },
            temperature: 1.0,
            maxTokens: 64000,
            timeout: 300000
          });
          break;

        case 'Gemini':
          model = new ChatGoogleGenerativeAI({
            apiKey: config.apiKey,
            model: config.model || 'gemini-2.5-pro',
            maxOutputTokens: 32768,
            temperature: 1.0
          });
          break;

        default:
          throw new Error(`不支持的AI提供商: ${provider}`);
      }

      this.models.set(key, model);
      return model;
      
    } catch (error) {
      console.error(`创建${provider}模型失败:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`模型初始化失败: ${errorMessage}`);
    }
  }

  /**
   * 调用AI进行分析
   */
  async callAI(prompt: string, systemPrompt: string, retryCount: number = 0): Promise<string> {
    const maxRetries = 3;
    const baseDelay = 5000;

    try {
      console.log(`🤖 AI调用 (第${retryCount + 1}次尝试)`);
      console.log('提示词长度:', prompt.length);

      const modelConfig = await this.configManager.getModelConfig();
      const model = await this.getModel(modelConfig.provider, modelConfig.config);

      // 构建消息
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ];

      // 调用模型
      const startTime = Date.now();
      const response = await model.invoke(messages);
      const duration = Date.now() - startTime;

      console.log(`✅ AI响应成功 (${duration}ms)`);
      return response.content;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ AI调用失败 (第${retryCount + 1}次):`, errorMessage);

      // 重试逻辑
      const shouldRetry = retryCount < maxRetries && this.isRetryableError(error);
      
      if (shouldRetry) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`⏳ ${delay / 1000}秒后进行第${retryCount + 2}次重试...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return await this.callAI(prompt, systemPrompt, retryCount + 1);
      }

      throw this.enhanceError(error);
    }
  }

  /**
   * 判断是否为可重试错误
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'ECONNABORTED',
      'socket hang up',
      'ECONNRESET', 
      'ETIMEDOUT',
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
   * 增强错误信息
   */
  private enhanceError(error: any): Error {
    let errorMessage = error.message || '未知错误';
    let suggestions: string[] = [];

    if (error.code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
      errorMessage = '分析超时，数据量过大导致处理时间过长';
      suggestions = [
        '建议缩小时间范围',
        '尝试分批次分析',
        '或稍后重试'
      ];
    } else if (errorMessage.includes('socket hang up') || errorMessage.includes('ECONNRESET')) {
      errorMessage = 'AI服务连接中断，通常是由于服务器负载过高';
      suggestions = [
        '🔄 系统已自动重试3次，建议稍等1-2分钟后再试',
        '🔀 建议切换到DeepSeek模型（通常更稳定且支持更大数据量）',
        '⏰ 避开高峰时段（如晚上8-10点）进行分析',
        '📱 检查网络连接是否稳定'
      ];
    } else if (error.response?.status === 401) {
      errorMessage = 'API密钥无效，请检查配置';
      suggestions = ['请在设置中验证API密钥是否正确'];
    } else if (error.response?.status === 429) {
      errorMessage = 'API调用频率超限，请稍后重试';
      suggestions = ['建议等待一段时间后重试'];
    }

    const enhancedError = new Error(errorMessage);
    (enhancedError as any).suggestions = suggestions;
    (enhancedError as any).originalError = error;
    
    return enhancedError;
  }

  /**
   * 测试模型连接
   */
  async testConnection(provider: string, config: any): Promise<any> {
    try {
      const model = await this.getModel(provider, config);
      
      const testMessage = '测试连接';
      const messages = [new HumanMessage(testMessage)];
      
      const startTime = Date.now();
      const response = await model.invoke(messages);
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: '连接测试成功',
        response: response.content,
        duration,
        provider,
        model: config.model
      };

    } catch (error) {
      console.error(`${provider}连接测试失败:`, error);
      return this.handleTestError(error);
    }
  }

  /**
   * 处理测试错误
   */
  private handleTestError(error: any): any {
    if (error.response?.status === 401) {
      return { 
        success: false, 
        error: 'API密钥无效，请检查密钥配置' 
      };
    } else if (error.response?.status === 429) {
      return { 
        success: false, 
        error: 'API调用频率超限，请稍后重试' 
      };
    } else if (error.code === 'ECONNABORTED') {
      return { 
        success: false, 
        error: '连接超时，请检查网络连接' 
      };
    } else {
      return { 
        success: false, 
        error: `连接失败: ${error.message}` 
      };
    }
  }

  /**
   * 获取当前配置
   */
  async getCurrentConfig(): Promise<ModelConfig> {
    return await this.configManager.getModelConfig();
  }

  /**
   * 更新配置
   */
  async updateConfig(newConfig: any): Promise<any> {
    // 清除缓存的模型实例
    this.models.clear();
    
    // 保存新配置
    const savedConfig = await this.configManager.saveModelConfig(newConfig);
    
    // 测试新配置
    const testResult = await this.testConnection(newConfig.provider, newConfig.config);
    
    return {
      config: savedConfig,
      testResult
    };
  }

  /**
   * 获取可用的模型列表
   */
  getAvailableModels(): any {
    return {
      DeepSeek: {
        name: 'DeepSeek',
        models: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '通用对话模型' },
          { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: '推理增强模型（推荐）' },
          { id: 'deepseek-coder', name: 'DeepSeek Coder', description: '代码专用模型' }
        ]
      },
      Gemini: {
        name: 'Gemini',
        models: [
          { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: '高性能多模态模型' },
          { id: 'gemini-pro', name: 'Gemini Pro', description: '标准版本' }
        ]
      }
    };
  }

  /**
   * 获取模型状态
   */
  async getModelStatus(): Promise<any> {
    const config = await this.getCurrentConfig();
    
    return {
      currentProvider: config.provider,
      currentModel: config.config.model,
      hasApiKey: !!config.config.apiKey,
      modelsLoaded: this.models.size,
      availableProviders: Object.keys(this.getAvailableModels())
    };
  }
}

export default AIService;