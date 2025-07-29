// 简化的配置模拟，用于测试
export const getGlobalConfig = () => ({
  get: (key, defaultValue) => {
    if (key === 'services.chatlog.baseURL') return 'http://127.0.0.1:5030';
    if (key === 'services.chatlog.timeout') return defaultValue || 10000;
    return defaultValue;
  }
});

export default { getGlobalConfig };