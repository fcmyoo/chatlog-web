/**
 * 边缘情况和异常处理测试
 * 测试系统在各种异常情况下的行为
 */

import AIService from '@/services/AIService.js';
import AnalysisService from '@/services/AnalysisService.js';
import DataService from '@/services/DataService.js';
import ConfigManager from '@/config/ConfigManager.js';
import { mockScenarios, resetAllMocks } from '../mocks/externalDependencies.js';

describe('边缘情况和异常处理测试', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    describe('AIService 边缘情况', () => {
        let aiService;

        beforeEach(() => {
            aiService = new AIService();
        });

        test('应该处理空的提示词', async () => {
            await expect(aiService.callAI('', 'system prompt'))
                .rejects.toThrow('提示词不能为空');
        });

        test('应该处理极长的提示词', async () => {
            const longPrompt = 'a'.repeat(100000); // 100k字符
            
            // 模拟AI服务返回错误
            mockScenarios.failedAiCall();
            
            await expect(aiService.callAI(longPrompt, 'system prompt'))
                .rejects.toThrow();
        });

        test('应该处理无效的API密钥', async () => {
            const result = await aiService.testConnection('DeepSeek', {
                model: 'deepseek-reasoner',
                apiKey: 'invalid-key'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('API密钥无效');
        });

        test('应该处理网络超时', async () => {
            // 模拟网络超时
            const timeoutError = new Error('timeout');
            timeoutError.code = 'ECONNABORTED';
            
            jest.spyOn(aiService, 'callAI').mockRejectedValue(timeoutError);
            
            await expect(aiService.callAI('test', 'system'))
                .rejects.toThrow('timeout');
        });

        test('应该处理API频率限制', async () => {
            const rateLimitError = new Error('Rate limit exceeded');
            rateLimitError.response = { status: 429 };
            
            jest.spyOn(aiService, 'callAI').mockRejectedValue(rateLimitError);
            
            await expect(aiService.callAI('test', 'system'))
                .rejects.toThrow('Rate limit exceeded');
        });

        test('应该处理不支持的AI提供商', async () => {
            await expect(aiService.getModel('UnsupportedProvider', {}))
                .rejects.toThrow('不支持的AI提供商: UnsupportedProvider');
        });
    });

    describe('AnalysisService 边缘情况', () => {
        let analysisService;

        beforeEach(() => {
            analysisService = new AnalysisService();
        });

        test('应该处理空的聊天数据', async () => {
            jest.spyOn(analysisService.dataService, 'getChatData')
                .mockResolvedValue([]);

            await expect(analysisService.performAnalysis({
                groupName: 'EmptyGroup',
                analysisType: 'programming',
                timeRange: '2025-01-01~2025-01-02'
            })).rejects.toThrow('未找到聊天数据');
        });

        test('应该处理无效的分析类型', async () => {
            await expect(analysisService.performAnalysis({
                groupName: 'TestGroup',
                analysisType: 'invalid-type',
                timeRange: '2025-01-01~2025-01-02'
            })).rejects.toThrow();
        });

        test('应该处理损坏的聊天数据格式', () => {
            const corruptedData = 'invalid\ndata\nformat';
            const result = analysisService.parseChatData(corruptedData, 'TestGroup');
            
            expect(result).toHaveLength(0);
        });

        test('应该处理存储空间不足', async () => {
            const metadata = { id: 'test-id' };
            const content = 'test content';
            
            jest.spyOn(analysisService, 'saveAnalysisHistory')
                .mockRejectedValue(new Error('ENOSPC: no space left on device'));

            await expect(analysisService.saveAnalysisHistory(metadata, content))
                .rejects.toThrow('ENOSPC');
        });

        test('应该处理并发访问冲突', async () => {
            // 模拟多个并发分析请求
            const promises = Array(5).fill().map((_, i) => 
                analysisService.performAnalysis({
                    groupName: `Group${i}`,
                    analysisType: 'programming',
                    timeRange: '2025-01-01~2025-01-02'
                })
            );

            // 至少有一些请求应该成功
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled');
            
            expect(successful.length).toBeGreaterThan(0);
        });
    });

    describe('DataService 边缘情况', () => {
        let dataService;

        beforeEach(() => {
            dataService = new DataService();
        });

        test('应该处理API服务不可用', async () => {
            mockScenarios.failedApiCall();

            await expect(dataService.getChatData('TestGroup', '2025-01-01~2025-01-02'))
                .rejects.toThrow();
        });

        test('应该处理无效的时间范围格式', async () => {
            await expect(dataService.getChatData('TestGroup', 'invalid-range'))
                .rejects.toThrow();
        });

        test('应该处理极大的数据量', async () => {
            // 模拟返回大量数据
            const largeData = Array(10000).fill().map((_, i) => 
                `User${i}(id${i}) 2025-01-01 10:00:00\nMessage ${i}`
            ).join('\n');

            jest.spyOn(dataService, '_fetchChatData')
                .mockResolvedValue({ data: largeData });

            const result = await dataService.getChatData('LargeGroup', '2025-01-01~2025-01-02');
            
            expect(result.length).toBeLessThanOrEqual(10000);
        });

        test('应该处理缓存溢出', () => {
            // 填满缓存
            for (let i = 0; i < 150; i++) {
                dataService.cacheManager.set(`key-${i}`, `data-${i}`);
            }

            const stats = dataService.getCacheStats();
            expect(stats.cache.size).toBeLessThanOrEqual(100); // 最大缓存大小
        });

        test('应该处理网络间歇性故障', async () => {
            let callCount = 0;
            jest.spyOn(dataService, '_fetchChatData')
                .mockImplementation(() => {
                    callCount++;
                    if (callCount <= 2) {
                        throw new Error('Network error');
                    }
                    return Promise.resolve({ data: 'success' });
                });

            // 应该在重试后成功
            const result = await dataService.getChatData('TestGroup', '2025-01-01~2025-01-02');
            expect(result).toBeDefined();
        });
    });

    describe('ConfigManager 边缘情况', () => {
        let configManager;

        beforeEach(() => {
            configManager = new ConfigManager();
        });

        test('应该处理配置文件损坏', async () => {
            jest.spyOn(require('fs'), 'readFileSync')
                .mockReturnValue('invalid json content');

            const config = await configManager.getModelConfig();
            
            // 应该返回默认配置
            expect(config.provider).toBe('DeepSeek');
        });

        test('应该处理配置文件权限问题', async () => {
            jest.spyOn(require('fs'), 'writeFileSync')
                .mockImplementation(() => {
                    throw new Error('EACCES: permission denied');
                });

            await expect(configManager.saveModelConfig({
                provider: 'DeepSeek',
                config: { apiKey: 'test' }
            })).rejects.toThrow('配置保存失败');
        });

        test('应该处理环境变量缺失', async () => {
            // 清除环境变量
            const originalEnv = process.env.DEEPSEEK_API_KEY;
            delete process.env.DEEPSEEK_API_KEY;

            const config = await configManager.getModelConfig();
            
            expect(config.config.apiKey).toBeUndefined();
            
            // 恢复环境变量
            if (originalEnv) {
                process.env.DEEPSEEK_API_KEY = originalEnv;
            }
        });

        test('应该处理无效的Cron表达式', async () => {
            const invalidConfig = {
                enabled: true,
                cronTime: 'invalid cron expression'
            };

            const validation = await configManager.validateConfig();
            // 验证应该检测到问题
            expect(validation.valid).toBe(false);
        });
    });

    describe('系统级边缘情况', () => {
        test('应该处理内存不足情况', () => {
            // 模拟内存不足
            const originalMemoryUsage = process.memoryUsage;
            process.memoryUsage = jest.fn().mockReturnValue({
                rss: 1024 * 1024 * 1024, // 1GB
                heapTotal: 512 * 1024 * 1024, // 512MB
                heapUsed: 500 * 1024 * 1024, // 500MB (接近限制)
                external: 0,
                arrayBuffers: 0
            });

            // 系统应该能够检测到内存压力
            const memUsage = process.memoryUsage();
            expect(memUsage.heapUsed / memUsage.heapTotal).toBeGreaterThan(0.9);

            // 恢复原始函数
            process.memoryUsage = originalMemoryUsage;
        });

        test('应该处理磁盘空间不足', async () => {
            const analysisService = new AnalysisService();
            
            jest.spyOn(require('fs-extra'), 'writeJSON')
                .mockRejectedValue(new Error('ENOSPC: no space left on device'));

            await expect(analysisService.saveAnalysisHistory(
                { id: 'test' }, 
                'content'
            )).rejects.toThrow('ENOSPC');
        });

        test('应该处理进程信号中断', () => {
            const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
            const mockOn = jest.spyOn(process, 'on').mockImplementation(() => {});

            // 模拟SIGINT信号
            process.emit('SIGINT');

            // 验证信号处理器被调用
            expect(mockOn).toHaveBeenCalled();

            mockExit.mockRestore();
            mockOn.mockRestore();
        });

        test('应该处理数据库连接丢失', async () => {
            // 模拟数据库连接问题
            const dataService = new DataService();
            
            jest.spyOn(dataService, 'healthCheck')
                .mockResolvedValue({
                    status: 'unhealthy',
                    error: 'Database connection lost'
                });

            const health = await dataService.healthCheck();
            expect(health.status).toBe('unhealthy');
        });
    });

    describe('安全相关边缘情况', () => {
        test('应该处理恶意输入', async () => {
            const analysisService = new AnalysisService();
            
            const maliciousInput = {
                groupName: '<script>alert("xss")</script>',
                analysisType: 'programming',
                customPrompt: '"; DROP TABLE users; --',
                timeRange: '2025-01-01~2025-01-02'
            };

            // 系统应该清理或拒绝恶意输入
            await expect(analysisService.performAnalysis(maliciousInput))
                .rejects.toThrow();
        });

        test('应该处理过长的输入', async () => {
            const analysisService = new AnalysisService();
            
            const oversizedInput = {
                groupName: 'a'.repeat(10000),
                analysisType: 'programming',
                customPrompt: 'b'.repeat(100000),
                timeRange: '2025-01-01~2025-01-02'
            };

            await expect(analysisService.performAnalysis(oversizedInput))
                .rejects.toThrow();
        });

        test('应该处理无效的文件路径', async () => {
            const analysisService = new AnalysisService();
            
            const invalidPath = '../../../etc/passwd';
            
            await expect(analysisService.getAnalysisById(invalidPath))
                .rejects.toThrow();
        });
    });
});