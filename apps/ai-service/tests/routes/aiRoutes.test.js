import request from 'supertest';
import app from '@/app.js'; // 引入Express应用
import AIService from '@/services/AIService.js';
import AnalysisService from '@/services/AnalysisService.js';

jest.mock('@/services/AIService.js');
jest.mock('@/services/AnalysisService.js');

describe('AI Routes', () => {
    describe('POST /api/ai/analysis', () => {
        test('should perform analysis successfully', async () => {
            const mockResult = { historyId: '12345' };
            AnalysisService.performAnalysis.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/ai/analysis')
                .send({
                    groupName: 'Test Group',
                    analysisType: 'programming',
                    customPrompt: 'Analyze the chat data.',
                    timeRange: '2025-07-23~2025-07-24',
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: mockResult,
            });
        });

        test('should return validation error for missing groupName', async () => {
            const response = await request(app)
                .post('/api/ai/analysis')
                .send({
                    analysisType: 'programming',
                    customPrompt: 'Analyze the chat data.',
                    timeRange: '2025-07-23~2025-07-24',
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: '请指定群聊名称',
                },
            });
        });
    });

    describe('GET /api/ai/history', () => {
        test('should return analysis history', async () => {
            const mockHistory = [{ id: '12345', title: 'Test Analysis' }];
            AnalysisService.getAnalysisHistory.mockResolvedValue(mockHistory);

            const response = await request(app)
                .get('/api/ai/history?page=1&pageSize=10');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                success: true,
                data: mockHistory,
            });
        });
    });

    describe('POST /api/ai/models/test', () => {
        test('should test AI model connection', async () => {
            const mockResult = { success: true, message: '连接测试成功' };
            AIService.testConnection.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/ai/models/test')
                .send({
                    provider: 'DeepSeek',
                    model: 'deepseek-reasoner',
                    apiKey: 'test-api-key',
                });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockResult);
        });

        test('should return validation error for missing provider', async () => {
            const response = await request(app)
                .post('/api/ai/models/test')
                .send({
                    model: 'deepseek-reasoner',
                    apiKey: 'test-api-key',
                });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({
                success: false,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: '缺少必要参数',
                },
            });
        });
    });
});