import express, { Request, Response } from 'express';
import AIService from '../services/AIService.js';
import AnalysisService from '../services/AnalysisService.js';
import SchedulerService from '../services/SchedulerService.js';

// 导入统一错误处理
import { asyncErrorHandler, ValidationError, BusinessError } from '../middleware/errorHandler.js';

// 导入类型定义
import type { AnalysisType } from '../types/index.js';

const router = express.Router();

// 创建AI服务实例
const aiService = new AIService();
const analysisService = new AnalysisService();
const schedulerService = new SchedulerService();

/**
 * POST /api/ai/analysis
 * 执行AI分析（优化版本）
 */
router.post('/analysis', asyncErrorHandler(async (req: Request, res: Response) => {
  const logger = (req as any).logger || console;
  const { groupName, analysisType, customPrompt, timeRange } = req.body;

  // 参数验证
  if (!groupName) {
    throw new ValidationError('请指定群聊名称');
  }

  if (!analysisType || !['programming', 'science', 'reading', 'custom'].includes(analysisType)) {
    throw new ValidationError('请选择有效的分析类型', {
      validTypes: ['programming', 'science', 'reading', 'custom'],
      provided: analysisType
    });
  }

  logger.info('开始AI分析', {
    groupName,
    analysisType,
    hasCustomPrompt: !!customPrompt,
    timeRange: timeRange || '2024-01-01~2025-12-31'
  });

  // 使用性能优化的请求执行
  const requestId = `analysis_${groupName}_${analysisType}_${Date.now()}`;
  const startTime = Date.now();
  
  try {
    const result = await analysisService.performAnalysis({
      groupName,
      analysisType: analysisType as AnalysisType,
      customPrompt,
      timeRange: timeRange || '2024-01-01~2025-12-31'
    });

    const duration = Date.now() - startTime;
    logger.info('AI分析完成', {
      requestId,
      groupName,
      analysisType,
      duration: `${duration}ms`,
      resultLength: result?.preview?.length || 0
    });

    res.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('AI分析失败', {
      requestId,
      groupName,
      analysisType,
      duration: `${duration}ms`,
      error: error.message
    }, error);
    
    throw error; // 重新抛出错误让错误处理中间件处理
  }
}));

/**
 * GET /api/ai/history
 * 获取分析历史
 */
router.get('/history', asyncErrorHandler(async (req: Request, res: Response) => {
  const { page = 1, pageSize = 10, analysisType, groupName } = req.query;
  
  const result = await analysisService.getAnalysisHistory({
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string),
    analysisType: analysisType as string,
    groupName: groupName as string
  });

  res.json({
    success: true,
    data: result
  });
}));

/**
 * GET /api/ai/history/:id
 * 获取特定分析结果
 */
router.get('/history/:id', asyncErrorHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    throw new ValidationError('请提供分析记录ID');
  }
  
  const result = await analysisService.getAnalysisById(id);

  if (!result) {
    throw new BusinessError('分析记录不存在', { id });
  }

  res.json({
    success: true,
    data: result
  });
}));

/**
 * POST /api/ai/models/test
 * 测试AI模型连接（优化版本）
 */
router.post('/models/test', asyncErrorHandler(async (req: Request, res: Response) => {
  const logger = (req as any).logger || console;
  const { provider, model, apiKey } = req.body;

  if (!provider || !apiKey) {
    throw new ValidationError('缺少必要参数', {
      required: ['provider', 'apiKey'],
      provided: { provider: !!provider, apiKey: !!apiKey }
    });
  }

  logger.info('开始测试AI模型连接', {
    provider,
    model: model || 'default',
    hasApiKey: !!apiKey
  });

  // 使用性能优化的连接测试
  const requestId = `model_test_${provider}_${model || 'default'}`;
  const startTime = Date.now();
  
  try {
    const result = await aiService.testConnection(provider, {
      model: model || 'default',
      apiKey
    });
    
    const duration = Date.now() - startTime;
    logger.info('AI模型连接测试完成', {
      requestId,
      provider,
      model: model || 'default',
      duration: `${duration}ms`,
      success: result.success
    });

    res.json(result);
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('AI模型连接测试失败', {
      requestId,
      provider,
      model: model || 'default',
      duration: `${duration}ms`,
      error: error.message
    }, error);
    
    throw error;
  }
}));

/**
 * GET /api/ai/models/config
 * 获取当前模型配置
 */
router.get('/models/config', asyncErrorHandler(async (req: Request, res: Response) => {
  const config = await aiService.getCurrentConfig();
  res.json({
    success: true,
    data: config
  });
}));

/**
 * POST /api/ai/models/config
 * 更新模型配置
 */
