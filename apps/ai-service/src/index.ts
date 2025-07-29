/**
 * Chatlog Web AI Service - 主入口文件
 * 现代化的ES6模块架构
 */

import app from './app.js';

// 启动应用
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ AI服务器启动成功`);
  console.log(`🌐 服务地址: http://localhost:${PORT}`);
});