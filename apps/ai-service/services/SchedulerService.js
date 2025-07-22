const cron = require('node-cron');
const AnalysisService = require('./AnalysisService');
const DataService = require('./DataService');
const ConfigManager = require('../config/ConfigManager');

class SchedulerService {
  constructor() {
    this.analysisService = new AnalysisService();
    this.dataService = new DataService();
    this.configManager = new ConfigManager();
    this.currentJob = null;
    this.isRunning = false;
  }

  /**
   * 初始化定时任务
   */
  async initialize() {
    try {
      const config = await this.getConfig();
      
      if (config.enabled && this.validateCronExpression(config.cronTime)) {
        await this.startScheduler(config);
        console.log('📅 定时任务服务初始化成功');
      } else {
        console.log('⏸️ 定时任务已禁用或配置无效');
      }

    } catch (error) {
      console.error('定时任务初始化失败:', error);
    }
  }

  /**
   * 启动定时任务
   */
  async startScheduler(config) {
    try {
      // 停止现有任务
      if (this.currentJob) {
        this.currentJob.stop();
        this.currentJob = null;
      }

      console.log(`🕐 启动定时任务: ${config.cronTime}`);

      // 创建新的定时任务
      this.currentJob = cron.schedule(config.cronTime, async () => {
        if (!this.isRunning) {
          console.log('\n⏰ 定时分析任务触发');
          await this.runScheduledAnalysis();
        } else {
          console.log('⚠️ 上一次分析仍在进行中，跳过本次执行');
        }
      }, {
        timezone: "Asia/Shanghai",
        scheduled: true
      });

      console.log('✅ 定时任务启动成功');
      return true;

    } catch (error) {
      console.error('启动定时任务失败:', error);
      throw error;
    }
  }

  /**
   * 停止定时任务
   */
  stopScheduler() {
    if (this.currentJob) {
      this.currentJob.stop();
      this.currentJob = null;
      console.log('⏹️ 定时任务已停止');
      return true;
    }
    return false;
  }