router.post('/models/config', asyncErrorHandler(async (req: Request, res: Response) => {
  const config = req.body;
  
  if (!config || Object.keys(config).length === 0) {
    throw new ValidationError('请提供有效的配置数据');
  }
  
  const result = await aiService.updateConfig(config);
  
  res.json({
    success: true,
    message: '配置更新成功',
    data: result
  });
}));

/**
 * GET /api/ai/schedule/config
 * 获取定时任务配置
 */
router.get('/schedule/config', asyncErrorHandler(async (req: Request, res: Response) => {
  const config = await schedulerService.getConfig();
  res.json({
    success: true,
    data: config
  });
}));

/**
 * POST /api/ai/schedule/config
 * 更新定时任务配置
 */
router.post('/schedule/config', asyncErrorHandler(async (req: Request, res: Response) => {
  const config = req.body;
  
  if (!config || Object.keys(config).length === 0) {
    throw new ValidationError('请提供有效的配置数据');
  }
  
  const result = await schedulerService.updateConfig(config);
  
  res.json({
    success: true,
    message: '定时任务配置更新成功',
    data: result
  });
}));

/**
 * POST /api/ai/schedule/trigger
 * 手动触发定时分析
 */
router.post('/schedule/trigger', asyncErrorHandler(async (req: Request, res: Response) => {
  const result = await schedulerService.triggerManualAnalysis();
  
  res.json({
    success: true,
    message: '手动分析已触发',
    data: result
  });
}));

/**
 * GET /api/ai/analysis-types
 * 获取支持的分析类型
 */
router.get('/analysis-types', (req: Request, res: Response) => {
  const analysisTypes = {
    programming: {
      name: '编程技术分析',
      description: '分析技术讨论、代码分享、问题解答等内容',
      icon: 'code'
    },
    science: {
      name: '科学学习分析',
      description: '分析科学知识分享、学习讨论等内容',
      icon: 'experiment'
    },
    reading: {
      name: '阅读讨论分析',
      description: '分析书籍推荐、阅读心得、文学讨论等内容',
      icon: 'book'
    },
    custom: {
      name: '自定义分析',
      description: '根据用户自定义提示词进行分析',
      icon: 'setting'
    }
  };

  res.json({
    success: true,
    data: analysisTypes
  });
});

// ==================== 新增：缓存管理API ====================

/**
 * GET /api/ai/cache/stats
 * 获取缓存统计信息
 */
router.get('/cache/stats', asyncErrorHandler(async (req: Request, res: Response) => {
  const stats = await analysisService.getCacheStats();
  res.json({
    success: true,
    data: stats
  });
}));

/**
 * POST /api/ai/cache/clear
 * 清除所有缓存
 */
router.post('/cache/clear', asyncErrorHandler(async (req: Request, res: Response) => {
  await analysisService.clearCache();
  res.json({
    success: true,
    message: '缓存已清除'
  });
}));

/**
 * POST /api/ai/cache/preload
 * 预加载常用数据（优化版本）
 */
router.post('/cache/preload', asyncErrorHandler(async (req: Request, res: Response) => {
  const { groupNames, timeRange } = req.body;
  
  if (!groupNames || !Array.isArray(groupNames)) {
    throw new ValidationError('请提供有效的群聊名称列表', {
      expected: 'Array<string>',
      received: typeof groupNames
    });
  }

  // 使用批量请求优化预加载
  const preloadRequests = groupNames.map((groupName: string) => ({
    id: `preload_${groupName}`,
    fn: () => analysisService.preloadCommonData([groupName], timeRange),
    options: {
      priority: 'low',
      cache: true,
      ttl: 30 * 60 * 1000, // 30分钟缓存
      tags: ['preload', `group_${groupName}`]
    }
  }));

  // 异步执行批量预加载
  if ((req as any).batchRequest) {
    (req as any).batchRequest(preloadRequests, {
      batchSize: 3,
      delay: 100
    })
      .then(() => console.log('✅ 预加载任务完成'))
      .catch((error: any) => console.error('❌ 预加载任务失败:', error));
  } else {
    // 直接执行预加载
    analysisService.preloadCommonData(groupNames, timeRange)
      .then(() => console.log('✅ 预加载任务完成'))
      .catch((error: any) => console.error('❌ 预加载任务失败:', error));
  }

  res.json({
    success: true,
    message: '预加载任务已启动',
    data: {
      groupCount: groupNames.length,
      timeRange: timeRange || '2024-01-01~2025-12-31'
    }
  });
}));

/**
 * GET /api/ai/system/health
 * 系统健康检查
 */
router.get('/system/health', asyncErrorHandler(async (req: Request, res: Response) => {
  const healthStatus = await analysisService.getSystemHealth();
  res.json({
    success: true,
    data: healthStatus
  });
}));

export default router;