export default {
  // 测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '**/tests/**/*.test.{js,ts}',
    '**/tests/**/*.spec.{js,ts}',
    '**/__tests__/**/*.{js,ts}'
  ],
  
  // 覆盖率配置
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'clover'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    'services/**/*.{js,ts}',
    'routes/**/*.{js,ts}',
    'middleware/**/*.{js,ts}',
    'config/**/*.{js,ts}',
    'adapters/**/*.{js,ts}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/examples/**',
    '!jest.config.js',
    '!app.js'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/src/(.*)$': '<rootDir>/src/$1',
    '^@/services/(.*)$': '<rootDir>/services/$1',
    '^@/routes/(.*)$': '<rootDir>/routes/$1',
    '^@/middleware/(.*)$': '<rootDir>/middleware/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
    '^@/adapters/(.*)$': '<rootDir>/adapters/$1',
    '^@/tests/(.*)$': '<rootDir>/tests/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/packages/(.*)$': '<rootDir>/../../packages/$1'
  },
  
  // 测试超时时间
  testTimeout: 15000,
  
  // 详细输出
  verbose: true,
  
  // 清除模拟
  clearMocks: true,
  
  // 强制退出
  forceExit: true,
  
  // 并行测试
  maxWorkers: '50%',
  
  // 测试结果处理器
  testResultsProcessor: '<rootDir>/tests/utils/testResultsProcessor.js',
  
  // 转换配置
  transform: {
      '^.+\\.[tj]sx?$': 'babel-jest',
      '^.+\\.mjs$': 'babel-jest'
    },
  
  // 模块文件扩展名
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // 忽略转换的模块
  transformIgnorePatterns: [
      'node_modules/(?!(.*\\.mjs$|@babel/runtime))'
  ]
};