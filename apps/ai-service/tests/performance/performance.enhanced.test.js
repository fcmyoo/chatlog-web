import { performance } from 'perf_hooks';
import DataService from '@/services/DataService.js';
import AIService from '@/services/AIService.js';
import AnalysisService from '@/services/AnalysisService.js';
import { jest } from '@jest/globals';

describe('性能压力测试套件', () => {
  let dataService;
  let aiService;
  let analysisService;

  beforeAll(() => {
    // 设置较长的测试超时时间
    jest.setTimeout(60000);
  });

  beforeEach(() => {
    dataService = new DataService();
    aiService = new AIService();
    analysisService = new AnalysisService();
  });

  describe('数据服务性能测试', () => {
    test('缓存性能测试 - 大量并发读写', async () => {
      const cacheManager = dataService.cacheManager;
      const iterations = 10000;
      
      const startTime = performance.now();
      
      // 并发写入测试
      const writePromises = Array.from({ length: iterations }, (_, i) => {
        return Promise.resolve(cacheManager.set(`key_${i}`, `data_${i}`));
      });
      
      await Promise.all(writePromises);
      
      // 并发读取测试
      const readPromises = Array.from({ length: iterations }, (_, i) => {
        return Promise.resolve(cacheManager.get(`key_${i}`));
      });
      
      const results = await Promise.all(readPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`缓存性能测试: ${iterations} 次读写操作耗时 ${duration.toFixed(2)}ms`);
      
      // 验证结果
      expect(results.filter(r => r !== null)).toHaveLength(Math.min(iterations, cacheManager.maxCacheSize));
      expect(duration).toBeLessThan(1000); // 应在1秒内完成
    });

    test('数据解析性能测试 - 大数据量', () => {
      const largeDataSize = 50000;
      const testData = Array.from({ length: largeDataSize }, (_, i) => 
        `用户${i}(user${i}) 2024-01-01 ${String(Math.floor(i / 3600) % 24).padStart(2, '0')}:${String(Math.floor(i / 60) % 60).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}\n这是第${i}条测试消息，包含一些中文内容和数字${i * 2}`
      ).join('\n');
      
      const startTime = performance.now();
      const result = dataService.parseChatData(testData, '性能测试群');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      const throughput = largeDataSize / (duration / 1000); // 每秒处理条数
      
      console.log(`数据解析性能: ${largeDataSize} 条记录耗时 ${duration.toFixed(2)}ms, 吞吐量: ${throughput.toFixed(0)} 条/秒`);
      
      expect(result).toHaveLength(largeDataSize);
      expect(duration).toBeLessThan(5000); // 应在5秒内完成
      expect(throughput).toBeGreaterThan(1000); // 每秒至少处理1000条
    });

    test('内存使用测试 - 大数据集处理', () => {
      const initialMemory = process.memoryUsage();
      
      // 创建大量数据
      const largeDataSets = Array.from({ length: 100 }, (_, i) => {
        return Array.from({ length: 1000 }, (_, j) => ({
          id: i * 1000 + j,
          senderName: `用户${j}`,
          content: `这是一条测试消息 ${i}-${j}，包含一些内容来测试内存使用情况`,
          timestamp: Date.now() + j
        }));
      });
      
      // 处理数据
      const processedData = largeDataSets.map(dataSet => 
        dataService.normalizeArrayData(dataSet, `测试群${Math.floor(Math.random() * 10)}`)
      );
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseInMB = memoryIncrease / 1024 / 1024;
      
      console.log(`内存使用测试: 处理 ${largeDataSets.length * 1000} 条记录，内存增长 ${memoryIncreaseInMB.toFixed(2)}MB`);
      
      expect(processedData.flat()).toHaveLength(100000);
      expect(memoryIncreaseInMB).toBeLessThan(100); // 内存增长应小于100MB
    });
  });

  describe('并发处理性能测试', () => {
    test('高并发缓存访问测试', async () => {
      const concurrentRequests = 1000;
      const cacheManager = dataService.cacheManager;
      
      // 预填充一些缓存数据
      for (let i = 0; i < 100; i++) {
        cacheManager.set(`preload_${i}`, `data_${i}`);
      }
      
      const startTime = performance.now();
      
      // 创建大量并发请求
      const promises = Array.from({ length: concurrentRequests }, async (_, i) => {
        const operations = [];
        
        // 混合读写操作
        if (i % 3 === 0) {
          // 写操作
          operations.push(Promise.resolve(cacheManager.set(`concurrent_${i}`, `data_${i}`)));
        } else {
          // 读操作
          const key = `preload_${i % 100}`;
          operations.push(Promise.resolve(cacheManager.get(key)));
        }
        
        return Promise.all(operations);
      });
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      const throughput = concurrentRequests / (duration / 1000);
      
      console.log(`并发缓存测试: ${concurrentRequests} 个并发请求耗时 ${duration.toFixed(2)}ms, 吞吐量: ${throughput.toFixed(0)} 请求/秒`);
      
      expect(results).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(2000); // 应在2秒内完成
    });

    test('请求去重性能测试', async () => {
      const duplicateRequests = 500;
      const uniqueKeys = 10; // 只有10个不同的键，其他都是重复的
      
      // 模拟API调用
      const mockApiCall = jest.fn().mockImplementation(async (key) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // 模拟10ms的API延迟
        return `result_for_${key}`;
      });
      
      // 重写getChatData方法来使用模拟的API调用
      const originalGetChatData = dataService._fetchChatData;
      dataService._fetchChatData = mockApiCall;
      
      const startTime = performance.now();
      
      // 创建大量重复请求
      const promises = Array.from({ length: duplicateRequests }, (_, i) => {
        const key = `key_${i % uniqueKeys}`; // 创建重复的键
        return dataService.getChatData(key, '2024-01-01~2024-01-01', 1000);
      });
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      console.log(`请求去重测试: ${duplicateRequests} 个请求（${uniqueKeys} 个唯一）耗时 ${duration.toFixed(2)}ms`);
      console.log(`API调用次数: ${mockApiCall.mock.calls.length} (期望: ${uniqueKeys})`);
      
      // 恢复原方法
      dataService._fetchChatData = originalGetChatData;
      
      expect(results).toHaveLength(duplicateRequests);
      expect(mockApiCall.mock.calls.length).toBe(uniqueKeys); // 应该只调用唯一键的次数
      expect(duration).toBeLessThan(1000); // 应在1秒内完成
    });
  });

  describe('压力测试', () => {
    test('极限数据量处理测试', () => {
      const extremeDataSize = 100000;
      
      // 生成极大的测试数据
      const hugeDataSet = Array.from({ length: extremeDataSize }, (_, i) => {
        const hour = String(Math.floor(i / 3600) % 24).padStart(2, '0');
        const minute = String(Math.floor(i / 60) % 60).padStart(2, '0');
        const second = String(i % 60).padStart(2, '0');
        
        return `用户${i % 1000}(user${i % 1000}) 2024-01-01 ${hour}:${minute}:${second}\n` +
               `这是第${i}条消息，包含一些测试内容。消息ID: ${i}, 随机数: ${Math.random().toString(36)}`;
      }).join('\n');
      
      const startTime = performance.now();
      const initialMemory = process.memoryUsage().heapUsed;
      
      const result = dataService.parseChatData(hugeDataSet, '压力测试群');
      
      const endTime = performance.now();
      const finalMemory = process.memoryUsage().heapUsed;
      
      const duration = endTime - startTime;
      const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024; // MB
      const throughput = extremeDataSize / (duration / 1000);
      
      console.log(`极限压力测试: ${extremeDataSize} 条记录`);
      console.log(`处理时间: ${duration.toFixed(2)}ms`);
      console.log(`内存使用: ${memoryUsed.toFixed(2)}MB`);
      console.log(`吞吐量: ${throughput.toFixed(0)} 条/秒`);
      
      expect(result).toHaveLength(extremeDataSize);
      expect(duration).toBeLessThan(10000); // 应在10秒内完成
      expect(memoryUsed).toBeLessThan(500); // 内存使用应小于500MB
    });

    test('长时间运行稳定性测试', async () => {
      const testDuration = 5000; // 5秒测试
      const operationInterval = 10; // 每10ms一次操作
      
      let operationCount = 0;
      let errorCount = 0;
      const startTime = performance.now();
      
      const testPromise = new Promise((resolve) => {
        const interval = setInterval(() => {
          try {
            // 执行各种操作
            const operation = operationCount % 4;
            
            switch (operation) {
              case 0:
                // 缓存操作
                dataService.cacheManager.set(`stability_${operationCount}`, `data_${operationCount}`);
                break;
              case 1:
                // 缓存读取
                dataService.cacheManager.get(`stability_${operationCount - 10}`);
                break;
              case 2:
                // 数据解析
                dataService.parseChatData(`用户${operationCount}(user) 2024-01-01 10:00:00\n测试消息${operationCount}`, '稳定性测试群');
                break;
              case 3:
                // 缓存清理
                if (operationCount % 100 === 0) {
                  dataService.cacheManager.clear();
                }
                break;
            }
            
            operationCount++;
            
            if (performance.now() - startTime >= testDuration) {
              clearInterval(interval);
              resolve();
            }
          } catch (error) {
            errorCount++;
            console.error(`操作 ${operationCount} 失败:`, error);
          }
        }, operationInterval);
      });
      
      await testPromise;
      
      const endTime = performance.now();
      const actualDuration = endTime - startTime;
      const operationsPerSecond = operationCount / (actualDuration / 1000);
      
      console.log(`稳定性测试结果:`);
      console.log(`运行时间: ${actualDuration.toFixed(2)}ms`);
      console.log(`总操作数: ${operationCount}`);
      console.log(`错误数: ${errorCount}`);
      console.log(`操作频率: ${operationsPerSecond.toFixed(0)} 操作/秒`);
      console.log(`错误率: ${(errorCount / operationCount * 100).toFixed(2)}%`);
      
      expect(errorCount).toBe(0); // 不应该有错误
      expect(operationCount).toBeGreaterThan(400); // 应该执行足够多的操作
      expect(operationsPerSecond).toBeGreaterThan(80); // 每秒至少80次操作
    });
  });

  describe('资源使用监控', () => {
    test('内存泄漏检测', async () => {
      const iterations = 1000;
      const memorySnapshots = [];
      
      // 执行多轮操作并监控内存
      for (let round = 0; round < 10; round++) {
        // 强制垃圾回收（如果可用）
        if (global.gc) {
          global.gc();
        }
        
        const beforeMemory = process.memoryUsage().heapUsed;
        
        // 执行大量操作
        for (let i = 0; i < iterations; i++) {
          const key = `leak_test_${round}_${i}`;
          dataService.cacheManager.set(key, `data_${i}`.repeat(100)); // 创建较大的数据
          dataService.cacheManager.get(key);
        }
        
        // 清理缓存
        dataService.cacheManager.clear();
        
        // 再次强制垃圾回收
        if (global.gc) {
          global.gc();
        }
        
        const afterMemory = process.memoryUsage().heapUsed;
        memorySnapshots.push({
          round,
          beforeMemory: beforeMemory / 1024 / 1024,
          afterMemory: afterMemory / 1024 / 1024,
          difference: (afterMemory - beforeMemory) / 1024 / 1024
        });
      }
      
      console.log('内存泄漏检测结果:');
      memorySnapshots.forEach(snapshot => {
        console.log(`第 ${snapshot.round} 轮: 前内存 ${snapshot.beforeMemory.toFixed(2)}MB, 后内存 ${snapshot.afterMemory.toFixed(2)}MB, 增加 ${snapshot.difference.toFixed(2)}MB`);
      });
      
      const totalMemoryIncrease = memorySnapshots.reduce((acc, snapshot) => acc + snapshot.difference, 0);
      expect(totalMemoryIncrease).toBeLessThan(50); // 总内存增加应小于50MB
    });
  });
});