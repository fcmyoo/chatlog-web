import express from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// ES模块中获取__dirname的替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// 导入统一配置管理器和向后兼容的服务配置 (使用createRequire处理CommonJS模块)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { getGlobalConfig } from '../../packages/config/index.js';
const { services } = require('../../packages/config/services.js');

// 导入统一错误处理
import { errorMiddleware, notFoundHandler } from './middleware/errorHandler.js';

// 导入性能优化中间件
import { createAIServiceMiddleware, createMetricsEndpoint, createHealthCheck } from '../../packages/performance/middleware.js';

// 导入可观测性系统
import { ObservabilityManager } from '../../packages/observability/index.js';

const app = express();
const PORT = services.ai.port;

// 初始化全局配置管理器（使用已配置的安全设置）
const configManager = getGlobalConfig();

// 初始化性能优化中间件
let performanceMiddleware;

// 初始化可观测性管理器
let observabilityManager;

async function initializeApp() {
  try {
    console.log('🔄 开始初始化应用...')
    
    // 使用全局配置管理器（已禁用验证）
    console.log('📊 获取配置管理器...')
    console.log('✅ 配置管理器就绪')
    
    const config = configManager.getAll();
    console.log('📊 获取配置完成')
    console.log('🔍 配置结构检查:', Object.keys(config));
    
    // 初始化可观测性系统
    console.log('📊 初始化可观测性系统...')
    observabilityManager = new ObservabilityManager({
      logging: {
        console: true,
        consoleLevel: process.env.NODE_ENV === 'production' ? 2 : 1, // INFO in prod, DEBUG in dev
        file: {
          path: './logs/ai-service',
          level: 2, // INFO
          maxSize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5
        }
      },
      monitoring: {
        interval: 15000 // 15秒收集一次系统指标
      },
      errorTracking: {
        enabled: true,
        captureUnhandled: true,
        errorRateThreshold: 15, // 每分钟15个错误触发告警
        criticalErrorThreshold: 1
      }
    });
    console.log('✅ 可观测性系统初始化完成')
    
    // 启动可观测性系统
    console.log('📊 启动可观测性系统...')
    const observabilityStarted = observabilityManager.start();
    if (observabilityStarted) {
      console.log('📊 可观测性系统已启用');
    } else {
      console.warn('⚠️ 可观测性系统启动失败，将以基础模式运行');
    }
    console.log('✅ 可观测性系统启动完成')
    
    console.log('📊 创建性能中间件...')
    // 创建性能中间件
    performanceMiddleware = createAIServiceMiddleware(config);
    console.log('✅ 性能中间件创建完成')
    
    console.log('📊 应用可观测性中间件...')
    // 应用可观测性中间件
    const obsMiddleware = observabilityManager.createMiddleware();
    app.use(obsMiddleware.requestLogging);
    app.use(obsMiddleware.metricsCollection);
    console.log('✅ 可观测性中间件应用完成')
    
    console.log('📊 应用性能中间件...')
    // 应用性能中间件
    app.use(performanceMiddleware);
    console.log('✅ 性能中间件应用完成')
    
    console.log('🚀 性能优化模块已启用');
    console.log('🎉 应用初始化完成');
  } catch (error) {
    console.error('❌ 系统初始化失败:', error.message);
    console.log('⚠️ 将以基础模式运行');
  }
}

// 中间件
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [`http://localhost:${services.frontend.port}`] 
    : [`http://localhost:${services.frontend.port}`, `http://127.0.0.1:${services.frontend.port}`],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, 'static')));

// 性能监控端点
app.get('/metrics', (req, res, next) => {
  if (observabilityManager) {
    // 返回 Prometheus 格式的指标
    const metrics = observabilityManager.getMetricsPrometheus();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } else if (performanceMiddleware) {
    return createMetricsEndpoint(performanceMiddleware)(req, res);
  } else {
    res.status(503).json({ error: '监控系统不可用' });
  }
});

