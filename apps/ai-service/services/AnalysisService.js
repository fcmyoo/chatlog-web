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

      // 1. 获取聊天数据
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

完整聊天数据：
${validMessages.slice(0, 100).map(msg => // 限制前100条消息以避免token过多
  `${msg.time} [${msg.senderName}]: ${msg.content}`
).join('\n')}${validMessages.length > 100 ? '\n... (数据过长，已截取前100条消息)' : ''}
`;

    // 如果有自定义提示词，使用自定义提示词
    if (customPrompt && customPrompt.trim()) {
      return `${basicInfo}\n\n${customPrompt}`;
    }

    // 根据分析类型生成专门的提示词
    const typePrompts = {
      programming: `
请基于以上聊天数据进行编程技术分析，重点关注：
1. 技术讨论话题和趋势
2. 编程语言和框架的使用情况
3. 技术问题和解决方案
4. 学习资源分享情况
5. 代码质量和最佳实践讨论
6. 开发工具和环境配置
7. 项目协作和开发流程`,

      science: `
请基于以上聊天数据进行科学学习分析，重点关注：
1. 科学知识分享和讨论
2. 学习方法和策略
3. 研究领域和热点话题
4. 学术资源和文献分享
5. 实验方法和数据分析
6. 科学思维和批判性思维
7. 跨学科交流和合作`,

      reading: `
请基于以上聊天数据进行阅读讨论分析，重点关注：
1. 书籍推荐和分享
2. 阅读心得和感悟
3. 文学作品讨论
4. 阅读方法和技巧
5. 作者和出版信息
6. 读书活动和计划
7. 知识输出和总结`,

      custom: '请基于以上聊天数据进行综合分析，提供有价值的洞察和见解。'
    };

    return `${basicInfo}\n\n${typePrompts[analysisType] || typePrompts.custom}`;
  }

  /**
   * 获取系统提示词
   */
  async getSystemPrompt() {
    const aiSettings = await this.aiService.configManager.getAISettings();
    return aiSettings.systemPrompt;
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
    return titles[analysisType] || '数据分析';
  }

  /**
   * 保存分析历史
   */
  async saveAnalysisHistory(metadata, htmlContent) {
    try {
      const historyId = metadata.id;
      const filePath = path.join(this.historyDir, `${historyId}.json`);
      
      const historyData = {
        ...metadata,
        htmlContent,
        fileSize: Buffer.byteLength(htmlContent, 'utf8'),
        createdAt: new Date().toISOString()
      };

      await fs.writeJson(filePath, historyData, { spaces: 2 });
      
      console.log(`💾 分析历史已保存: ${historyId}`);
      return historyId;

    } catch (error) {
      console.error('保存分析历史失败:', error);
      throw new Error('分析历史保存失败');
    }
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
          const filePath = path.join(this.historyDir, file);
          const data = await fs.readJson(filePath);
          
          // 应用过滤条件
          if (analysisType && data.analysisType !== analysisType) continue;
          if (groupName && data.groupName !== groupName) continue;
          
          histories.push({
            id: data.id,
            title: data.title,
            groupName: data.groupName,
            analysisType: data.analysisType,
            timeRange: data.timeRange,
            messageCount: data.messageCount,
            timestamp: data.timestamp,
            createdAt: data.createdAt,
            fileSize: data.fileSize
          });
          
        } catch (error) {
          console.error(`读取历史文件失败: ${file}`, error);
        }
      }

      // 按时间排序
      histories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // 分页
      const total = histories.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedHistories = histories.slice(startIndex, endIndex);

      return {
        histories: paginatedHistories,
        pagination: {
          current: page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };

    } catch (error) {
      console.error('获取分析历史失败:', error);
      throw new Error('获取历史记录失败');
    }
  }

  /**
   * 根据ID获取特定分析结果
   */
  async getAnalysisById(id) {
    try {
      const filePath = path.join(this.historyDir, `${id}.json`);
      
      if (!await fs.pathExists(filePath)) {
        return null;
      }

      const data = await fs.readJson(filePath);
      return data;

    } catch (error) {
      console.error('获取分析结果失败:', error);
      throw new Error('获取分析结果失败');
    }
  }

  /**
   * 删除分析历史
   */
  async deleteAnalysis(id) {
    try {
      const filePath = path.join(this.historyDir, `${id}.json`);
      await fs.remove(filePath);
      return true;

    } catch (error) {
      console.error('删除分析历史失败:', error);
      throw new Error('删除分析历史失败');
    }
  }

  /**
   * 生成分析预览
   */
  generatePreview(htmlContent) {
    if (!htmlContent) return '';
    
    // 提取HTML中的文本内容用于预览
    const textContent = htmlContent
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/\s+/g, ' ') // 合并空白字符
      .trim();
    
    // 返回前200个字符作为预览
    return textContent.length > 200 
      ? textContent.substring(0, 200) + '...'
      : textContent;
  }

  /**
   * 获取分析统计
   */
  async getAnalysisStats() {
    try {
      const files = await fs.readdir(this.historyDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      let stats = {
        total: 0,
        byType: {},
        byMonth: {},
        recentActivity: []
      };
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.historyDir, file);
          const data = await fs.readJson(filePath);
          
          stats.total++;
          
          // 按类型统计
          stats.byType[data.analysisType] = (stats.byType[data.analysisType] || 0) + 1;
          
          // 按月份统计
          const month = new Date(data.timestamp).toISOString().substring(0, 7);
          stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
          
          stats.recentActivity.push({
            id: data.id,
            title: data.title,
            timestamp: data.timestamp,
            analysisType: data.analysisType
          });
          
        } catch (error) {
          console.error(`读取统计文件失败: ${file}`, error);
        }
      }

      // 排序最近活动
      stats.recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      stats.recentActivity = stats.recentActivity.slice(0, 10);

      return stats;

    } catch (error) {
      console.error('获取分析统计失败:', error);
      throw new Error('获取统计信息失败');
    }
  }
}

module.exports = AnalysisService;