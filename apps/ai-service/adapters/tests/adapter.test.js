import { initializeAdapterSystem, createQuickAdapter } from '../index.js';
import { Message, ChatOptions } from '../interfaces/AIModelAdapter.js';

describe('适配器测试', () => {
  beforeAll(async () => {
    await initializeAdapterSystem();
  });

  test('OpenAI适配器测试', async () => {
    const openaiAdapter = await createQuickAdapter('OpenAI', 'gpt-3.5-turbo', process.env.OPENAI_API_KEY);
    
    const messages = [new Message('user', '你好，今天的天气怎么样？')];
    const response = await openaiAdapter.chat(messages, new ChatOptions({ maxTokens: 50 }));
    
    expect(response).toHaveProperty('content');
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
  });

  test('DeepSeek适配器测试', async () => {
    const deepseekAdapter = await createQuickAdapter('DeepSeek', 'deepseek-reasoner', process.env.DEEPSEEK_API_KEY);
    
    const messages = [new Message('user', '请解释一下量子力学。')];
    const response = await deepseekAdapter.chat(messages, new ChatOptions({ maxTokens: 50 }));
    
    expect(response).toHaveProperty('content');
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
  });

  test('Google适配器测试', async () => {
    const googleAdapter = await createQuickAdapter('Google', 'gemini-2.5-pro', process.env.GEMINI_API_KEY);
    
    const messages = [new Message('user', '什么是人工智能？')];
    const response = await googleAdapter.chat(messages, new ChatOptions({ maxTokens: 50 }));
    
    expect(response).toHaveProperty('content');
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
  });

  test('阿里适配器测试', async () => {
    const alibabaAdapter = await createQuickAdapter('Alibaba', 'tongyi-qianwen', process.env.ALIBABA_API_KEY);
    
    const messages = [new Message('user', '请给我推荐一本书。')];
    const response = await alibabaAdapter.chat(messages, new ChatOptions({ maxTokens: 50 }));
    
    expect(response).toHaveProperty('content');
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
  });

  test('腾讯适配器测试', async () => {
    const tencentAdapter = await createQuickAdapter('Tencent', 'hunyuan-pro', process.env.TENCENT_API_KEY);
    
    const messages = [new Message('user', '请告诉我关于中国的历史。')];
    const response = await tencentAdapter.chat(messages, new ChatOptions({ maxTokens: 50 }));
    
    expect(response).toHaveProperty('content');
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
  });
});