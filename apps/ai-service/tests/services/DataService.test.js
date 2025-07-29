import DataService from '@/services/DataService.js';
import ConfigManager from '@/config/ConfigManager.js';
import axios from 'axios';
import { jest } from '@jest/globals';

jest.mock('@/config/ConfigManager.js');
jest.mock('axios');

describe('DataService', () => {
    let dataService;
    let mockConfigManager;

    beforeEach(() => {
        mockConfigManager = {
            getChatlogConfig: jest.fn().mockReturnValue({
                baseURL: 'http://localhost:5030',
                timeout: 10000
            })
        };
        ConfigManager.mockImplementation(() => mockConfigManager);
        
        dataService = new DataService();
        
        // 清除所有模拟调用
        jest.clearAllMocks();
    });

    describe('getChatData', () => {
        test('should fetch chat data successfully', async () => {
            const mockResponse = {
                status: 200,
                data: 'User1(id1) 2025-01-24 10:00:00\nHello world\nUser2(id2) 2025-01-24 10:01:00\nHi there'
            };
            
            axios.get.mockResolvedValue(mockResponse);
            
            const result = await dataService.getChatData('TestGroup', '2025-01-24~2025-01-24');
            
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                senderName: 'User1',
                senderId: 'id1',
                content: 'Hello world',
                groupName: 'TestGroup'
            });
            expect(result[1]).toMatchObject({
                senderName: 'User2',
                senderId: 'id2',
                content: 'Hi there',
                groupName: 'TestGroup'
            });
        });

        test('should return cached data on second call', async () => {
            const mockResponse = {
                status: 200,
                data: 'User1(id1) 2025-01-24 10:00:00\nHello world'
            };
            
            axios.get.mockResolvedValue(mockResponse);
            
            // 第一次调用
            const result1 = await dataService.getChatData('TestGroup', '2025-01-24~2025-01-24');
            
            // 第二次调用应该使用缓存
            const result2 = await dataService.getChatData('TestGroup', '2025-01-24~2025-01-24');
            
            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(result2);
        });

        test('should handle empty response', async () => {
            const mockResponse = {
                status: 200,
                data: ''
            };
            
            axios.get.mockResolvedValue(mockResponse);
            
            const result = await dataService.getChatData('TestGroup', '2025-01-24~2025-01-24');
            
            expect(result).toHaveLength(0);
        });

        test('should handle API errors', async () => {
            axios.get.mockRejectedValue(new Error('Network error'));
            
            await expect(dataService.getChatData('TestGroup', '2025-01-24~2025-01-24'))
                .rejects.toThrow('Network error');
        });
    });

    describe('parseChatData', () => {
        test('should parse chat data correctly', () => {
            const rawData = 'User1(id1) 2025-01-24 10:00:00\nHello world\nUser2(id2) 2025-01-24 10:01:00\nHi there';
            
            const result = dataService.parseChatData(rawData, 'TestGroup');
            
            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                senderName: 'User1',
                senderId: 'id1',
                content: 'Hello world',
                time: '2025-01-24 10:00:00',
                groupName: 'TestGroup'
            });
        });

        test('should handle array input', () => {
            const arrayData = [
                { senderName: 'User1', content: 'Hello', time: '2025-01-24 10:00:00' }
            ];
            
            const result = dataService.parseChatData(arrayData, 'TestGroup');
            
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                senderName: 'User1',
                content: 'Hello',
                groupName: 'TestGroup'
            });
        });

        test('should handle empty input', () => {
            const result = dataService.parseChatData('', 'TestGroup');
            expect(result).toHaveLength(0);
        });
    });

    describe('getChatDataBatch', () => {
        test('should fetch multiple time ranges', async () => {
            const mockResponse = {
                status: 200,
                data: 'User1(id1) 2025-01-24 10:00:00\nHello'
            };
            
            axios.get.mockResolvedValue(mockResponse);
            
            const timeRanges = ['2025-01-24~2025-01-24', '2025-01-25~2025-01-25'];
            const result = await dataService.getChatDataBatch('TestGroup', timeRanges);
            
            expect(axios.get).toHaveBeenCalledTimes(2);
            expect(result).toHaveLength(2); // 2 messages from 2 time ranges
        });
    });

    describe('cache management', () => {
        test('should get cache stats', () => {
            const stats = dataService.getCacheStats();
            
            expect(stats).toHaveProperty('cache');
            expect(stats).toHaveProperty('requestQueue');
            expect(stats.cache).toHaveProperty('size');
            expect(stats.cache).toHaveProperty('maxSize');
        });

        test('should clear cache', () => {
            // 先添加一些数据到缓存
            dataService.cacheManager.set('test-key', 'test-data');
            
            // 清除缓存
            dataService.clearCache();
            
            // 验证缓存已清除
            const stats = dataService.getCacheStats();
            expect(stats.cache.size).toBe(0);
        });
    });

    describe('healthCheck', () => {
        test('should return healthy status when API is accessible', async () => {
            const mockResponse = {
                status: 200,
                headers: { 'x-response-time': '50ms' }
            };
            
            axios.get.mockResolvedValue(mockResponse);
            
            const result = await dataService.healthCheck();
            
            expect(result.status).toBe('healthy');
            expect(result.chatlogService).toBe('connected');
        });

        test('should return unhealthy status when API is not accessible', async () => {
            axios.get.mockRejectedValue(new Error('Connection refused'));
            
            const result = await dataService.healthCheck();
            
            expect(result.status).toBe('unhealthy');
            expect(result.chatlogService).toBe('disconnected');
            expect(result.error).toBe('Connection refused');
        });
    });

    describe('preloadCommonData', () => {
        test('should preload data for multiple groups', async () => {
            const mockResponse = {
                status: 200,
                data: 'User1(id1) 2025-01-24 10:00:00\nHello'
            };
            
            axios.get.mockResolvedValue(mockResponse);
            
            const groupNames = ['Group1', 'Group2'];
            await dataService.preloadCommonData(groupNames);
            
            expect(axios.get).toHaveBeenCalledTimes(2);
        });

        test('should handle errors during preload gracefully', async () => {
            axios.get
                .mockResolvedValueOnce({ status: 200, data: 'User1(id1) 2025-01-24 10:00:00\nHello' })
                .mockRejectedValueOnce(new Error('Network error'));
            
            const groupNames = ['Group1', 'Group2'];
            
            // 应该不抛出错误，而是优雅处理
            await expect(dataService.preloadCommonData(groupNames)).resolves.toBeUndefined();
        });
    });
});