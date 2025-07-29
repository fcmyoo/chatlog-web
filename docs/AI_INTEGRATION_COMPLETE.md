# AI集成完整指南

## 📋 概述

本文档是 Chatlog Web 项目 AI 功能的完整集成指南，包含功能介绍、LangChain.js 迁移、代码实现和最佳实践。涵盖从基础配置到高级功能的全方位指导。

## 🚀 快速开始

### 1. 环境准备

确保以下服务已启动：
- Chatlog 后端服务 (`chatlog server` - 端口 5030)
- Node.js 16.0 或更高版本

### 2. 配置 API 密钥

编辑 `.env.ai` 文件，配置你的 AI 模型 API 密钥：

```bash
# DeepSeek API 配置（推荐）
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# 或 Gemini API 配置
GEMINI_API_KEY=your-gemini-api-key-here

# LangChain.js 配置
LANGCHAIN_VERBOSE=false
LANGCHAIN_CACHE=true
LANGCHAIN_TIMEOUT=300000

# 模型配置
MODEL_PROVIDER=DeepSeek
DEEPSEEK_MODEL=deepseek-reasoner
GEMINI_MODEL=gemini-2.5-pro

# 定时任务配置
ENABLE_SCHEDULED_ANALYSIS=true
SCHEDULED_ANALYSIS_TIME=0 0 8 * * *
MAX_CONCURRENT_ANALYSIS=2
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
```

### 3. 启动 AI 服务

使用一键启动脚本：

```bash
# 生产模式启动
./start-ai.sh

# 开发模式启动（支持热重载）
./start-ai.sh --dev

# 仅检查环境
./start-ai.sh --check
```

### 4. 访问应用

- 前端应用：http://localhost:8080
- AI 服务：http://localhost:3001
- 在左侧菜单中点击 "🤖 AI智能分析"

## 📊 功能特性

### 支持的分析类型

1. **编程技术分析** - 分析技术讨论、代码分享、问题解答
2. **科学学习分析** - 分析科学知识分享、学习讨论
3. **阅读讨论分析** - 分析书籍推荐、阅读心得
4. **自定义分析** - 根据自定义提示词进行分析

### 核心功能

- 🎯 **智能数据分析** - 基于 AI 的深度聊天数据分析
- 📊 **可视化报告** - 生成交互式 HTML 分析报告
- 📚 **历史管理** - 保存和管理所有分析历史
- ⏰ **定时分析** - 支持定时自动批量分析
- 🔄 **多模型支持** - 支持 DeepSeek 和 Gemini 模型

## 🛠️ 技术架构

### 后端服务 (端口 3001)
- Express + LangChain.js
- AI 模型集成 (DeepSeek/Gemini)
- 定时任务调度
- 分析历史存储

### 前端扩展
- Vue 3 + Element Plus
- AI 分析页面组件
- 实时进度显示
- 响应式设计

## 🔄 LangChain.js 迁移指南

### 迁移前准备

#### 1. 环境检查

```bash
# 检查Node.js版本（需要16.0或更高）
node --version

# 确认所有服务运行正常
npm run dev

# 验证Chatlog服务连接
curl http://localhost:5030/api/v1/session
```

#### 2. 备份现有配置

```bash
# 备份现有配置文件
cp .env .env.backup
cp model-settings.json model-settings.json.backup
cp ai-settings.json ai-settings.json.backup

# 备份分析历史（可选）
cp -r ai_analysis_history ai_analysis_history_backup
```

#### 3. 安装新依赖

```bash
# 安装LangChain.js相关依赖
npm install @langchain/core @langchain/openai @langchain/google-genai
npm install @langchain/community

# 确保node-cron已安装
npm install node-cron
```

### 迁移步骤

#### 步骤1：更新环境配置

将现有的`.env`文件更新为支持LangChain.js的新格式：

```bash
# 添加LangChain.js配置
LANGCHAIN_VERBOSE=false
LANGCHAIN_CACHE=true
LANGCHAIN_TIMEOUT=300000

# 更新模型配置格式
MODEL_PROVIDER=DeepSeek  # 或 Gemini

# DeepSeek配置
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-reasoner

# Gemini配置
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-pro

# 增强的定时任务配置
MAX_CONCURRENT_ANALYSIS=2
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
```

#### 步骤2：更新model-settings.json

将现有配置迁移到新格式：

```json
{
  "modelProvider": "DeepSeek",
  "deepseek": {
    "model": "deepseek-reasoner",
    "apiKey": "your-deepseek-api-key",
    "baseURL": "https://api.deepseek.com/v1"
  },
  "gemini": {
    "model": "gemini-2.5-pro",
    "apiKey": "your-gemini-api-key"
  },
  "updatedAt": "2024-01-15T10:30:45.000Z"
}
```

