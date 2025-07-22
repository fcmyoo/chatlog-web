const express = require('express');
const router = express.Router();
const AIService = require('../services/AIService');
const AnalysisService = require('../services/AnalysisService');
const SchedulerService = require('../services/SchedulerService');

// 创建AI服务实例
const aiService = new AIService();
const analysisService = new AnalysisService();
const schedulerService = new SchedulerService();

/**
 * POST /api/ai/analysis
 * 执行AI分析
 */
router.post('/analysis', async (req, res) => {
  try {
    const { groupName, analysisType, customPrompt, timeRange } = req.body;

    // 参数验证
    if (!groupName) {
      return res.status(400).json({
        success: false,
        error: '请指定群聊名称'
      });
    }

    if (!analysisType || !['programming', 'science', 'reading', 'custom'].includes(analysisType)) {
      return res.status(400).json({
        success: false,
        error: '请选择有效的分析类型'
      });
    }

    console.log(`🔄 开始AI分析: ${groupName} - ${analysisType}`);

    // 执行分析
    const result = await analysisService.performAnalysis({
      groupName,
      analysisType,
      customPrompt,
      timeRange: timeRange || '2024-01-01~2025-12-31'
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('AI分析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI分析失败',
      suggestions: error.suggestions || []
    });
  }
});

/**
 * GET /api/ai/history
 * 获取分析历史
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, analysisType, groupName } = req.query;
    
    const result = await analysisService.getAnalysisHistory({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      analysisType,
      groupName
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取分析历史失败:', error);
    res.status(500).json({
      success: false,
      error: '获取历史记录失败'
    });
  }
});

/**
 * GET /api/ai/history/:id
 * 获取特定分析结果
 */
router.get('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await analysisService.getAnalysisById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '分析记录不存在'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取分析结果失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分析结果失败'
    });
  }
});

/**
 * POST /api/ai/models/test
 * 测试AI模型连接
 */
router.post('/models/test', async (req, res) => {
  try {
    const { provider, model, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    const result = await aiService.testConnection(provider, {
      model: model || 'default',
      apiKey
    });

    res.json(result);

  } catch (error) {
    console.error('模型连接测试失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '连接测试失败'
    });
  }
});

/**
 * GET /api/ai/models/config
 * 获取当前模型配置
 */
router.get('/models/config', async (req, res) => {
  try {
    const config = await aiService.getCurrentConfig();
    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('获取模型配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取配置失败'
    });
  }
});

/**
 * POST /api/ai/models/config
 * 更新模型配置
 */
router.post('/models/config', async (req, res) => {
  try {
    const config = req.body;
    const result = await aiService.updateConfig(config);
    
    res.json({
      success: true,
      message: '配置更新成功',
      data: result
    });

  } catch (error) {
    console.error('更新模型配置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '配置更新失败'
    });
  }
});

/**
 * GET /api/ai/schedule/config
 * 获取定时任务配置
 */
router.get('/schedule/config', async (req, res) => {
  try {
    const config = await schedulerService.getConfig();
    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('获取定时任务配置失败:', error);
    res.status(500).json({
      success: false,
      error: '获取定时任务配置失败'
    });
  }
});

/**
 * POST /api/ai/schedule/config
 * 更新定时任务配置
 */
router.post('/schedule/config', async (req, res) => {
  try {
    const config = req.body;
    const result = await schedulerService.updateConfig(config);
    
    res.json({
      success: true,
      message: '定时任务配置更新成功',
      data: result
    });

  } catch (error) {
    console.error('更新定时任务配置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '定时任务配置更新失败'
    });
  }
});

/**
 * POST /api/ai/schedule/trigger
 * 手动触发定时分析
 */
router.post('/schedule/trigger', async (req, res) => {
  try {
    const result = await schedulerService.triggerManualAnalysis();
    
    res.json({
      success: true,
      message: '手动分析已触发',
      data: result
    });

  } catch (error) {
    console.error('手动触发分析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '触发分析失败'
    });
  }
});

/**
 * GET /api/ai/analysis-types
 * 获取支持的分析类型
 */
router.get('/analysis-types', (req, res) => {
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

module.exports = router;