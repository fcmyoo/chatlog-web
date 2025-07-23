const AIService = require('./AIService');
const DataService = require('./DataService');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class AnalysisService {
  constructor() {
    this.aiService = new AIService();
    this.dataService = new DataService();
    this.historyDir = path.join(__dirname, '../storage/analysis_history');
    
    // 确保存储目录存在
    this.ensureStorageDir();
  }

  async ensureStorageDir() {
    await fs.ensureDir(this.historyDir);
  }

  /**
   * 执行AI分析
   */
  async performAnalysis({ groupName, analysisType, customPrompt, timeRange }) {
    try {
      console.log(`🔍 开始分析: ${groupName} (${analysisType})`);

      // 1. 获取聊天数据（使用缓存优化）
      const chatData = await this.dataService.getChatData(groupName, timeRange);
      
      if (!chatData || chatData.length === 0) {
        throw new Error('未找到聊天数据，请检查时间范围和群聊名称是否正确');
      }

      console.log(`📊 获取到 ${chatData.length} 条聊天记录`);

      // 2. 生成分析提示词
      const prompt = this.generateAnalysisPrompt(analysisType, chatData, customPrompt);
      const systemPrompt = await this.getSystemPrompt();

      // 3. 调用AI分析
      const analysisResult = await this.aiService.callAI(prompt, systemPrompt);

      // 4. 保存分析历史
      const metadata = {
        id: uuidv4(),
        title: `${groupName} - ${this.getAnalysisTitle(analysisType)}`,
        groupName,
        analysisType,
        timeRange,
        messageCount: chatData.length,
        timestamp: new Date().toISOString(),
        customPrompt: customPrompt || null
      };

      const historyId = await this.saveAnalysisHistory(metadata, analysisResult);

      console.log(`✅ 分析完成: ${historyId}`);

      return {
        historyId,
        title: metadata.title,
        metadata,
        preview: this.generatePreview(analysisResult)
      };

    } catch (error) {
      console.error('分析执行失败:', error);
      throw error;
    }
  }

  /**
   * 生成分析提示词
   */
  generateAnalysisPrompt(analysisType, chatData, customPrompt = '') {
    const validMessages = chatData.filter(msg => 
      msg.content && msg.content.trim().length > 0
    );

    // 统计用户发言
    const userStats = {};
    validMessages.forEach(msg => {
      if (msg.senderName) {
        userStats[msg.senderName] = (userStats[msg.senderName] || 0) + 1;
      }
    });

    // 基础信息
    const basicInfo = `
聊天数据概况：
- 群聊名称: ${chatData[0]?.talkerName || chatData[0]?.groupName || '未知群聊'}
- 消息总数: ${chatData.length} (有效文本消息: ${validMessages.length})
- 时间范围: ${chatData[0]?.time || '未知'} 到 ${chatData[chatData.length-1]?.time || '未知'}
- 活跃用户数: ${Object.keys(userStats).length}
- 主要发言用户: ${Object.entries(userStats)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name}(${count}条)`)
      .join(', ')}

聊天记录内容：
${validMessages.slice(0, 1000).map(msg => 
  `[${msg.time}] ${msg.senderName}: ${msg.content}`
).join('\n')}

${validMessages.length > 1000 ? '...(内容过长，已截取前1000条)' : ''}
`;

    // 根据分析类型生成不同的提示词
    let analysisPrompt = '';
    
    switch (analysisType) {
      case 'programming':
        analysisPrompt = `
请对这个编程技术群的聊天内容进行深度分析，重点关注：

1. **技术讨论热点**：识别最活跃讨论的技术话题、编程语言、框架等
2. **知识分享质量**：分析代码分享、技术文档、学习资源的质量和实用性
3. **问题解决能力**：统计技术问题的提出和解决情况，分析群内互助效果
4. **技术趋势洞察**：识别新兴技术、热门工具的讨论趋势
5. **学习氛围评估**：评价群内学习氛围、知识传播效果

请提供结构化的分析报告，包含具体数据和典型案例。`;
        break;

      case 'science':
        analysisPrompt = `
请对这个科学学习群的聊天内容进行深度分析，重点关注：

1. **学科分布**：统计涉及的科学领域和学科分类
2. **知识深度**：分析讨论内容的专业水平和学术价值
3. **学习互动**：评估成员间的学术交流和知识分享情况
4. **资源推荐**：整理分享的学习资源、论文、书籍等
5. **科研动态**：识别科研前沿、学术热点的讨论

请提供详细的分析报告，突出学术价值和学习效果。`;
        break;

      case 'reading':
        analysisPrompt = `
请对这个阅读讨论群的聊天内容进行深度分析，重点关注：

1. **书籍类型**：统计讨论的书籍类型、题材分布
2. **阅读偏好**：分析群成员的阅读兴趣和偏好趋势
3. **讨论深度**：评估读书心得、书评质量和讨论深度
4. **推荐价值**：整理有价值的书籍推荐和阅读建议
5. **阅读氛围**：评价群内阅读氛围和文化交流效果

