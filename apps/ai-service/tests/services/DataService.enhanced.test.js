import DataService from '@/services/DataService.js';
import ConfigManager from '@/config/ConfigManager.js';
import axios from 'axios';
import { jest } from '@jest/globals';

// 模拟依赖
jest.mock('@/config/ConfigManager.js');
jest.mock('axios');

describe('DataService - 增强测试套件', () => {
  let dataService;
  let mockConfigManager;
  let mockAxios;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 创建模拟配置管理器
    mockConfigManager = {
      getChatlogConfig: jest.fn().mockReturnValue({
        baseURL: 'http://localhost:5030',
        timeout: 10000
      })
    };
    ConfigManager.mockImplementation(() => mockConfigManager);
    
    // 创建模拟axios
    mockAxios = {
      get: jest.fn()
    };
    axios.mockReturnValue(mockAxios);
    
    // 创建DataService实例
    dataService = new DataService();
  });

  describe('缓存管理测试', () => {
    test('应该正确生成缓存键', () => {
      const key = dataService.cacheManager.generateKey('测试群', '2024-01-01~2024-12-31', 1000);
      expect(key).toBe('测试群:2024-01-01~2024-12-31:1000');
    });

    test('应该正确设置和获取缓存', () => {
      const testData = [{ id: 1, content: '测试消息' }];
      const key = 'test-key';
      
      // 设置缓存
      dataService.cacheManager.set(key, testData);
      
      // 获取缓存
      const cachedData = dataService.cacheManager.get(key);
      expect(cachedData).toEqual(testData);
    });

    test('应该在缓存过期后返回null', async () => {
      const testData = [{ id: 1, content: '测试消息' }];
      const key = 'test-key';
      
      // 设置较短的缓存时间
      dataService.cacheManager.cacheTimeout = 100; // 100ms
      dataService.cacheManager.set(key, testData);
      
      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const cachedData = dataService.cacheManager.get(key);
      expect(cachedData).toBeNull();
    });

    test('应该在缓存满时删除最旧的条目', () => {
      // 设置较小的缓存大小
      dataService.cacheManager.maxCacheSize = 2;
      
      // 添加缓存条目
      dataService.cacheManager.set('key1', 'data1');
      dataService.cacheManager.set('key2', 'data2');
      dataService.cacheManager.set('key3', 'data3'); // 应该删除key1
      
      expect(dataService.cacheManager.get('key1')).toBeNull();
      expect(dataService.cacheManager.get('key2')).toBe('data2');
      expect(dataService.cacheManager.get('key3')).toBe('data3');
    });

    test('应该正确清除所有缓存', () => {
      dataService.cacheManager.set('key1', 'data1');
      dataService.cacheManager.set('key2', 'data2');
      
      dataService.cacheManager.clear();
      
      expect(dataService.cacheManager.get('key1')).toBeNull();
      expect(dataService.cacheManager.get('key2')).toBeNull();
      expect(dataService.cacheManager.cache.size).toBe(0);
    });
  });

  describe('请求去重测试', () => {
    test('应该对相同请求进行去重', async () => {
      const mockResponse = {
        status: 200,
        data: '测试用户(user123) 2024-01-01 10:00:00\n测试消息内容'
      };
      
      mockAxios.get.mockResolvedValue(mockResponse);
      
      // 同时发起两个相同的请求
      const promise1 = dataService.getChatData('测试群', '2024-01-01~2024-01-01');
      const promise2 = dataService.getChatData('测试群', '2024-01-01~2024-01-01');
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      // 应该只调用一次API
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    test('应该在请求完成后清理请求队列', async () => {
      const mockResponse = {
        status: 200,
        data: '测试用户(user123) 2024-01-01 10:00:00\n测试消息内容'
      };
      
      mockAxios.get.mockResolvedValue(mockResponse);
      
      await dataService.getChatData('测试群', '2024-01-01~2024-01-01');
      
      // 请求队列应该为空
      expect(dataService.requestQueue.size).toBe(0);
    });
  });

  describe('数据解析测试', () => {
    test('应该正确解析文本格式的聊天数据', () => {
      const rawData = `张三(user123) 2024-01-01 10:00:00
你好，大家好！
李四(user456) 2024-01-01 10:01:00
早上好！`;
      
      const result = dataService.parseChatData(rawData, '测试群');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        senderName: '张三',
        senderId: 'user123',
        time: '2024-01-01 10:00:00',
        content: '你好，大家好！',
        groupName: '测试群'
      });
    });

    test('应该正确处理数组格式的数据', () => {
      const rawData = [
        {
          senderName: '张三',
          senderId: 'user123',
          time: '2024-01-01 10:00:00',
          content: '测试消息'
        }
      ];
      
      const result = dataService.parseChatData(rawData, '测试群');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        senderName: '张三',
        senderId: 'user123',
        time: '2024-01-01 10:00:00',
        content: '测试消息',
        groupName: '测试群'
      });
    });

    test('应该处理空数据', () => {
      const result1 = dataService.parseChatData('', '测试群');
      const result2 = dataService.parseChatData(null, '测试群');
      const result3 = dataService.parseChatData(undefined, '测试群');
      
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(result3).toEqual([]);
    });

    test('应该处理格式错误的数据', () => {
      const rawData = '这是一些格式错误的数据\n没有正确的格式';
      
      const result = dataService.parseChatData(rawData, '测试群');
      
      expect(result).toEqual([]);
    });
  });

  describe('批量数据获取测试', () => {
    test('应该正确合并多个时间段的数据', async () => {
      const mockResponses = [
        {
          status: 200,
          data: '用户1(user1) 2024-01-01 10:00:00\n消息1'
        },
        {
          status: 200,
          data: '用户2(user2) 2024-01-02 10:00:00\n消息2'
        }
      ];
      
      mockAxios.get
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1]);
      
      const timeRanges = ['2024-01-01~2024-01-01', '2024-01-02~2024-01-02'];
      const result = await dataService.getChatDataBatch('测试群', timeRanges);
      
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('消息1');
      expect(result[1].content).toBe('消息2');
    });

    test('应该按时间排序合并的数据', async () => {
      const mockResponses = [
        {
          status: 200,
          data: '用户1(user1) 2024-01-02 10:00:00\n消息2'
        },
        {
          status: 200,
          data: '用户2(user2) 2024-01-01 10:00:00\n消息1'
        }
      ];
      
      mockAxios.get
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1]);
      
      const timeRanges = ['2024-01-02~2024-01-02', '2024-01-01~2024-01-01'];
      const result = await dataService.getChatDataBatch('测试群', timeRanges);
      
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('消息1'); // 应该按时间排序
      expect(result[1].content).toBe('消息2');
    });
  });

  describe('预加载功能测试', () => {
    test('应该预加载多个群的数据', async () => {
      const mockResponse = {
        status: 200,
        data: '测试用户(user123) 2024-01-01 10:00:00\n测试消息'
      };
      
      mockAxios.get.mockResolvedValue(mockResponse);
      
      const groupNames = ['群1', '群2', '群3'];
      await dataService.preloadCommonData(groupNames);
      
      // 应该为每个群调用一次API
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });

    test('应该处理预加载过程中的错误', async () => {
      mockAxios.get
        .mockResolvedValueOnce({ status: 200, data: '成功数据' })
        .mockRejectedValueOnce(new Error('网络错误'))
        .mockResolvedValueOnce({ status: 200, data: '成功数据' });
      
      const groupNames = ['群1', '群2', '群3'];
      
      // 不应该抛出错误
      await expect(dataService.preloadCommonData(groupNames)).resolves.toBeUndefined();
    });
  });

  describe('健康检查测试', () => {
    test('应该在服务正常时返回健康状态', async () => {
      const mockResponse = {
        status: 200,
        headers: { 'x-response-time': '50ms' }
      };
      
      mockAxios.get.mockResolvedValue(mockResponse);
      
      const result = await dataService.healthCheck();
      
      expect(result.status).toBe('healthy');
      expect(result.chatlogService).toBe('connected');
      expect(result.responseTime).toBe('50ms');
    });

    test('应该在服务异常时返回不健康状态', async () => {
      mockAxios.get.mockRejectedValue(new Error('连接失败'));
      
      const result = await dataService.healthCheck();
      
      expect(result.status).toBe('unhealthy');
      expect(result.chatlogService).toBe('disconnected');
      expect(result.error).toBe('连接失败');
    });
  });

  describe('错误处理测试', () => {
    test('应该处理网络超时错误', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.code = 'ECONNABORTED';
      
      mockAxios.get.mockRejectedValue(timeoutError);
      
      await expect(dataService.getChatData('测试群')).rejects.toThrow('timeout');
    });

    test('应该处理API响应错误', async () => {
      const apiError = new Error('API Error');
      apiError.response = { status: 500, data: { message: '服务器错误' } };
      
      mockAxios.get.mockRejectedValue(apiError);
      
      await expect(dataService.getChatData('测试群')).rejects.toThrow('API Error');
    });

    test('应该处理无效的API响应', async () => {
      const mockResponse = {
        status: 200,
        data: null
      };
      
      mockAxios.get.mockResolvedValue(mockResponse);
      
      const result = await dataService.getChatData('测试群');
      expect(result).toEqual([]);
    });
  });

  describe('性能测试', () => {
    test('应该在合理时间内完成数据获取', async () => {
      const mockResponse = {
        status: 200,
        data: '测试用户(user123) 2024-01-01 10:00:00\n测试消息'
      };
      
      mockAxios.get.mockResolvedValue(mockResponse);
      
      const startTime = Date.now();
      await dataService.getChatData('测试群');
      const endTime = Date.now();
      
      // 应该在100ms内完成（模拟环境）
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('应该正确统计缓存性能', () => {
      // 添加一些缓存数据
      dataService.cacheManager.set('key1', 'data1');
      dataService.cacheManager.set('key2', 'data2');
      
      const stats = dataService.getCacheStats();
      
      expect(stats.cache.size).toBe(2);
      expect(stats.cache.maxSize).toBe(100);
      expect(stats.requestQueue.size).toBe(0);
    });
  });

  describe('边界条件测试', () => {
    test('应该处理极大的数据量', async () => {
      // 生成大量测试数据
      const largeData = Array.from({ length: 10000 }, (_, i) =>
        `用户${i}(user${i}) 2024-01-01 10:${String(i % 60).padStart(2, '0')}:00\n消息${i}`
      ).join('\n');
      
      const mockResponse = {
        status: 200,
        data: largeData
      };
      
      mockAxios.get.mockResolvedValue(mockResponse);
      
      const startTime = Date.now();
      const result = await dataService.getChatData('大数据测试群');
      const endTime = Date.now();
      
      expect(result).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(5000); // 5秒内完成
    });

    test('应该处理空字符串参数', async () => {
      await expect(dataService.getChatData('')).rejects.toThrow();
    });

    test('应该处理特殊字符', async () => {
      const specialData = '特殊用户!@#$%(user_special) 2024-01-01 10:00:00\n包含特殊字符的消息: <>&"\'';
      
      const mockResponse = {
        status: 200,
        data: specialData
      };
      
      mockAxios.get.mockResolvedValue(mockResponse);
      
      const result = await dataService.getChatData('特殊字符测试群');
      
      expect(result).toHaveLength(1);
      expect(result[0].senderName).toBe('特殊用户!@#$%');
      expect(result[0].content).toBe('包含特殊字符的消息: <>&"\'');
    });
  });
});