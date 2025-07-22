# 📊 Chatlog Web - AI 智能聊天记录分析系统

> 基于 Vue.js + Node.js + AI 的现代化聊天数据可视化和智能分析平台

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/vue-3.x-green)](https://vuejs.org/)

## 🏗️ 项目架构

本项目采用 **Monorepo** 架构，提供清晰的模块划分和统一的配置管理：

```
chatlog-web/
├── 📁 apps/                    # 应用层
│   ├── frontend/              # Vue.js 前端应用
│   └── ai-service/            # AI 分析服务
├── 📁 packages/               # 共享包
│   ├── config/                # 统一配置管理
│   └── shared/                # 共享类型和工具
├── 📁 docs/                   # 项目文档
├── 📁 scripts/                # 构建和部署脚本
└── 📁 images/                 # 项目截图
```

## ✨ 核心特性

- 🎯 **智能数据分析** - 基于 DeepSeek/Gemini AI 的深度聊天数据分析
- 📊 **可视化报告** - 生成交互式 HTML 分析报告
- 📚 **历史管理** - 保存和管理所有分析历史记录
- ⏰ **定时分析** - 支持定时自动批量分析
- 🔄 **多模型支持** - 支持 DeepSeek 和 Gemini AI 模型
- 🎨 **现代UI** - 基于 Vue 3 + Element Plus 的响应式界面
- 🏗️ **模块化架构** - Monorepo 架构，清晰的代码组织

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0
- Chatlog 服务运行中 (端口 5030)

### 一键启动

```bash
# 1. 克隆项目
git clone https://github.com/sinyu1012/chatlog-web.git
cd chatlog-web

# 2. 配置环境变量
cp packages/config/.env.example .env
# 编辑 .env 文件，填入你的 AI API 密钥

# 3. 检查环境
./scripts/start-ai.sh --check

# 4. 启动所有服务
./scripts/start-ai.sh
```

### 开发模式

```bash
# 开发模式启动（支持热重载）
./scripts/start-ai.sh --dev

# 安装所有依赖
npm run install:all

# 构建项目
npm run build
```

## 📖 详细文档

- **[AI 功能集成指南](docs/AI_INTEGRATION_GUIDE.md)** - AI 功能使用和配置
- **[架构重构报告](docs/REFACTOR_REPORT.md)** - 项目架构演进记录
- **[贡献指南](docs/CONTRIBUTING.md)** - 如何参与项目贡献
- **[变更日志](docs/CHANGELOG.md)** - 版本更新记录

## 🛠️ 技术栈

### 前端 (apps/frontend)
- **Vue 3** - 渐进式 JavaScript 框架
- **Element Plus** - Vue 3 组件库
- **Vue Router** - 官方路由管理器
- **Vuex** - 状态管理模式
- **Axios** - HTTP 客户端
- **ECharts** - 数据可视化图表库

### 后端 (apps/ai-service)
- **Node.js + Express** - 服务端运行时和框架
- **LangChain.js** - AI 应用开发框架
- **DeepSeek/Gemini API** - AI 模型服务
- **Node-Cron** - 定时任务调度
- **Axios** - HTTP 客户端

### 工程化
- **Monorepo** - 统一代码仓库管理
- **ESLint** - 代码质量检查
- **NPM Workspaces** - 包管理和依赖共享
- **Concurrently** - 并发进程管理

## 📊 使用效果

### 主要功能界面

![仪表盘](images/dashboard.jpg)
*智能仪表盘 - 数据概览和快速导航*

![数据分析](images/analytics.jpg)
*AI 分析结果 - 交互式可视化报告*

## 🔧 配置说明

### 环境变量配置

```bash
# Chatlog API 服务
CHATLOG_HOST=127.0.0.1
CHATLOG_PORT=5030

# AI 服务配置  
AI_HOST=localhost
AI_PORT=3001

# AI 模型 API 密钥
DEEPSEEK_API_KEY=your-deepseek-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### 服务端口分配

- **前端服务**: http://localhost:8080
- **AI 分析服务**: http://localhost:3001  
- **Chatlog API**: http://127.0.0.1:5030

## 📈 项目状态

- ✅ 核心功能完整
- ✅ AI 分析集成完成
- ✅ 架构重构完成
- ✅ 文档完善
- 🔄 持续优化中

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目基于 [Apache License 2.0](LICENSE) 开源协议。

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Element Plus](https://element-plus.org/) - Vue 3 组件库
- [LangChain.js](https://js.langchain.com/) - AI 应用开发框架
- [DeepSeek](https://www.deepseek.com/) - AI 模型服务提供商

---

⭐ 如果这个项目对你有帮助，请不吝给个 Star！