#### 步骤3：代码迁移示例

**旧代码示例（直接API调用）**

```javascript
// 旧方式 - 直接axios调用
async function callAI(prompt, systemPrompt) {
  const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
    model: 'deepseek-reasoner',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 1.0,
    max_tokens: 64000
  }, {
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.choices[0].message.content;
}
```

**新代码示例（LangChain.js）**

```javascript
// 新方式 - LangChain.js调用
const { LangChainAIService } = require('./LangChainAIService');

const aiService = new LangChainAIService();
const result = await aiService.analyzeChatWithAI(chatData, 'programming');
```

## 💻 核心代码实现

### API集成代码

#### DeepSeek API集成

```javascript
// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'your-deepseek-api-key-here';
const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

// 支持的模型
const DEEPSEEK_MODELS = {
  CHAT: 'deepseek-chat',
  REASONER: 'deepseek-reasoner', // 推荐
  CODER: 'deepseek-coder'
};

/**
 * 通用AI调用函数 - 支持DeepSeek和Gemini
 * @param {string} prompt - 用户提示词
 * @param {string} systemPrompt - 系统提示词
 * @param {number} retryCount - 重试次数
 * @returns {Promise<string>} AI响应内容
 */
async function callAI(prompt, systemPrompt, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 5000;
  
  try {
    console.log(`🤖 AI调用 (第${retryCount + 1}次尝试)`);
    console.log('发送到AI的提示词长度:', prompt.length);
    
    // 读取模型设置
    const modelConfig = await getModelConfig();
    const provider = modelConfig.provider;
    const config = modelConfig.config;

    let response;
    let timeoutDuration = 300000; // 5分钟基础超时

    // 根据提示词长度动态调整超时时间
    if (prompt.length > 50000) {
      timeoutDuration = 600000; // 10分钟
      console.log('📏 检测到大数据量，超时时间调整为10分钟');
    }

    if (provider === 'DeepSeek') {
      response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 1.0,
        max_tokens: 64000,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: timeoutDuration,
        httpAgent: new (require('http').Agent)({ 
          keepAlive: true,
          maxSockets: 1,
          timeout: timeoutDuration
        }),
        httpsAgent: new (require('https').Agent)({ 
          keepAlive: true,
          maxSockets: 1,
          timeout: timeoutDuration
        })
      });
      
      return response.data.choices[0].message.content;
    }
    
    throw new Error('不支持的AI提供商');
    
  } catch (error) {
    console.error(`❌ AI API调用失败 (第${retryCount + 1}次):`, error.message);
    
    // 重试逻辑
    const shouldRetry = retryCount < maxRetries && (
      error.code === 'ECONNABORTED' ||
      error.message.includes('socket hang up') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT') ||
      (error.response?.status >= 500 && error.response?.status < 600) ||
      error.response?.status === 429
    );
    
    if (shouldRetry) {
      const delay = baseDelay * Math.pow(2, retryCount);
      console.log(`⏳ ${delay/1000}秒后进行第${retryCount + 2}次重试...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return await callAI(prompt, systemPrompt, retryCount + 1);
    }
    
    throw error;
  }
}
```

#### Gemini API集成

```javascript
async function callGeminiAPI(prompt, systemPrompt, apiKey, model = 'gemini-2.5-pro') {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 32768
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 300000
    }
  );
  
  return response.data.candidates[0].content.parts[0].text;
}
```

### AI分析核心功能

#### 分析类型定义

```javascript
const ANALYSIS_TYPES = {
  programming: {
    name: '编程技术分析',
    description: '分析技术讨论、代码分享、问题解答等内容'
  },
  science: {
    name: '科学学习分析', 
    description: '分析科学知识分享、学习讨论等内容'
  },
  reading: {
    name: '阅读讨论分析',
    description: '分析书籍推荐、阅读心得、文学讨论等内容'
  },
  custom: {
    name: '自定义分析',
    description: '根据用户自定义提示词进行分析'
  }
};
```

#### 提示词生成器

```javascript
/**
 * 生成AI分析提示词
 * @param {string} analysisType - 分析类型
 * @param {Array} chatData - 聊天数据数组
 * @param {string} customPrompt - 自定义提示词
 * @returns {string} 完整的提示词
 */
