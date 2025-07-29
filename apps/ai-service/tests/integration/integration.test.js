import request from 'supertest';
import app from '@/src/app.js';
import DataService from '@/services/DataService.js';
import AIService from '@/services/AIService.js';
import AnalysisService from '@/services/AnalysisService.js';
import { jest } from '@jest/globals';

describe('集成测试套件', () => {
  let server;
  
  beforeAll(async () => {
    // 启动测试服务器
    server = app.listen(0); // 使用随机端口
    
    // 设置测试超时
    jest.setTimeout(30000);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('API端到端集成测试', () => {
    test('完整的AI分析流程测试', async () => {
      // 模拟完整的分析流程
      const analysisRequest = {
        groupName: '集成测试群',
        analysisType: 'programming',
        customPrompt: '请分析这个技术讨论群的活跃度',
        timeRange: '2024-01-01~2024-01-31'
      };

      // 1. 发起分析请求
      const analysisResponse = await request(app)
        .post('/api/ai/analysis')
        .send(analysisRequest)
        .expect(200);

      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.data).toHaveProperty('historyId');

      const historyId = analysisResponse.body.data.historyId;

      // 2. 获取分析历史
      const historyResponse = await request(app)
        .get('/api/ai/history')
        .query({ page: 1, pageSize: 10 })
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.items).toBeInstanceOf(Array);

      // 3. 获取特定分析结果
      const detailResponse = await request(app)
        .get(`/api/ai/history/${historyId}`)
        .expect(200);

      expect(detailResponse.body.success).toBe(true);
      expect(detailResponse.body.data).toHaveProperty('content');
    });

    test('模型配置和测试流程', async () => {
      // 1. 获取当前配置
      const configResponse = await request(app)
        .get('/api/ai/models/config')
        .expect(200);

      expect(configResponse.body.success).toBe(true);
      expect(configResponse.body.data).toHaveProperty('provider');

      // 2. 测试模型连接
      const testRequest = {
        provider: 'DeepSeek',
        model: 'deepseek-reasoner',
        apiKey: 'test-api-key'
      };

      const testResponse = await request(app)
        .post('/api/ai/models/test')
        .send(testRequest)
        .expect(200);

      expect(testResponse.body).toHaveProperty('success');

      // 3. 更新配置
      const newConfig = {
        provider: 'DeepSeek',
        config: {
          model: 'deepseek-reasoner',
          apiKey: 'new-test-key',
          temperature: 0.8
        }
      };

      const updateResponse = await request(app)
        .post('/api/ai/models/config')
        .send(newConfig)
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.message).toBe('配置更新成功');
    });

    test('缓存管理流程测试', async () => {
      // 1. 获取缓存统计
      const statsResponse = await request(app)
        .get('/api/ai/cache/stats')
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data).toHaveProperty('cache');

      // 2. 预加载数据
      const preloadRequest = {
        groupNames: ['测试群1', '测试群2'],
        timeRange: '2024-01-01~2024-01-31'
      };

      const preloadResponse = await request(app)
        .post('/api/ai/cache/preload')
        .send(preloadRequest)
        .expect(200);

      expect(preloadResponse.body.success).toBe(true);
      expect(preloadResponse.body.message).toBe('预加载任务已启动');

      // 3. 清除缓存
      const clearResponse = await request(app)
        .post('/api/ai/cache/clear')
        .expect(200);

      expect(clearResponse.body.success).toBe(true);
      expect(clearResponse.body.message).toBe('缓存已清除');
    });

    test('系统健康检查集成测试', async () => {
      // 1. 基础健康检查
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body).toHaveProperty('status');

      // 2. AI系统健康检查
      const aiHealthResponse = await request(app)
        .get('/api/ai/system/health')
        .expect(200);

      expect(aiHealthResponse.body.success).toBe(true);
      expect(aiHealthResponse.body.data).toHaveProperty('status');

      // 3. 性能指标获取
      const metricsResponse = await request(app)
        .get('/metrics')
        .expect(200);

      // 指标应该是文本格式
      expect(typeof metricsResponse.text).toBe('string');
    });
  });

  describe('服务间集成测试', () => {
    test('DataService与外部API集成', async () => {
      const dataService = new DataService();
      
      // 测试健康检查
      const healthResult = await dataService.healthCheck();
      expect(healthResult).toHaveProperty('status');
      
      // 测试缓存统计
      const cacheStats = dataService.getCacheStats();
      expect(cacheStats).toHaveProperty('cache');
      expect(cacheStats).toHaveProperty('requestQueue');
    });

    test('AIService与配置管理集成', async () => {
      const aiService = new AIService();
      
      // 测试获取当前配置
      const config = await aiService.getCurrentConfig();
      expect(config).toHaveProperty('provider');
      expect(config).toHaveProperty('config');
      
      // 测试模型状态
      const status = await aiService.getModelStatus();
      expect(status).toHaveProperty('currentProvider');
      expect(status).toHaveProperty('availableProviders');
    });

    test('AnalysisService完整流程集成', async () => {
      const analysisService = new AnalysisService();
      
      // 测试系统健康检查
      const healthStatus = await analysisService.getSystemHealth();
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('services');
      
      // 测试缓存管理
      const cacheStats = await analysisService.getCacheStats();
      expect(cacheStats).toHaveProperty('cache');
      
      // 清除缓存
      await analysisService.clearCache();
      
      const newCacheStats = await analysisService.getCacheStats();
      expect(newCacheStats.cache.size).toBe(0);
    });
  });

  describe('错误处理集成测试', () => {
    test('API错误处理流程', async () => {
      // 1. 参数验证错误
      const invalidAnalysisResponse = await request(app)
        .post('/api/ai/analysis')
        .send({
          // 缺少必要参数
          analysisType: 'programming'
        })
        .expect(400);

      expect(invalidAnalysisResponse.body.success).toBe(false);
      expect(invalidAnalysisResponse.body.error.type).toBe('VALIDATION_ERROR');

      // 2. 无效的分析类型
      const invalidTypeResponse = await request(app)
        .post('/api/ai/analysis')
        .send({
          groupName: '测试群',
          analysisType: 'invalid_type'
        })
        .expect(400);

      expect(invalidTypeResponse.body.success).toBe(false);
      expect(invalidTypeResponse.body.error.type).toBe('VALIDATION_ERROR');

      // 3. 404错误
      const notFoundResponse = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(notFoundResponse.body.success).toBe(false);
      expect(notFoundResponse.body.error.type).toBe('VALIDATION_ERROR');
    });

    test('服务层错误传播测试', async () => {
      // 测试模型连接错误
      const invalidModelTest = await request(app)
        .post('/api/ai/models/test')
        .send({
          provider: 'InvalidProvider',
          apiKey: 'invalid-key'
        })
        .expect(400);

      expect(invalidModelTest.body.success).toBe(false);

      // 测试无效的历史记录ID
      const invalidHistoryResponse = await request(app)
        .get('/api/ai/history/nonexistent-id')
        .expect(422);

      expect(invalidHistoryResponse.body.success).toBe(false);
      expect(invalidHistoryResponse.body.error.type).toBe('BUSINESS_ERROR');
    });
  });

  describe('性能集成测试', () => {
    test('并发请求处理能力', async () => {
      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        request(app)
          .get('/health')
          .expect(200)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const duration = endTime - startTime;
      const throughput = concurrentRequests / (duration / 1000);

      console.log(`并发测试: ${concurrentRequests} 个请求耗时 ${duration}ms, 吞吐量: ${throughput.toFixed(0)} 请求/秒`);

      expect(responses).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(5000); // 应在5秒内完成
      expect(throughput).toBeGreaterThan(10); // 每秒至少10个请求
    });

    test('大数据量请求处理', async () => {
      const largeRequest = {
        groupName: '大数据测试群',
        analysisType: 'custom',
        customPrompt: 'A'.repeat(10000), // 10KB的提示词
        timeRange: '2024-01-01~2024-12-31'
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/ai/analysis')
        .send(largeRequest)
        .expect(200);
      const endTime = Date.now();

      const duration = endTime - startTime;

      console.log(`大数据量请求处理时间: ${duration}ms`);

      expect(response.body.success).toBe(true);
      expect(duration).toBeLessThan(30000); // 应在30秒内完成
    });
  });

  describe('数据一致性集成测试', () => {
    test('缓存与数据库一致性', async () => {
      const analysisService = new AnalysisService();
      
      // 1. 清除缓存
      await analysisService.clearCache();
      
      // 2. 获取分析历史（应该从存储读取）
      const history1 = await analysisService.getAnalysisHistory({ page: 1, pageSize: 5 });
      
      // 3. 再次获取（应该从缓存读取）
      const history2 = await analysisService.getAnalysisHistory({ page: 1, pageSize: 5 });
      
      // 4. 验证数据一致性
      expect(history1.items).toEqual(history2.items);
      expect(history1.total).toBe(history2.total);
    });

    test('配置更新传播测试', async () => {
      // 1. 更新配置
      const newConfig = {
        provider: 'DeepSeek',
        config: {
          model: 'deepseek-reasoner',
          apiKey: 'consistency-test-key',
          temperature: 0.9
        }
      };

      await request(app)
        .post('/api/ai/models/config')
        .send(newConfig)
        .expect(200);

      // 2. 验证配置已更新
      const configResponse = await request(app)
        .get('/api/ai/models/config')
        .expect(200);

      expect(configResponse.body.data.config.apiKey).toBe('consistency-test-key');
      expect(configResponse.body.data.config.temperature).toBe(0.9);

      // 3. 验证AI服务使用了新配置
      const aiService = new AIService();
      const currentConfig = await aiService.getCurrentConfig();
      
      expect(currentConfig.config.apiKey).toBe('consistency-test-key');
      expect(currentConfig.config.temperature).toBe(0.9);
    });
  });

  describe('安全性集成测试', () => {
    test('输入验证和清理', async () => {
      // 测试SQL注入防护
      const maliciousRequest = {
        groupName: "'; DROP TABLE users; --",
        analysisType: 'programming',
        timeRange: '2024-01-01~2024-01-31'
      };

      const response = await request(app)
        .post('/api/ai/analysis')
        .send(maliciousRequest);

      // 应该正常处理，不会导致系统错误
      expect([200, 400, 422]).toContain(response.status);

      // 测试XSS防护
      const xssRequest = {
        groupName: '<script>alert("xss")</script>',
        analysisType: 'programming',
        timeRange: '2024-01-01~2024-01-31'
      };

      const xssResponse = await request(app)
        .post('/api/ai/analysis')
        .send(xssRequest);

      expect([200, 400, 422]).toContain(xssResponse.status);
    });

    test('请求大小限制', async () => {
      // 测试超大请求体
      const hugeRequest = {
        groupName: '测试群',
        analysisType: 'custom',
        customPrompt: 'A'.repeat(15 * 1024 * 1024), // 15MB，超过10MB限制
        timeRange: '2024-01-01~2024-01-31'
      };
const response = await request(app)
  .post('/api/ai/analysis')
  .send(hugeRequest)
  .expect(413); // 应该返回413错误，请求实体过大

expect(response.body.success).toBe(false);
});
});
});
        