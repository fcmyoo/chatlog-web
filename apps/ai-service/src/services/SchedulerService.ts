import ConfigManager from '../config/ConfigManager.js';

// 导入类型定义
import type { ScheduleConfig } from '../types/index.js';

class SchedulerService {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = new ConfigManager();
  }

  /**
   * 获取定时任务配置
   */
  async getConfig(): Promise<ScheduleConfig> {
    return await this.configManager.getScheduleConfig();
  }

  /**
   * 更新定时任务配置
   */
  async updateConfig(newConfig: ScheduleConfig): Promise<ScheduleConfig> {
    // 更新配置逻辑
    // 这里可以添加具体的更新逻辑
    return newConfig;
  }

  /**
   * 手动触发定时分析
   */
  async triggerManualAnalysis(): Promise<any> {
    // 触发分析逻辑
    // 这里可以添加具体的触发逻辑
    return { message: '手动分析已触发' };
  }
}

export default SchedulerService;