// 增强的健康检查
app.get('/health', async (req, res, next) => {
  try {
    if (observabilityManager) {
      const status = await observabilityManager.getStatus();
      const httpStatus = status.health.status === 'healthy' ? 200 : 503;
      res.status(httpStatus).json(status);
    } else if (performanceMiddleware) {
      return createHealthCheck(performanceMiddleware)(req, res);
    } else {
      // 基础健康检查
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'Chatlog Web AI Server',
        observability: 'disabled',
        performance: 'disabled'
      });
    }
  } catch (error) {
    if (observabilityManager) {
      observabilityManager.captureError(error, {
        component: 'health-check',
        endpoint: '/health'
      });
    }
    res.status(500).json({
      status: 'error',
      message: '健康检查失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 错误统计端点
app.get('/errors', async (req, res, next) => {
  try {
    if (!observabilityManager) {
      return res.status(503).json({ error: '错误追踪系统不可用' });
    }
    
    const { severity, type, limit = 50 } = req.query;
    const errors = observabilityManager.errorTracker.getAggregatedErrors({
      severity,
      type
    }).slice(0, limit);
    
    const stats = observabilityManager.errorTracker.getStats();
    
    res.json({
      success: true,
      data: {
        errors,
        stats,
        filters: { severity, type, limit }
      }
    });
  } catch (error) {
    if (observabilityManager) {
      observabilityManager.captureError(error, {
        component: 'error-api',
        endpoint: '/errors'
      });
    }
    res.status(500).json({
      success: false,
      error: '获取错误信息失败'
    });
  }
});

// AI相关路由
import aiRoutes from './routes/aiRoutes.js';
app.use('/api/ai', aiRoutes);

// 404处理 - 必须在所有路由之后
app.use(notFoundHandler);

// 可观测性错误处理中间件
if (observabilityManager) {
  app.use(observabilityManager.createMiddleware().errorTracking);
}

// 统一错误处理中间件 - 必须在最后
app.use(errorMiddleware);

// 启动服务器
async function startServer() {
  try {
    await initializeApp();
    
    app.listen(PORT, () => {
      const logger = observabilityManager ? observabilityManager.getLogger('app') : console;
      
      if (logger.info) {
        logger.info('AI服务器启动成功', {
          port: PORT,
          environment: process.env.NODE_ENV || 'development',
          features: {
            observability: !!observabilityManager,
            performance: !!performanceMiddleware
          }
        });
      } else {
        logger.log(`🤖 Chatlog Web AI服务器启动成功`);
        logger.log(`🌐 服务地址: http://localhost:${PORT}`);
        logger.log(`📊 健康检查: http://localhost:${PORT}/health`);
        logger.log(`📈 性能监控: http://localhost:${PORT}/metrics`);
        logger.log(`❌ 错误统计: http://localhost:${PORT}/errors`);
        logger.log(`🔧 环境模式: ${process.env.NODE_ENV || 'development'}`);
        
        if (observabilityManager) {
          logger.log(`📊 可观测性系统: 已启用`);
        }
        
        if (performanceMiddleware) {
          logger.log(`⚡ 性能优化: 已启用`);
        }
      }
    });
  } catch (error) {
    const logger = observabilityManager ? observabilityManager.getLogger('app') : console;
    
    if (observabilityManager) {
      observabilityManager.captureError(error, {
        component: 'server-startup',
        critical: true
      });
    }
    
    if (logger.fatal) {
      logger.fatal('服务器启动失败', {}, error);
    } else {
      logger.error('❌ 服务器启动失败:', error);
    }
    
    process.exit(1);
  }
}

// 优雅关闭处理
process.on('SIGTERM', () => {
  const logger = observabilityManager ? observabilityManager.getLogger('app') : console;
  
  if (logger.info) {
    logger.info('收到SIGTERM信号，正在关闭服务器...');
  } else {
    logger.log('📴 收到SIGTERM信号，正在关闭服务器...');
  }
  
  if (observabilityManager) {
    observabilityManager.stop();
  }
  
  if (performanceMiddleware) {
    performanceMiddleware.cleanup();
  }
  
  process.exit(0);
});

process.on('SIGINT', () => {
  const logger = observabilityManager ? observabilityManager.getLogger('app') : console;
  
  if (logger.info) {
    logger.info('收到SIGINT信号，正在关闭服务器...');
  } else {
    logger.log('📴 收到SIGINT信号，正在关闭服务器...');
  }
  
  if (observabilityManager) {
    observabilityManager.stop();
  }
  
  if (performanceMiddleware) {
    performanceMiddleware.cleanup();
  }
  
  process.exit(0);
});

// 启动应用
startServer();

module.exports = app;