function generatePromptTemplate(analysisType, chatData, customPrompt = '') {
  const validMessages = chatData.filter(msg => msg.content && msg.content.trim().length > 0);
  const userStats = {};
  
  // 统计用户发言次数
  validMessages.forEach(msg => {
    if (msg.senderName) {
      userStats[msg.senderName] = (userStats[msg.senderName] || 0) + 1;
    }
  });

  const basicInfo = `
聊天数据概况：
- 群聊名称: ${chatData[0]?.talkerName || '未知群聊'}
- 消息总数: ${chatData.length} (有效文本消息: ${validMessages.length})
- 时间范围: ${chatData[0]?.time} 到 ${chatData[chatData.length-1]?.time}
- 活跃用户数: ${Object.keys(userStats).length}
- 主要发言用户: ${Object.entries(userStats).sort((a,b) => b[1] - a[1]).slice(0,5).map(([name, count]) => `${name}(${count}条)`).join(', ')}

完整聊天数据：
${validMessages.map(msg => `${msg.time} [${msg.senderName}]: ${msg.content}`).join('\n')}
`;

  if (customPrompt && customPrompt.trim()) {
    return `${basicInfo}\n\n${customPrompt}`;
  }

  return `${basicInfo}\n\n请基于以上聊天数据进行分析。`;
}
```

#### AI分析系统提示词

```javascript
const SYSTEM_PROMPT = `你是一个专业的数据分析师和前端开发工程师。请根据提供的聊天数据，生成一个完整的、可直接运行的HTML页面。

要求：
1. HTML页面必须完整，包含DOCTYPE、html、head、body等标签
2. CSS样式直接写在<style>标签内
3. JavaScript代码直接写在<script>标签内
4. 使用CDN引入必要的图表库（如Chart.js、D3.js等）
5. 页面要美观、专业、响应式
6. 包含真实的数据分析和可视化
7. 不要使用任何外部文件引用
8. 使用暖色系设计风格

直接返回完整的HTML代码，不要有任何其他说明文字。`;
```

### 分析API端点

```javascript
// Express路由示例
app.post('/api/ai-analysis', async (req, res) => {
  try {
    const { groupName, analysisType, customPrompt, timeRange } = req.body;
    
    if (!groupName) {
      return res.status(400).json({ error: '请指定群聊名称' });
    }

    // 获取聊天数据
    const chatData = await getChatData(groupName, timeRange || '2024-01-01~2025-12-31');
    
    if (!chatData || chatData.length === 0) {
      return res.json({ 
        success: false, 
        error: '未找到聊天数据，请检查时间范围和群聊名称是否正确' 
      });
    }

    // 生成提示词并调用AI
    const prompt = generatePromptTemplate(analysisType, chatData, customPrompt);
    const analysisResult = await callAI(prompt, SYSTEM_PROMPT);
    
    // 保存分析历史
    const metadata = {
      groupName,
      analysisType,
      timeRange,
      messageCount: chatData.length,
      timestamp: new Date().toISOString(),
      title: `${groupName} - ${getAnalysisTitle(analysisType)}`
    };
    
    const historyId = saveAnalysisHistory(metadata, analysisResult);
    
    res.json({ 
      success: true, 
      historyId,
      title: metadata.title,
      metadata
    });

  } catch (error) {
    console.error('AI分析失败:', error.message);
    
    let errorMessage = 'AI分析失败: ' + error.message;
    let suggestions = [];
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = '分析超时，数据量过大导致处理时间过长';
      suggestions = [
        '建议缩小时间范围',
        '尝试分批次分析',
        '或稍后重试'
      ];
    } else if (error.message.includes('socket hang up')) {
      errorMessage = 'AI服务连接中断，通常是由于服务器负载过高';
      suggestions = [
        '🔄 系统已自动重试3次，建议稍等1-2分钟后再试',
        '🔀 建议切换到DeepSeek模型（通常更稳定且支持更大数据量）',
        '⏰ 避开高峰时段（如晚上8-10点）进行分析',
        '📱 检查网络连接是否稳定',
        '🎯 DeepSeek模型对大数据量分析更加稳定可靠'
      ];
    }
    
    res.json({ 
      success: false, 
      error: errorMessage,
      suggestions,
      errorCode: error.code,
      httpStatus: error.response?.status
    });
  }
});
```

## 📈 性能优化

- AI分析支持大数据量处理（>10000条消息）
- 智能重试机制，提高成功率
- 并发控制，避免API频率限制
- 缓存机制，提升响应速度

## 🔒 安全说明

- API密钥仅存储在本地环境变量中
- 所有数据处理均在本地进行
- 不上传敏感聊天内容到第三方

## 📞 获取支持

如果遇到问题，请：
1. 查看控制台日志信息
2. 使用 `./start-ai.sh --check` 检查环境
3. 查看项目 Issues 或提交新问题

---

通过以上步骤，您的应用将成功集成AI功能，获得更现代、更可靠的AI集成体验。