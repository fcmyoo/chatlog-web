import ConfigManager from '@/config/ConfigManager';
import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

jest.mock('fs');
jest.mock('@/packages/config/index.js', () => ({
    getGlobalConfig: jest.fn(() => ({
        get: jest.fn((key, defaultValue) => {
            if (key === 'services.chatlog.baseURL') return 'http://127.0.0.1:5030';
            if (key === 'services.chatlog.timeout') return defaultValue || 10000;
            return defaultValue;
        })
    }))
}));

describe('ConfigManager', () => {
    let configManager;
    const mockConfigDir = '/test/config';
    const mockModelSettingsPath = path.join(mockConfigDir, 'model-settings.json');
    const mockAISettingsPath = path.join(mockConfigDir, 'ai-settings.json');

    beforeEach(() => {
        configManager = new ConfigManager();
        jest.clearAllMocks();
        
        // Mock fs.existsSync
        fs.existsSync.mockReturnValue(true);
        fs.mkdirSync.mockImplementation(() => {});
    });

    describe('getModelConfig', () => {
        test('should return model config from file', async () => {
            const mockConfig = {
                modelProvider: 'DeepSeek',
                deepseek: {
                    model: 'deepseek-reasoner',
                    apiKey: 'test-api-key',
                    baseURL: 'https://api.deepseek.com/v1'
                }
            };

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const result = await configManager.getModelConfig();

            expect(result).toEqual({
                provider: 'DeepSeek',
                config: mockConfig.deepseek
            });
        });

        test('should return default config when file does not exist', async () => {
            fs.existsSync.mockReturnValue(false);
            process.env.DEEPSEEK_API_KEY = 'env-api-key';

            const result = await configManager.getModelConfig();

            expect(result).toEqual({
                provider: 'DeepSeek',
                config: {
                    model: 'deepseek-reasoner',
                    apiKey: 'env-api-key',
                    baseURL: 'https://api.deepseek.com/v1'
                }
            });
        });

        test('should handle file read errors gracefully', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockImplementation(() => {
                throw new Error('File read error');
            });

            const result = await configManager.getModelConfig();

            expect(result.provider).toBe('DeepSeek');
            expect(result.config).toHaveProperty('model');
        });
    });

    describe('saveModelConfig', () => {
        test('should save model config successfully', async () => {
            const config = {
                provider: 'DeepSeek',
                config: {
                    model: 'deepseek-reasoner',
                    apiKey: 'new-api-key'
                }
            };

            fs.writeFileSync.mockImplementation(() => {});

            const result = await configManager.saveModelConfig(config);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                mockModelSettingsPath,
                expect.stringContaining('DeepSeek'),
                undefined
            );
            expect(result).toHaveProperty('modelProvider', 'DeepSeek');
            expect(result).toHaveProperty('updatedAt');
        });

        test('should handle save errors', async () => {
            const config = {
                provider: 'DeepSeek',
                config: { model: 'test' }
            };

            fs.writeFileSync.mockImplementation(() => {
                throw new Error('Write error');
            });

            await expect(configManager.saveModelConfig(config))
                .rejects.toThrow('配置保存失败');
        });
    });

    describe('getAISettings', () => {
        test('should return AI settings from file', async () => {
            const mockSettings = {
                systemPrompt: 'Test system prompt',
                maxTokens: 4000,
                temperature: 0.7
            };

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify(mockSettings));

            const result = await configManager.getAISettings();

            expect(result).toEqual(mockSettings);
        });

        test('should create default settings when file does not exist', async () => {
            fs.existsSync.mockReturnValue(false);
            fs.writeFileSync.mockImplementation(() => {});

            const result = await configManager.getAISettings();

            expect(result).toHaveProperty('systemPrompt');
            expect(result).toHaveProperty('maxTokens', 64000);
            expect(result).toHaveProperty('temperature', 1.0);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });
    });

    describe('saveAISettings', () => {
        test('should save AI settings successfully', async () => {
            const settings = {
                systemPrompt: 'New system prompt',
                maxTokens: 8000
            };

            fs.writeFileSync.mockImplementation(() => {});

            const result = await configManager.saveAISettings(settings);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                mockAISettingsPath,
                expect.stringContaining('New system prompt'),
                undefined
            );
            expect(result).toHaveProperty('updatedAt');
        });
    });

    describe('getScheduleConfig', () => {
        test('should return schedule config from environment', async () => {
            process.env.ENABLE_SCHEDULED_ANALYSIS = 'true';
            process.env.SCHEDULED_ANALYSIS_TIME = '0 0 8 * * *';
            process.env.MAX_CONCURRENT_ANALYSIS = '3';

            const result = await configManager.getScheduleConfig();

            expect(result).toEqual({
                enabled: true,
                cronTime: '0 0 8 * * *',
                maxConcurrent: 3,
                retryAttempts: 3,
                retryDelay: 1000
            });
        });

        test('should return default values when env vars not set', async () => {
            delete process.env.ENABLE_SCHEDULED_ANALYSIS;
            delete process.env.SCHEDULED_ANALYSIS_TIME;
            delete process.env.MAX_CONCURRENT_ANALYSIS;

            const result = await configManager.getScheduleConfig();

            expect(result).toEqual({
                enabled: false,
                cronTime: '0 0 8 * * *',
                maxConcurrent: 2,
                retryAttempts: 3,
                retryDelay: 1000
            });
        });
    });

    describe('getChatlogConfig', () => {
        test('should return chatlog config from global config', () => {
            const result = configManager.getChatlogConfig();

            expect(result).toEqual({
                baseURL: 'http://127.0.0.1:5030',
                timeout: 10000
            });
        });
    });

    describe('validateConfig', () => {
        test('should validate config successfully', async () => {
            const mockConfig = {
                modelProvider: 'DeepSeek',
                deepseek: {
                    apiKey: 'valid-api-key'
                }
            };

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        test('should detect missing API key', async () => {
            const mockConfig = {
                modelProvider: 'DeepSeek',
                deepseek: {
                    apiKey: ''
                }
            };

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(false);
            expect(result.issues).toContain('缺少DeepSeek API密钥');
        });
    });

    describe('getDefaultModelConfig', () => {
        test('should return default model config', () => {
            process.env.DEEPSEEK_API_KEY = 'default-key';

            const result = configManager.getDefaultModelConfig();

            expect(result).toEqual({
                provider: 'DeepSeek',
                config: {
                    model: 'deepseek-reasoner',
                    apiKey: 'default-key',
                    baseURL: 'https://api.deepseek.com/v1'
                }
            });
        });
    });
});