请提供comprehensive的分析报告，包含阅读统计和优质内容摘录。`;
        break;

      case 'custom':
        analysisPrompt = customPrompt || '请对聊天内容进行综合分析，提供有价值的洞察和总结。';
        break;

      default:
        analysisPrompt = '请对聊天内容进行综合分析，包括活跃度、话题分布、用户行为等方面。';
    }

    return basicInfo + '\n' + analysisPrompt;
  }

  /**
   * 获取系统提示词
   */
  async getSystemPrompt() {
    return `你是一个专业的聊天数据分析师，具备以下能力：

1. **数据洞察**：能够从大量聊天数据中提取有价值的信息和趋势
2. **结构化分析**：提供清晰、有条理的分析报告
3. **客观中立**：基于数据事实进行分析，避免主观偏见
4. **实用建议**：根据分析结果提供可操作的建议

分析要求：
- 使用中文回答
- 提供具体的数据支撑
- 突出关键发现和洞察
- 结构清晰，便于阅读
- 包含典型案例或引用
- 提供改进建议（如适用）

请确保分析内容专业、准确、有价值。`;
  }

  /**
   * 获取分析类型标题
   */
  getAnalysisTitle(analysisType) {
    const titles = {
      programming: '编程技术分析',
      science: '科学学习分析', 
      reading: '阅读讨论分析',
      custom: '自定义分析'
    };
    return titles[analysisType] || '综合分析';
  }

  /**
   * 生成预览
   */
  generatePreview(analysisResult) {
    const preview = analysisResult.substring(0, 200);
    return preview + (analysisResult.length > 200 ? '...' : '');
  }

  /**
   * 保存分析历史
   */
  async saveAnalysisHistory(metadata, content) {
    const filename = `${metadata.id}.json`;
    const filepath = path.join(this.historyDir, filename);
    
    const historyItem = {
      ...metadata,
      content,
      savedAt: new Date().toISOString()
    };

    await fs.writeJSON(filepath, historyItem, { spaces: 2 });
    return metadata.id;
  }

  /**
   * 获取分析历史列表
   */
  async getAnalysisHistory({ page = 1, pageSize = 10, analysisType, groupName }) {
    try {
      const files = await fs.readdir(this.historyDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      let histories = [];
      
      for (const file of jsonFiles) {
        try {
          const filepath = path.join(this.historyDir, file);
          const history = await fs.readJSON(filepath);
          
          // 过滤条件
          if (analysisType && history.analysisType !== analysisType) continue;
          if (groupName && history.groupName !== groupName) continue;
          
          histories.push({
            id: history.id,
            title: history.title,
            groupName: history.groupName,
            analysisType: history.analysisType,
            timeRange: history.timeRange,
            messageCount: history.messageCount,
            timestamp: history.timestamp,
            preview: this.generatePreview(history.content)
          });
        } catch (error) {
          console.warn(`读取历史文件失败: ${file}`, error.message);
        }
      }

      // 按时间倒序排列
      histories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // 分页
      const total = histories.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const items = histories.slice(start, end);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };

    } catch (error) {
      console.error('获取分析历史失败:', error);
      throw new Error('获取历史记录失败');
    }
  }

  /**
   * 根据ID获取分析结果
   */
  async getAnalysisById(id) {
    try {
      const filepath = path.join(this.historyDir, `${id}.json`);
      const exists = await fs.pathExists(filepath);
      
      if (!exists) {
        return null;
      }

      return await fs.readJSON(filepath);
    } catch (error) {
      console.error(`获取分析结果失败 (${id}):`, error);
      throw new Error('获取分析结果失败');
    }
  }

  // ==================== 新增：缓存管理方法 ====================

  /**
   * 获取缓存统计信息
   */
  async getCacheStats() {
    return this.dataService.getCacheStats();
  }

  /**
   * 清除所有缓存
   */
  async clearCache() {
    return this.dataService.clearCache();
  }

  /**
   * 预加载常用数据
   */
  async preloadCommonData(groupNames, timeRange) {
    return this.dataService.preloadCommonData(groupNames, timeRange);
  }

  /**
   * 系统健康检查
   */
  async getSystemHealth() {
    try {
      // 检查AI服务状态
      const aiStatus = await this.aiService.getModelStatus();
      
      // 检查数据服务状态
      const dataStatus = await this.dataService.healthCheck();
      
      // 检查存储状态
      const storageStatus = await this._checkStorageHealth();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          ai: aiStatus,
          data: dataStatus,
          storage: storageStatus
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * 检查存储健康状态
   */
  async _checkStorageHealth() {
    try {
      const storageDir = this.historyDir;
      const testFile = path.join(storageDir, 'health_check.test');
      
      // 测试写入
      await fs.writeFile(testFile, 'health check', 'utf8');
      
      // 测试读取
      const content = await fs.readFile(testFile, 'utf8');
      
      // 清理测试文件
      await fs.remove(testFile);
      
      // 获取目录统计
      const files = await fs.readdir(storageDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      return {
        status: 'healthy',
        writable: content === 'health check',
        historyCount: jsonFiles.length,
        storageDir
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        storageDir: this.historyDir
      };
    }
  }
}

module.exports = AnalysisService;
