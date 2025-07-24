import { testDataGenerator } from './testHelpers';

class TestDataFactory {
  static createChatData(overrides = {}) {
    return testDataGenerator.createChatData(overrides);
  }

  static createAnalysisResult(overrides = {}) {
    return testDataGenerator.createAnalysisResult(overrides);
  }

  // 其他生成器可以在这里添加
}

export default TestDataFactory;