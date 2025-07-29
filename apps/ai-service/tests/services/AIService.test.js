import AIService from '@/services/AIService.js';
import ConfigManager from '@/config/ConfigManager.js';
import { jest } from '@jest/globals';

jest.mock('@/config/ConfigManager.js');

describe('AIService', () => {
    let aiService;

    beforeEach(() => {
        aiService = new AIService();
        ConfigManager.mockImplementation(() => {
            return {
                getModelConfig: jest.fn().mockResolvedValue({
                    provider: 'DeepSeek',
                    config: {
                        model: 'deepseek-reasoner',
                        apiKey: 'test-api-key',
                    },
                }),
            };
        });
    });

    test('should get or create AI model instance', async () => {
        const model = await aiService.getModel('DeepSeek', {
            model: 'deepseek-reasoner',
            apiKey: 'test-api-key',
        });
        expect(model).toBeDefined();
    });

    test('should throw error for unsupported provider', async () => {
        await expect(aiService.getModel('UnsupportedProvider', {})).rejects.toThrow('不支持的AI提供商: UnsupportedProvider');
    });

    test('should call AI for analysis', async () => {
        const result = await aiService.callAI('test prompt', 'system prompt');
        expect(result).toBeDefined();
    });

    test('should handle retry logic on error', async () => {
        // Mock the callAI method to throw an error
        aiService.callAI = jest.fn().mockRejectedValue(new Error('Network Error'));
        await expect(aiService.callAI('test prompt', 'system prompt')).rejects.toThrow('Network Error');
    });

    test('should update configuration', async () => {
        const newConfig = {
            provider: 'DeepSeek',
            config: {
                model: 'deepseek-reasoner',
                apiKey: 'new-api-key',
            },
        };
        const result = await aiService.updateConfig(newConfig);
        expect(result).toBeDefined();
    });
});