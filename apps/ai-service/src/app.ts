/**
 * Chatlog Web AI Service - 应用配置
 * Express应用的核心配置和中间件设置
 */

import express from 'express';
import cors from 'cors';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// ES模块中获取__dirname的替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env') });

// 注释掉有问题的配置管理器导入
// import { getGlobalConfig } from '../../../packages/config/index.js'; // 修正路径
// 临时使用硬编码配置，避免依赖问题
const services = {
  ai: { port: 3001 },
  frontend: { port: 3000 }
};

// 导入统一错误处理
import { errorMiddleware, notFoundHandler } from './middleware/errorHandler.js';

// 注释掉暂时不可用的性能优化中间件
// import { createAIServiceMiddleware, createMetricsEndpoint, createHealthCheck } from '../../packages/performance/middleware';

// 导入路由
import aiRoutes from './routes/aiRoutes.js';

const app = express();

// 初始化全局配置管理器（使用已配置的安全设置）
// const configManager = getGlobalConfig();

// 基础中间件配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [`http://localhost:${services.frontend.port}`]
    : [`http://localhost:${services.frontend.port}`, `http://127.0.0.1:${services.frontend.port}`],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/static', express.static(join(__dirname, '../static')));

// 简化的性能监控端点
app.get('/metrics', (req, res, _next) => {
  res.set('Content-Type', 'text/plain');
  res.send('# AI Service Metrics\n# TODO: 实现详细指标收集');
});

// 简化的健康检查
app.get('/health', async (req, res, _next) => {
  try {
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ai-service',
      version: '1.0.0'
    };
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: '健康检查失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 简化的错误统计端点
app.get('/errors', async (req, res, _next) => {
  try {
    res.json({
      success: true,
      data: { message: 'TODO: 实现错误统计功能' }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取错误信息失败' });
  }
});

// AI相关路由
app.use('/api/ai', aiRoutes);

// 404处理 - 必须在所有路由之后
app.use(notFoundHandler);

// 统一错误处理中间件 - 必须在最后
app.use(errorMiddleware);

// 导出应用
export default app;