const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// 导入统一服务配置
const { services } = require('../../packages/config/services');

const app = express();
const PORT = services.ai.port;

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

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Chatlog Web AI Server'
  });
});

// AI相关路由
app.use('/api/ai', require('./routes/aiRoutes'));

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? error.message : '请稍后重试'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🤖 Chatlog Web AI服务器启动成功`);
  console.log(`🌐 服务地址: http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`🔧 环境模式: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;