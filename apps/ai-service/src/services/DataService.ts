import axios from 'axios';
import ConfigManager from '../config/ConfigManager.js';

// 导入类型定义
import type { ChatMessage, CacheStats } from '../types/index.js';

/**
 * 缓存管理器
 * 实现智能缓存策略，减少对chatlog服务的重复调用
 */
class CacheManager {
  private cache: Map<string, any>;
  private cacheTimeout: number;
  private maxCacheSize: number;

  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
    this.maxCacheSize = 100; // 最大缓存条目数
  }

  /**
   * 生成缓存键
   */
  generateKey(groupName: string, timeRange: string, limit: number = 10000): string {
    return `${groupName}:${timeRange}:${limit}`;
  }

  /**
   * 获取缓存数据
   */
  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    console.log(`🎯 缓存命中: ${key}`);
    return item.data;
  }

  /**
   * 设置缓存数据
   */
  set(key: string, data: any): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      console.log(`🗑️ 缓存已满，删除最旧条目: ${firstKey}`);
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + this.cacheTimeout,
      timestamp: new Date().toISOString()
    });

    console.log(`💾 缓存数据: ${key}, 过期时间: ${new Date(Date.now() + this.cacheTimeout).toLocaleString()}`);
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear();
    console.log('🧹 缓存已清除');
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      timeout: this.cacheTimeout,
      keys: Array.from(this.cache.keys())
    };
  }
}

/**
 * 优化的数据服务
 * 实现智能缓存和批处理优化
 */
class DataService {
  private configManager: ConfigManager;
  private cacheManager: CacheManager;
  private requestQueue: Map<string, Promise<any>>;

  constructor() {
    this.configManager = new ConfigManager();
    this.cacheManager = new CacheManager();
    this.requestQueue = new Map(); // 请求去重队列
  }

  /**
   * 获取聊天数据（带缓存）
   */
  async getChatData(groupName: string, timeRange: string = '2024-01-01~2025-12-31', limit: number = 10000): Promise<ChatMessage[]> {
    const cacheKey = this.cacheManager.generateKey(groupName, timeRange, limit);
    
    // 检查缓存
    const cachedData = this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // 检查是否有相同的请求正在进行（请求去重）
    if (this.requestQueue.has(cacheKey)) {
      console.log(`⏳ 等待进行中的请求: ${cacheKey}`);
      return await this.requestQueue.get(cacheKey);
    }

    try {
      // 创建请求Promise并添加到队列
      const requestPromise = this._fetchChatData(groupName, timeRange, limit);
      this.requestQueue.set(cacheKey, requestPromise);

      console.log(`📡 从Chatlog API获取数据: ${groupName} (${timeRange})`);
      const chatData = await requestPromise;

      // 缓存结果
      this.cacheManager.set(cacheKey, chatData);

      return chatData;

    } catch (error: any) {
      console.error('获取聊天数据失败:', error.message);
      throw error;
    } finally {
      // 移除请求队列中的Promise
      this.requestQueue.delete(cacheKey);
    }
  }

  /**
   * 实际的数据获取方法
   */
  private async _fetchChatData(groupName: string, timeRange: string, limit: number): Promise<ChatMessage[]> {
    const config = this.configManager.getChatlogConfig();
    const [startDate, endDate] = timeRange.split('~');

    // 构建请求参数
    const params = {
      talker: groupName,
      start_time: startDate,
      end_time: endDate,
      limit: limit
    };

    // 调用Chatlog API
    const response = await axios.get(`${config.baseURL}/api/v1/chatlog`, {
      params,
      timeout: config.timeout,
      headers: {
        'Accept': 'text/plain,application/json'
      }
    });

    console.log(`📊 API响应状态: ${response.status}`);
    console.log(`📝 响应数据类型: ${typeof response.data}`);

    // 解析聊天数据
    const chatData = this.parseChatData(response.data, groupName);
    
    console.log(`✅ 成功解析 ${chatData.length} 条聊天记录`);
    return chatData;
  }

