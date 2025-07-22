# AI功能迁移文档

## 概述
本文档包含从聊天记录分析Web应用中提取的所有AI相关功能代码，用于迁移到其他项目。涵盖DeepSeek和Gemini API集成、AI分析、定时任务、模型配置等完整功能。

## 目录结构
1. [API集成代码](#api集成代码)
2. [AI分析核心功能](#ai分析核心功能)
3. [定时任务系统](#定时任务系统)
4. [模型配置管理](#模型配置管理)
5. [环境变量配置](#环境变量配置)
6. [迁移步骤](#迁移步骤)

---

## API集成代码

### DeepSeek API集成

#### 基础配置
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
```

#### API调用函数
```javascript
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

### Gemini API集成

#### API调用函数
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

---

## AI分析核心功能

### 分析类型定义
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

### 提示词生成器
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
- 主要发言用户: ${Object.entries(userStats).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => `${name}(${count}条)`).join(', ')}

完整聊天数据：
${validMessages.map(msg => `${msg.time} [${msg.senderName}]: ${msg.content}`).join('\n')}
`;

  if (customPrompt && customPrompt.trim()) {
    return `${basicInfo}\n\n${customPrompt}`;
  }

  return `${basicInfo}\n\n请基于以上聊天数据进行分析。`;
}
```

### AI分析系统提示词
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

---

## 定时任务系统

### Cron任务配置
```javascript
const cron = require('node-cron');

// 定时任务配置
let SCHEDULED_ANALYSIS_TIME = process.env.SCHEDULED_ANALYSIS_TIME || '0 0 8 * * *';
let ENABLE_SCHEDULED_ANALYSIS = process.env.ENABLE_SCHEDULED_ANALYSIS === 'true';
let currentCronJob = null;

/**
 * 更新定时任务配置
 * @param {Object} config - 定时任务配置
 * @param {boolean} config.enabled - 是否启用
 * @param {string} config.cronTime - Cron表达式
 */
function updateScheduledAnalysisConfig(config) {
  try {
    ENABLE_SCHEDULED_ANALYSIS = config.enabled;
    SCHEDULED_ANALYSIS_TIME = config.cronTime;
    
    // 销毁现有任务
    if (currentCronJob) {
      currentCronJob.stop();
      currentCronJob = null;
    }
    
    // 创建新任务
    if (ENABLE_SCHEDULED_ANALYSIS && cron.validate(SCHEDULED_ANALYSIS_TIME)) {
      currentCronJob = cron.schedule(SCHEDULED_ANALYSIS_TIME, () => {
        console.log('\n⏰ 定时任务触发，开始执行批量分析...');
        runScheduledBatchAnalysis().catch(error => {
          console.error('定时分析执行失败:', error);
        });
      }, {
        timezone: "Asia/Shanghai",
        scheduled: false
      });
      
      currentCronJob.start();
      return { success: true, message: '定时任务配置已更新' };
    }
    
    return { success: true, message: '定时分析已禁用' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 批量分析执行器
```javascript
/**
 * 执行批量定时分析
 * @returns {Promise<void>}
 */
async function runScheduledBatchAnalysis() {
  console.log('\n🕐 开始执行定时批量分析...');
  
  try {
    const analysisItems = await getAllAnalysisItemsForSchedule();
    
    if (analysisItems.length === 0) {
      console.log('⚠️  没有找到可用的分析项配置');
      return;
    }
    
    const results = { success: [], failed: [], skipped: [] };
    
    // 逐个执行分析，避免API频率限制
    for (let i = 0; i < analysisItems.length; i++) {
      const item = analysisItems[i];
      
      try {
        const result = await executeScheduledAnalysis(item);
        
        if (result.success) {
          results.success.push(result);
        } else if (result.reason === '无聊天数据') {
          results.skipped.push(result);
        } else {
          results.failed.push(result);
        }
        
        // 间隔3秒避免频率限制
        if (i < analysisItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        console.error(`执行 ${item.name} 分析时发生异常:`, error);
        results.failed.push({ ...item, error: error.message });
      }
    }
    
    console.log('\n📊 定时分析完成汇总:');
    console.log(`✅ 成功: ${results.success.length} 个`);
    console.log(`⚠️  跳过: ${results.skipped.length} 个`);
    console.log(`❌ 失败: ${results.failed.length} 个`);
    
  } catch (error) {
    console.error('❌ 定时批量分析执行失败:', error);
  }
}

/**
 * 执行单个定时分析
 * @param {Object} analysisItem - 分析项配置
 */
async function executeScheduledAnalysis(analysisItem) {
  try {
    console.log(`🔄 开始执行定时分析: ${analysisItem.name}`);
    
    // 计算昨天的日期
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const timeRange = yesterday.toISOString().split('T')[0] + '~' + yesterday.toISOString().split('T')[0];
    
    // 获取聊天数据
    const chatData = await getChatData(analysisItem.groupName, timeRange);
    
    if (!chatData || chatData.length === 0) {
      return { success: false, reason: '无聊天数据' };
    }
    
    // 生成分析
    const prompt = generatePromptTemplate(analysisItem.analysisType, chatData, analysisItem.customPrompt);
    const analysisResult = await callAI(prompt, SYSTEM_PROMPT);
    
    // 保存结果
    const metadata = {
      title: `[定时] ${getAnalysisTitle(analysisItem.analysisType)} - ${analysisItem.name}`,
      groupName: analysisItem.groupName,
      analysisType: analysisItem.analysisType,
      timeRange,
      messageCount: chatData.length,
      isScheduled: true
    };
    
    const historyId = saveAnalysisHistory(metadata, analysisResult);
    
    console.log(`✅ ${analysisItem.name} 定时分析完成，ID: ${historyId}`);
    return { success: true, historyId, title: metadata.title };
    
  } catch (error) {
    console.error(`❌ ${analysisItem.name} 定时分析失败:`, error);
    return { success: false, error: error.message };
  }
}
```

---

## 模型配置管理

### 配置文件结构
```javascript
// model-settings.json 示例
{
  "modelProvider": "DeepSeek",
  "deepseek": {
    "model": "deepseek-reasoner",
    "apiKey": "your-deepseek-api-key"
  },
  "gemini": {
    "model": "gemini-2.5-pro",
    "apiKey": "your-gemini-api-key"
  },
  "updatedAt": "2024-01-15T10:30:45.000Z"
}
```

### 模型配置管理函数
```javascript
/**
 * 获取当前模型配置
 * @returns {Object} 模型配置对象
 */
async function getModelConfig() {
  try {
    const fs = require('fs');
    const path = require('path');
    const modelSettingsPath = path.join(__dirname, 'model-settings.json');
    
    if (fs.existsSync(modelSettingsPath)) {
      const settings = JSON.parse(fs.readFileSync(modelSettingsPath, 'utf8'));
      return {
        provider: settings.modelProvider,
        config: settings[settings.modelProvider.toLowerCase()]
      };
    }
    
    // 默认配置
    return {
      provider: 'DeepSeek',
      config: {
        model: 'deepseek-reasoner',
        apiKey: process.env.DEEPSEEK_API_KEY
      }
    };
  } catch (error) {
    console.error('读取模型配置失败:', error);
    return {
      provider: 'DeepSeek',
      config: {
        model: 'deepseek-reasoner',
        apiKey: process.env.DEEPSEEK_API_KEY
      }
    };
  }
}

/**
 * 测试AI模型连接
 * @param {string} provider - 模型提供商
 * @param {Object} config - 配置对象
 * @returns {Promise<Object>} 测试结果
 */
async function testAIModelConnection(provider, config) {
  if (provider === 'DeepSeek') {
    return await testDeepSeekConnection(config.apiKey, config.model);
  } else if (provider === 'Gemini') {
    return await testGeminiConnection(config.apiKey, config.model);
  }
  
  return { success: false, error: '不支持的模型提供商' };
}

// DeepSeek连接测试
async function testDeepSeekConnection(apiKey, model) {
  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: model,
      messages: [{ role: 'user', content: '测试连接' }],
      max_tokens: 50
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    return {
      success: true,
      message: '连接测试成功',
      response: response.data.choices[0].message.content
    };
  } catch (error) {
    return handleAIError(error);
  }
}

// Gemini连接测试
async function testGeminiConnection(apiKey, model) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{ text: '测试连接' }]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    return {
      success: true,
      message: '连接测试成功',
      response: response.data.candidates[0].content.parts[0].text
    };
  } catch (error) {
    return handleAIError(error);
  }
}

/**
 * 统一错误处理
 * @param {Error} error - 错误对象
 * @returns {Object} 处理后的错误信息
 */
function handleAIError(error) {
  if (error.response) {
    const statusCode = error.response.status;
    
    if (statusCode === 401) {
      return { success: false, error: 'API Key 无效，请检查密钥' };
    } else if (statusCode === 429) {
      return { success: false, error: 'API 调用频率超限' };
    } else {
      return { 
        success: false, 
        error: `API 错误 (${statusCode}): ${error.response.data?.error?.message || '未知错误'}` 
      };
    }
  } else if (error.code === 'ECONNABORTED') {
    return { success: false, error: '连接超时，请检查网络' };
  } else {
    return { success: false, error: error.message };
  }
}
```

---

## 环境变量配置

### 必需环境变量
```bash
# DeepSeek API配置
DEEPSEEK_API_KEY=your-deepseek-api-key-here

# Gemini API配置 (可选)
GEMINI_API_KEY=your-gemini-api-key-here

# 定时任务配置
ENABLE_SCHEDULED_ANALYSIS=true
SCHEDULED_ANALYSIS_TIME=0 0 8 * * *  # 每天早上8点

# 服务器配置
PORT=3000
NODE_ENV=production
```

### 可选配置项
```bash
# 定时任务详细配置
ANALYSIS_TIME_RANGE=yesterday
ANALYSIS_INTERVAL=3
SKIP_EMPTY_DATA=true
ENABLE_NOTIFICATION=true

# 模型配置
MODEL_PROVIDER=DeepSeek
DEEPSEEK_MODEL=deepseek-reasoner
GEMINI_MODEL=gemini-2.5-pro
```

---

## 迁移步骤

### 1. 安装依赖
```bash
npm install axios node-cron fs path dotenv
```

### 2. 创建基础文件结构
```
your-project/
├── config/
│   ├── ai-config.js
│   └── model-settings.json
├── services/
│   ├── ai-service.js
│   ├── analysis-service.js
│   └── scheduler-service.js
├── utils/
│   └── prompt-generator.js
├── .env
└── app.js
```

### 3. 复制核心代码
将上述代码按模块复制到对应文件中。

### 4. 配置环境变量
创建`.env`文件并填入API密钥和必要配置。

### 5. 初始化定时任务
```javascript
// 在你的主应用文件中
const { updateScheduledAnalysisConfig } = require('./services/scheduler-service');

// 初始化定时任务
updateScheduledAnalysisConfig({
  enabled: process.env.ENABLE_SCHEDULED_ANALYSIS === 'true',
  cronTime: process.env.SCHEDULED_ANALYSIS_TIME || '0 0 8 * * *'
});
```

### 6. 测试API连接
```javascript
// 测试脚本
const { testAIModelConnection } = require('./services/ai-service');

async function testConnection() {
  const result = await testAIModelConnection('DeepSeek', {
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: 'deepseek-reasoner'
  });
  
  console.log('连接测试结果:', result);
}

testConnection();
```

### 7. 运行示例分析
```javascript
const { callAI } = require('./services/ai-service');

async function runSampleAnalysis() {
  const sampleData = [
    { senderName: '用户A', content: '今天学习了React Hooks', time: '2024-01-15 10:00:00' },
    { senderName: '用户B', content: 'Vue3的Composition API也很好用', time: '2024-01-15 10:05:00' }
  ];
  
  const prompt = generatePromptTemplate('programming', sampleData);
  const result = await callAI(prompt, SYSTEM_PROMPT);
  
  console.log('分析结果:', result);
}

runSampleAnalysis();
```

---

## 使用示例

### 基础AI调用
```javascript
const result = await callAI(
  '分析这段聊天记录的技术讨论内容',
  '你是一个专业的数据分析师，请提供详细的技术分析报告'
);
```

### 定时任务管理
```javascript
// 启用定时任务
updateScheduledAnalysisConfig({
  enabled: true,
  cronTime: '0 0 9 * * 1-5'  // 工作日早上9点
});

// 手动触发分析
await runScheduledBatchAnalysis();
```

### 模型切换
```javascript
// 切换到Gemini
await saveModelSettings({
  modelProvider: 'Gemini',
  gemini: {
    model: 'gemini-2.5-pro',
    apiKey: 'your-gemini-key'
  }
});
```

---

## 注意事项

1. **API密钥安全**：切勿将API密钥提交到代码仓库
2. **频率限制**：建议设置合理的调用间隔，避免触发API限制
3. **错误处理**：所有AI调用都有重试机制，建议实现错误监控
4. **数据隐私**：确保聊天数据符合隐私保护要求
5. **性能优化**：大数据量分析建议使用分批处理

## 扩展功能

- 支持更多AI模型（OpenAI、Claude等）
- 添加数据缓存机制
- 实现实时分析WebSocket
- 增加分析结果导出功能
- 支持多语言分析

如需技术支持或功能扩展，请参考完整的API文档和错误处理指南。