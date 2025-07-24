const { OpenAIAdapter } = require('./implementations/OpenAIAdapter');
const { DeepSeekAdapter } = require('./implementations/DeepSeekAdapter');
const { GoogleAdapter } = require('./implementations/GoogleAdapter');

class AdapterFactory {
  static createAdapter(provider, config) {
    switch (provider) {
      case 'OpenAI':
        return new OpenAIAdapter(config);
      case 'DeepSeek':
        return new DeepSeekAdapter(config);
      case 'Google':
        return new GoogleAdapter(config);
      // 其他适配器...
      default:
        throw new Error(`不支持的AI提供商: ${provider}`);
    }
  }
}

module.exports = AdapterFactory;