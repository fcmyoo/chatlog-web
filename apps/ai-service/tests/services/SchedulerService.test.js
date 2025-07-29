import SchedulerService from '@/services/SchedulerService.js';
import AnalysisService from '@/services/AnalysisService.js';
import DataService from '@/services/DataService.js';
import { jest } from '@jest/globals';

jest.mock('@/services/AnalysisService.js');
jest.mock('@/services/DataService.js');

describe('SchedulerService', () => {
    let schedulerService;

    beforeEach(() => {
        schedulerService = new SchedulerService();
    });

    test('should initialize scheduler with valid config', async () => {
        const config = {
            enabled: true,
            cronTime: '*/5 * * * *',
        };
        await schedulerService.initialize(config);
        expect(schedulerService.currentJob).toBeDefined();
    });

    test('should not initialize scheduler with invalid config', async () => {
        const config = {
            enabled: true,
            cronTime: 'invalid-cron',
        };
        await expect(schedulerService.initialize(config)).rejects.toThrow('Cron表达式格式无效');
    });

    test('should start scheduler', async () => {
        const config = {
            enabled: true,
            cronTime: '*/5 * * * *',
        };
        await schedulerService.startScheduler(config);
        expect(schedulerService.currentJob).toBeDefined();
    });

    test('should stop scheduler', () => {
        schedulerService.stopScheduler();
        expect(schedulerService.currentJob).toBeNull();
    });

    test('should run scheduled analysis', async () => {
        const mockAnalysisItem = {
            name: 'Test Analysis',
            groupName: 'Test Group',
            analysisType: 'programming',
        };
        AnalysisService.performAnalysis.mockResolvedValue({ historyId: '12345' });
        const result = await schedulerService.executeAnalysisItem(mockAnalysisItem);
        expect(result.success).toBe(true);
        expect(result.historyId).toBe('12345');
    });

    test('should handle no chat data during analysis', async () => {
        const mockAnalysisItem = {
            name: 'Test Analysis',
            groupName: 'Test Group',
            analysisType: 'programming',
        };
        DataService.getChatData.mockResolvedValue([]);
        const result = await schedulerService.executeAnalysisItem(mockAnalysisItem);
        expect(result.success).toBe(false);
        expect(result.skipped).toBe(true);
        expect(result.reason).toBe('无聊天数据');
    });

    test('should update scheduler config', async () => {
        const newConfig = {
            enabled: false,
            cronTime: '*/10 * * * *',
        };
        await schedulerService.updateConfig(newConfig);
        expect(schedulerService.currentJob).toBeNull();
    });
});