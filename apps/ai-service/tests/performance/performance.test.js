/**
 * 性能测试套件
 * 测试系统在高负载和大数据量情况下的性能表现
 */

import AIService from '@/services/AIService.js';
import AnalysisService from '@/services/AnalysisService.js';
import DataService from '@/services/DataService.js';
import { performance } from 'perf_hooks';

describe('性能测试套件', () => {
    // 性能测试超时时间设置为30秒
    jest.setTimeout(30000);

    describe('DataService 性能测试', () => {
        let dataService;

        beforeEach(() => {
            dataService = new DataService();
        });

        test('应该在合理时间内处理大量聊天数据', async () => {
            // 生成大量测试数据
            const largeDataSet = Array(10000).fill().map((_, i) => 
                `User${i % 100}(id${i % 100}) 2025-01-24 ${String(10 + i % 14).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00\nMessage content ${i}`
            ).join('\n');

            const startTime = performance.now();
            
            const result = dataService.parseChatData(largeDataSet, 'LargeGroup');
            
            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(result).toHaveLength(10000);
            expect(duration).toBeLessThan(5000); // 应该在5秒内完成
            
            console.log(`处理10000条聊天记录耗时: ${duration.toFixed(2)}ms`);
        });

        test('应该高效处理缓存操作', async () => {
            const iterations = 1000;
            const startTime = performance.now();

            // 执行大量缓存操作
            for (let i = 0; i < iterations; i++) {
                const key = `test-key-${i}`;
                const data = { id: i, content: `test data ${i}` };
                
                dataService.cacheManager.set(key, data);
                const retrieved = dataService.cacheManager.get(key);
                
                expect(retrieved).toEqual(data);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(1000); // 1000次操作应该在1秒内完成
            
            console.log(`执行${iterations}次缓存操作耗时: ${duration.toFixed(2)}ms`);
        });

        test('应该处理并发数据请求', async () => {
            const concurrentRequests = 50;
            const startTime = performance.now();

            // 模拟并发请求
            const promises = Array(concurrentRequests).fill().map((_, i) => 
                dataService.getChatData(`Group${i}`, '2025-01-24~2025-01-24')
            );

            const results = await Promise.allSettled(promises);
            
            const endTime = performance.now();
            const duration = endTime - startTime;

            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            expect(successful).toBeGreaterThan(concurrentRequests * 0.8); // 至少80%成功
            expect(duration).toBeLessThan(10000); // 应该在10秒内完成
            
            console.log(`处理${concurrentRequests}个并发请求耗时: ${duration.toFixed(2)}ms, 成功率: ${(successful/concurrentRequests*100).toFixed(1)}%`);
        });
    });

    describe('AnalysisService 性能测试', () => {
        let analysisService;

        beforeEach(() => {
            analysisService = new AnalysisService();
        });

        test('应该高效生成分析提示词', () => {
            const largeDataSet = Array(5000).fill().map((_, i) => ({
                senderName: `User${i % 50}`,
                content: `This is message number ${i} with some content`,
                time: new Date(2025, 0, 24, 10, i % 60, 0).toISOString()
            }));

            const startTime = performance.now();
            
            const prompt = analysisService.generateAnalysisPrompt(largeDataSet, 'programming');
            
            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(prompt).toBeDefined();
            expect(prompt.length).toBeGreaterThan(0);
            expect(duration).toBeLessThan(1000); // 应该在1秒内完成
            
            console.log(`生成5000条消息的分析提示词耗时: ${duration.toFixed(2)}ms`);
        });

        test('应该高效处理历史记录保存', async () => {
            const batchSize = 100;
            const startTime = performance.now();

            const savePromises = Array(batchSize).fill().map((_, i) => {
                const metadata = {
                    id: `perf-test-${i}`,
                    title: `Performance Test ${i}`,
                    groupName: 'PerfTestGroup',
                    analysisType: 'programming',
                    timeRange: '2025-01-24~2025-01-24',
                    messageCount: 100,
                    timestamp: new Date().toISOString()
                };
                const content = `Performance test analysis result ${i}`;
                
                return analysisService.saveAnalysisHistory(metadata, content);
            });

            const results = await Promise.allSettled(savePromises);
            
            const endTime = performance.now();
            const duration = endTime - startTime;

            const successful = results.filter(r => r.status === 'fulfilled').length;
            
            expect(successful).toBeGreaterThan(batchSize * 0.9); // 至少90%成功
            expect(duration).toBeLessThan(5000); // 应该在5秒内完成
            
            console.log(`保存${batchSize}个分析历史耗时: ${duration.toFixed(2)}ms, 成功率: ${(successful/batchSize*100).toFixed(1)}%`);
        });
    });

    describe('AIService 性能测试', () => {
        let aiService;

        beforeEach(() => {
            aiService = new AIService();
        });

        test('应该高效处理模型配置更新', async () => {
            const updateCount = 50;
            const startTime = performance.now();

            for (let i = 0; i < updateCount; i++) {
                const config = {
                    provider: 'DeepSeek',
                    config: {
                        model: 'deepseek-reasoner',
                        apiKey: `test-key-${i}`,
                        temperature: 0.1 + (i % 10) * 0.1
                    }
                };

                await aiService.updateConfig(config);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(2000); // 应该在2秒内完成
            
            console.log(`执行${updateCount}次配置更新耗时: ${duration.toFixed(2)}ms`);
        });

        test('应该处理模型连接测试的并发请求', async () => {
            const concurrentTests = 20;
            const startTime = performance.now();

            const testPromises = Array(concurrentTests).fill().map((_, i) => 
                aiService.testConnection('DeepSeek', {
                    model: 'deepseek-reasoner',
                    apiKey: `test-key-${i}`
                })
            );

            const results = await Promise.allSettled(testPromises);
            
            const endTime = performance.now();
            const duration = endTime - startTime;

            const completed = results.filter(r => r.status === 'fulfilled').length;
            
            expect(completed).toBe(concurrentTests);
            expect(duration).toBeLessThan(8000); // 应该在8秒内完成
            
            console.log(`执行${concurrentTests}个并发连接测试耗时: ${duration.toFixed(2)}ms`);
        });
    });

    describe('内存使用性能测试', () => {
        test('应该在处理大数据时保持合理的内存使用', () => {
            const initialMemory = process.memoryUsage();
            
            // 创建大量数据
            const largeArray = Array(100000).fill().map((_, i) => ({
                id: i,
                data: `Large data item ${i}`,
                timestamp: Date.now()
            }));

            const afterCreationMemory = process.memoryUsage();
            
            // 清理数据
            largeArray.length = 0;
            
            // 强制垃圾回收（如果可用）
            if (global.gc) {
                global.gc();
            }
            
            const afterCleanupMemory = process.memoryUsage();
            
            const memoryIncrease = afterCreationMemory.heapUsed - initialMemory.heapUsed;
            const memoryRecovered = afterCreationMemory.heapUsed - afterCleanupMemory.heapUsed;
            
            console.log(`内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
            console.log(`内存回收: ${(memoryRecovered / 1024 / 1024).toFixed(2)}MB`);
            
            // 内存增长应该是合理的
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 小于100MB
        });
    });

    describe('响应时间基准测试', () => {
        test('API响应时间基准', async () => {
            const dataService = new DataService();
            const iterations = 10;
            const responseTimes = [];

            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();
                
                try {
                    await dataService.getChatData('TestGroup', '2025-01-24~2025-01-24');
                } catch (error) {
                    // 忽略错误，只测试响应时间
                }
                
                const endTime = performance.now();
                responseTimes.push(endTime - startTime);
            }

            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);
            const minResponseTime = Math.min(...responseTimes);

            console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
            console.log(`最大响应时间: ${maxResponseTime.toFixed(2)}ms`);
            console.log(`最小响应时间: ${minResponseTime.toFixed(2)}ms`);

            // 平均响应时间应该在合理范围内
            expect(avgResponseTime).toBeLessThan(1000); // 小于1秒
        });
    });

    describe('负载测试', () => {
        test('应该处理高频率的请求', async () => {
            const analysisService = new AnalysisService();
            const requestsPerSecond = 10;
            const testDuration = 5; // 5秒
            const totalRequests = requestsPerSecond * testDuration;
            
            const startTime = performance.now();
            const promises = [];

            for (let i = 0; i < totalRequests; i++) {
                // 模拟高频请求
                const promise = new Promise(resolve => {
                    setTimeout(() => {
                        try {
                            const result = analysisService.generateAnalysisPrompt(
                                [{ senderName: 'User', content: `Message ${i}`, time: new Date().toISOString() }],
                                'programming'
                            );
                            resolve({ success: true, result });
                        } catch (error) {
                            resolve({ success: false, error: error.message });
                        }
                    }, (i / requestsPerSecond) * 1000);
                });
                
                promises.push(promise);
            }

            const results = await Promise.all(promises);
            const endTime = performance.now();
            
            const successful = results.filter(r => r.success).length;
            const duration = endTime - startTime;
            const actualRPS = (successful / duration) * 1000;

            console.log(`处理${totalRequests}个请求，成功${successful}个`);
            console.log(`实际RPS: ${actualRPS.toFixed(2)}`);
            console.log(`总耗时: ${duration.toFixed(2)}ms`);

            expect(successful).toBeGreaterThan(totalRequests * 0.95); // 95%成功率
            expect(actualRPS).toBeGreaterThan(requestsPerSecond * 0.8); // 至少80%的目标RPS
        });
    });
});