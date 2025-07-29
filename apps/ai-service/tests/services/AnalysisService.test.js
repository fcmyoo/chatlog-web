import AnalysisService from '@/services/AnalysisService.js';
import DataService from '@/services/DataService.js';
import { jest } from '@jest/globals';

jest.mock('@/services/DataService.js');

describe('AnalysisService', () => {
    let analysisService;

    beforeEach(() => {
        analysisService = new AnalysisService();
        DataService.mockImplementation(() => {
            return {
                getChatData: jest.fn().mockResolvedValue([
                    { senderName: 'User 1', content: 'Hello', time: '2025-07-23T10:00:00Z' },
                    { senderName: 'User 2', content: 'Hi', time: '2025-07-23T10:01:00Z' },
                ]),
            };
        });
    });

    test('should perform analysis successfully', async () => {
        const result = await analysisService.performAnalysis({
            groupName: 'Test Group',
            analysisType: 'programming',
            customPrompt: 'Analyze the chat data.',
            timeRange: '2025-07-23~2025-07-24',
        });
        expect(result).toBeDefined();
        expect(result).toHaveProperty('historyId');
    });

    test('should throw error for missing chat data', async () => {
        DataService.mockImplementation(() => {
            return {
                getChatData: jest.fn().mockResolvedValue([]),
            };
        });
        await expect(analysisService.performAnalysis({
            groupName: 'Test Group',
            analysisType: 'programming',
            customPrompt: 'Analyze the chat data.',
            timeRange: '2025-07-23~2025-07-24',
        })).rejects.toThrow('未找到聊天数据，请检查时间范围和群聊名称是否正确');
    });

    test('should get analysis history', async () => {
        const history = await analysisService.getAnalysisHistory({ page: 1, pageSize: 10 });
        expect(history).toBeDefined();
        expect(history.items).toBeInstanceOf(Array);
    });

    test('should save analysis history', async () => {
        const metadata = {
            id: '12345',
            title: 'Test Analysis',
            groupName: 'Test Group',
            analysisType: 'programming',
            timeRange: '2025-07-23~2025-07-24',
            messageCount: 2,
            timestamp: new Date().toISOString(),
        };
        const content = 'Analysis result content';
        const historyId = await analysisService.saveAnalysisHistory(metadata, content);
        expect(historyId).toBe(metadata.id);
    });
});