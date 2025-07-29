import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// ES模块中获取__dirname的替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 导入统一配置管理器
import { getGlobalConfig } from '../../../packages/config/index.js';

// 导入类型定义
import type { ModelConfig, AISettings, ChatlogConfig, ScheduleConfig } from '../src/types/index.js';

class ConfigManager {
  private configDir: string;
  private modelSettingsPath: string;
  private aiSettingsPath: string;
  private globalConfig: any;

  constructor() {
    this.configDir = path.join(__dirname, '../config');
    this.modelSettingsPath = path.join(this.configDir, 'model-settings.json');
    this.aiSettingsPath = path.join(this.configDir, 'ai-settings.json');
    
    // 确保配置目录存在
    this.ensureConfigDir();
    
    // 获取全局配置管理器
    this.globalConfig = getGlobalConfig();
  }

  ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * 获取模型配置
   */
  async getModelConfig(): Promise<ModelConfig> {
    try {
      if (fs.existsSync(this.modelSettingsPath)) {
        const settings = JSON.parse(fs.readFileSync(this.modelSettingsPath, 'utf8'));
        return {
          provider: settings.modelProvider || 'DeepSeek',
          config: settings[settings.modelProvider?.toLowerCase() || 'deepseek'] || {}
        };
      }

      // 默认配置
      return {
        provider: 'DeepSeek',
        config: {
          model: 'deepseek-reasoner',
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: 'https://api.deepseek.com/v1'
        }
      };
    } catch (error) {
      console.error('读取模型配置失败:', error);
      return this.getDefaultModelConfig();
    }
  }

  /**
   * 保存模型配置
   */
  async saveModelConfig(config: ModelConfig): Promise<any> {
    try {
      const settings = {
        modelProvider: config.provider,
        [config.provider.toLowerCase()]: config.config,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(this.modelSettingsPath, JSON.stringify(settings, null, 2));
      return settings;
    } catch (error) {
      console.error('保存模型配置失败:', error);
      throw new Error('配置保存失败');
    }
  }

  /**
   * 获取AI分析配置
   */
  async getAISettings(): Promise<AISettings> {
    try {
      if (fs.existsSync(this.aiSettingsPath)) {
        return JSON.parse(fs.readFileSync(this.aiSettingsPath, 'utf8'));
      }

      // 默认AI设置
      const defaultSettings: AISettings = {
        systemPrompt: `你是一个专业的数据分析师和前端开发工程师。请根据提供的聊天数据，生成一个完整的、可直接运行的HTML页面。

要求：
1. HTML页面必须完整，包含DOCTYPE、html、head、body等标签
2. CSS样式直接写在<style>标签内
3. JavaScript代码直接写在<script>标签内
4. 使用CDN引入必要的图表库（如Chart.js、D3.js等）
5. 页面要美观、专业、响应式
6. 包含真实的数据分析和可视化
7. 不要使用任何外部文件引用
8. 使用暖色系设计风格

直接返回完整的HTML代码，不要有任何其他说明文字。`,
        maxTokens: 64000,
        temperature: 1.0,
        timeout: 300000,
        retryAttempts: 3,
        retryDelay: 5000
      };

      await this.saveAISettings(defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('读取AI设置失败:', error);
      throw new Error('获取AI设置失败');
    }
  }

  /**
   * 保存AI分析配置
   */
  async saveAISettings(settings: AISettings): Promise<AISettings & { updatedAt: string }> {
    try {
      const configWithTimestamp = {
        ...settings,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(this.aiSettingsPath, JSON.stringify(configWithTimestamp, null, 2));
      return configWithTimestamp;
    } catch (error) {
      console.error('保存AI设置失败:', error);
      throw new Error('AI设置保存失败');
    }
  }

  /**
   * 获取默认模型配置
   */
  getDefaultModelConfig(): ModelConfig {
    return {
      provider: 'DeepSeek',
      config: {
        model: 'deepseek-reasoner',
        apiKey: process.env.DEEPSEEK_API_KEY || '',
        baseURL: 'https://api.deepseek.com/v1'
      }
    };
  }

  /**
   * 获取定时任务配置
   */
  async getScheduleConfig(): Promise<ScheduleConfig> {
    return {
      enabled: process.env.ENABLE_SCHEDULED_ANALYSIS === 'true',
      cronTime: process.env.SCHEDULED_ANALYSIS_TIME || '0 0 8 * * *',
      maxConcurrent: parseInt(process.env.MAX_CONCURRENT_ANALYSIS as string) || 2,
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS as string) || 3,
      retryDelay: parseInt(process.env.RETRY_DELAY as string) || 1000
    };
  }

  /**
   * 获取Chatlog API配置
   */
  getChatlogConfig(): ChatlogConfig {
    return {
      baseURL: this.globalConfig.get('services.chatlog.baseURL') || 'http://127.0.0.1:5030',
      timeout: this.globalConfig.get('services.chatlog.timeout', 10000)
    };
  }

  /**
   * 验证配置完整性
   */
  async validateConfig(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // 检查模型配置
    const modelConfig = await this.getModelConfig();
    if (!modelConfig.config.apiKey) {
      issues.push(`缺少${modelConfig.provider} API密钥`);
    }

    // 检查Chatlog连接
    const chatlogConfig = this.getChatlogConfig();
    if (!chatlogConfig.baseURL) {
      issues.push('缺少Chatlog API地址');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export default ConfigManager;