  /**
   * 执行定时分析
   */
  async runScheduledAnalysis() {
    if (this.isRunning) {
      console.log('⚠️ 分析任务正在运行中');
      return { success: false, message: '任务正在运行中' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🚀 开始执行定时批量分析...');

      // 获取分析配置项
      const analysisItems = await this.getAnalysisItems();
      
      if (analysisItems.length === 0) {
        console.log('⚠️ 没有配置分析项');
        return { success: true, message: '没有配置分析项', results: [] };
      }

      console.log(`📋 找到 ${analysisItems.length} 个分析项`);

      const results = {
        success: [],
        failed: [],
        skipped: [],
        total: analysisItems.length
      };

      // 逐个执行分析任务
      for (let i = 0; i < analysisItems.length; i++) {
        const item = analysisItems[i];
        
        try {
          console.log(`\n📊 [${i + 1}/${analysisItems.length}] 执行分析: ${item.name}`);
          
          const result = await this.executeAnalysisItem(item);
          
          if (result.success) {
            results.success.push(result);
            console.log(`✅ ${item.name} 分析完成`);
          } else if (result.skipped) {
            results.skipped.push(result);
            console.log(`⏭️ ${item.name} 已跳过: ${result.reason}`);
          } else {
            results.failed.push(result);
            console.log(`❌ ${item.name} 分析失败: ${result.error}`);
          }

          // 任务间隔，避免API频率限制
          if (i < analysisItems.length - 1) {
            const interval = 3000; // 3秒间隔
            console.log(`⏳ 等待 ${interval/1000} 秒后继续...`);
            await new Promise(resolve => setTimeout(resolve, interval));
          }

        } catch (error) {
          console.error(`💥 执行 ${item.name} 时发生异常:`, error);
          results.failed.push({
            ...item,
            success: false,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      const summary = {
        duration: Math.round(duration / 1000),
        total: results.total,
        success: results.success.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      };

      console.log('\n📊 定时分析完成汇总:');
      console.log(`⏱️ 总耗时: ${summary.duration} 秒`);
      console.log(`✅ 成功: ${summary.success} 个`);
      console.log(`⏭️ 跳过: ${summary.skipped} 个`);
      console.log(`❌ 失败: ${summary.failed} 个`);

      return {
        success: true,
        summary,
        results
      };

    } catch (error) {
      console.error('❌ 定时分析执行失败:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 执行单个分析项
   */
  async executeAnalysisItem(item) {
    try {
      // 计算时间范围（默认分析昨天的数据）
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const timeRange = yesterday.toISOString().split('T')[0] + '~' + 
                       yesterday.toISOString().split('T')[0];

      // 检查是否有数据
      const chatData = await this.dataService.getChatData(item.groupName, timeRange);
      
      if (!chatData || chatData.length === 0) {
        return {
          ...item,
          success: false,
          skipped: true,
          reason: '无聊天数据',
          timeRange
        };
      }

      // 执行分析
      const result = await this.analysisService.performAnalysis({
        groupName: item.groupName,
        analysisType: item.analysisType,
        customPrompt: item.customPrompt,
        timeRange
      });

      return {
        ...item,
        success: true,
        historyId: result.historyId,
        title: result.title,
        messageCount: chatData.length,
        timeRange
      };

    } catch (error) {
      console.error(`分析项执行失败:`, error);
      return {
        ...item,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取分析配置项
   */
  async getAnalysisItems() {
    // 这里应该从配置文件或数据库中读取
    // 暂时返回示例配置
    return [
      {
        id: 'daily-programming',
        name: '编程技术群日报',
        groupName: '技术交流群',
        analysisType: 'programming',
        customPrompt: '请重点分析今日的技术讨论内容，包括新技术分享、问题解答等'
      }
      // 可以在配置文件中定义更多分析项
    ];
  }

  /**
   * 手动触发分析
   */
  async triggerManualAnalysis() {
    console.log('🔄 手动触发定时分析');
    return await this.runScheduledAnalysis();
  }

  /**
   * 获取定时任务配置
   */
  async getConfig() {
    return await this.configManager.getScheduleConfig();
  }

  /**
   * 更新定时任务配置
   */
  async updateConfig(newConfig) {
    try {
      // 验证配置
      if (newConfig.enabled && !this.validateCronExpression(newConfig.cronTime)) {
        throw new Error('Cron表达式格式无效');
      }

      // 更新环境变量或配置文件
      process.env.ENABLE_SCHEDULED_ANALYSIS = newConfig.enabled.toString();
      process.env.SCHEDULED_ANALYSIS_TIME = newConfig.cronTime;
      process.env.MAX_CONCURRENT_ANALYSIS = newConfig.maxConcurrent?.toString() || '2';

      // 重启定时任务
      if (newConfig.enabled) {
        await this.startScheduler(newConfig);
      } else {
        this.stopScheduler();
      }

      console.log('✅ 定时任务配置已更新');
      
      return {
        success: true,
        message: '配置更新成功',
        config: newConfig
      };

    } catch (error) {
      console.error('更新定时任务配置失败:', error);
      throw error;
    }
  }

  /**
   * 验证Cron表达式
   */
  validateCronExpression(cronExpression) {
    try {
      return cron.validate(cronExpression);
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取定时任务状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasActiveJob: !!this.currentJob,
      jobScheduled: this.currentJob?.scheduled || false,
      nextRun: this.currentJob ? this.getNextRunTime() : null
    };
  }

  /**
   * 获取下次运行时间
   */
  getNextRunTime() {
    if (!this.currentJob) return null;
    
    try {
      // 这里需要根据cron表达式计算下次运行时间
      // 简化实现，返回当前时间加1小时
      const nextRun = new Date();
      nextRun.setHours(nextRun.getHours() + 1);
      return nextRun.toISOString();
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取执行历史
   */
  async getExecutionHistory(limit = 10) {
    // 这里应该从日志文件或数据库中读取执行历史
    // 暂时返回空数组
    return [];
  }
}

module.exports = SchedulerService;