  /**
   * 批量获取多个时间段的数据
   */
  async getChatDataBatch(groupName: string, timeRanges: string[]): Promise<ChatMessage[]> {
    const promises = timeRanges.map(timeRange => 
      this.getChatData(groupName, timeRange)
    );

    try {
      const results = await Promise.all(promises);
      
      // 合并所有数据并按时间排序
      const mergedData = results.flat().sort((a, b) => 
        new Date(a.time).getTime() - new Date(b.time).getTime()
      );

      console.log(`🔄 批量获取完成，合并 ${mergedData.length} 条记录`);
      return mergedData;

    } catch (error: any) {
      console.error('批量获取数据失败:', error);
      throw error;
    }
  }

  /**
   * 预加载常用数据
   */
  async preloadCommonData(groupNames: string[], defaultTimeRange: string = '2024-01-01~2025-12-31'): Promise<void> {
    console.log('🚀 开始预加载常用数据...');
    
    const preloadPromises = groupNames.map(async (groupName) => {
      try {
        await this.getChatData(groupName, defaultTimeRange);
        console.log(`✅ 预加载完成: ${groupName}`);
      } catch (error: any) {
        console.warn(`⚠️ 预加载失败: ${groupName} - ${error.message}`);
      }
    });

    await Promise.allSettled(preloadPromises);
    console.log('🎯 预加载任务完成');
  }

  /**
   * 解析聊天数据
   */
  parseChatData(rawData: any, groupName: string): ChatMessage[] {
    if (!rawData) {
      console.warn('解析聊天数据: 输入数据为空');
      return [];
    }

    let textData = rawData;
    
    // 处理不同类型的输入数据
    if (typeof rawData === 'object') {
      if (Array.isArray(rawData)) {
        console.log('数据已经是数组格式，直接返回');
        return this.normalizeArrayData(rawData, groupName);
      } else {
        console.log('数据是对象格式，尝试转换为字符串');
        textData = JSON.stringify(rawData);
      }
    } else if (typeof rawData !== 'string') {
      console.warn('数据类型异常，尝试转换为字符串', typeof rawData);
      textData = String(rawData);
    }

    const lines = textData.trim().split('\n');
    const chatLogs: ChatMessage[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // 解析格式：发送者(发送者ID) 时间
        const match = line.match(/^(.+?)\((.+?)\)\s+(.+)$/);
        if (match) {
          const [, senderName, senderId, time] = match;
          let content = '';
          
          // 读取消息内容（下一行）
          if (i + 1 < lines.length) {
            content = lines[i + 1].trim();
            i++; // 跳过内容行
          }
          
          chatLogs.push({
            senderName: senderName.trim(),
            senderId: senderId.trim(),
            time: time.trim(),
            content: content,
            timestamp: new Date(time.trim()).getTime(),
            groupName: groupName,
            talkerName: groupName
          });
        }
      }
    }

    return chatLogs;
  }

  /**
   * 规范化数组数据
   */
  private normalizeArrayData(arrayData: any[], groupName: string): ChatMessage[] {
    return arrayData.map(item => ({
      ...item,
      groupName: groupName,
      talkerName: groupName,
      timestamp: item.timestamp || new Date(item.time).getTime()
    }));
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): any {
    return {
      cache: this.cacheManager.getStats(),
      requestQueue: {
        size: this.requestQueue.size,
        keys: Array.from(this.requestQueue.keys())
      }
    };
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<any> {
    try {
      const config = this.configManager.getChatlogConfig();
      const response = await axios.get(`${config.baseURL}/api/v1/session`, {
        timeout: 5000
      });

      return {
        status: 'healthy',
        chatlogService: 'connected',
        responseTime: response.headers['x-response-time'] || 'unknown',
        cacheStats: this.getCacheStats()
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        chatlogService: 'disconnected',
        error: error.message,
        cacheStats: this.getCacheStats()
      };
    }
  }

  /**
   * 预加载群组数据
   */
  async preloadGroupData(groupName: string, timeRange?: string): Promise<void> {
    await this.getChatData(groupName, timeRange);
  }
}

export default DataService;