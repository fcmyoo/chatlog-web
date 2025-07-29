/**
 * 外部依赖Mock系统
 * 用于模拟外部API调用和服务依赖
 */

const { jest } = require('@jest/globals');

/**
 * Mock Axios HTTP客户端
 */
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => mockAxios),
  defaults: {
    headers: {
      common: {}
    }
  },
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  }
};

/**
 * Mock LangChain模型
 */
const mockChatOpenAI = jest.fn().mockImplementation(() => ({
  invoke: jest.fn().mockResolvedValue({
    content: 'Mock AI response'
  }),
  stream: jest.fn(),
  batch: jest.fn()
}));

const mockGoogleGenerativeAI = jest.fn().mockImplementation(() => ({
  invoke: jest.fn().mockResolvedValue({
    content: 'Mock Google AI response'
  }),
  stream: jest.fn(),
  batch: jest.fn()
}));

/**
 * Mock Node-cron
 */
const mockCron = {
  schedule: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
    scheduled: true
  }),
  validate: jest.fn().mockReturnValue(true),
  getTasks: jest.fn().mockReturnValue(new Map())
};

/**
 * Mock File System
 */
const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn(),
  unlink: jest.fn(),
  rmdir: jest.fn()
};

/**
 * Mock fs-extra
 */
const mockFsExtra = {
  ...mockFs,
  ensureDir: jest.fn().mockResolvedValue(),
  readJSON: jest.fn().mockResolvedValue({}),
  writeJSON: jest.fn().mockResolvedValue(),
  pathExists: jest.fn().mockResolvedValue(true),
  remove: jest.fn().mockResolvedValue(),
  copy: jest.fn().mockResolvedValue(),
  move: jest.fn().mockResolvedValue()
};

/**
 * Mock UUID
 */
const mockUuid = {
  v4: jest.fn().mockReturnValue('mock-uuid-1234-5678-9012')
};

/**
 * Mock Path
 */
const mockPath = {
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => '/' + args.join('/')),
  dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path) => path.split('/').pop()),
  extname: jest.fn((path) => {
    const parts = path.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  })
};

/**
 * Mock Process Environment
 */
const mockProcess = {
  env: {
    NODE_ENV: 'test',
    DEEPSEEK_API_KEY: 'test-deepseek-key',
    GEMINI_API_KEY: 'test-gemini-key',
    CHATLOG_HOST: 'localhost',
    CHATLOG_PORT: '5030'
  },
  exit: jest.fn(),
  on: jest.fn(),
  cwd: jest.fn().mockReturnValue('/test/directory')
};

/**
 * Mock Console (用于测试日志输出)
 */
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

/**
 * 创建Mock响应对象
 */
function createMockResponse(data, status = 200, headers = {}) {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    config: {},
    request: {}
  };
}

/**
 * 创建Mock错误对象
 */
function createMockError(message, code, status) {
  const error = new Error(message);
  error.code = code;
  if (status) {
    error.response = {
      status,
      data: { message },
      headers: {}
    };
  }
  return error;
}

/**
 * 重置所有Mock
 */
function resetAllMocks() {
  jest.clearAllMocks();
  
  // 重置Axios mocks
  Object.values(mockAxios).forEach(mock => {
    if (typeof mock === 'function' && mock.mockReset) {
      mock.mockReset();
    }
  });
  
  // 重置其他mocks
  mockChatOpenAI.mockReset();
  mockGoogleGenerativeAI.mockReset();
  Object.values(mockCron).forEach(mock => {
    if (typeof mock === 'function' && mock.mockReset) {
      mock.mockReset();
    }
  });
  
  Object.values(mockFs).forEach(mock => {
    if (typeof mock === 'function' && mock.mockReset) {
      mock.mockReset();
    }
  });
  
  Object.values(mockConsole).forEach(mock => {
    if (typeof mock === 'function' && mock.mockReset) {
      mock.mockReset();
    }
  });
}

/**
 * 设置常用的Mock场景
 */
const mockScenarios = {
  // 成功的API调用
  successfulApiCall: () => {
    mockAxios.get.mockResolvedValue(createMockResponse({ success: true }));
    mockAxios.post.mockResolvedValue(createMockResponse({ success: true }));
  },
  
  // 失败的API调用
  failedApiCall: () => {
    mockAxios.get.mockRejectedValue(createMockError('Network Error', 'ECONNREFUSED'));
    mockAxios.post.mockRejectedValue(createMockError('Network Error', 'ECONNREFUSED'));
  },
  
  // 成功的AI模型调用
  successfulAiCall: () => {
    mockChatOpenAI.mockImplementation(() => ({
      invoke: jest.fn().mockResolvedValue({
        content: 'Successful AI analysis result'
      })
    }));
  },
  
  // 失败的AI模型调用
  failedAiCall: () => {
    mockChatOpenAI.mockImplementation(() => ({
      invoke: jest.fn().mockRejectedValue(new Error('AI model error'))
    }));
  },
  
  // 成功的文件操作
  successfulFileOps: () => {
    mockFsExtra.readJSON.mockResolvedValue({ test: 'data' });
    mockFsExtra.writeJSON.mockResolvedValue();
    mockFsExtra.pathExists.mockResolvedValue(true);
  },
  
  // 失败的文件操作
  failedFileOps: () => {
    mockFsExtra.readJSON.mockRejectedValue(new Error('File not found'));
    mockFsExtra.writeJSON.mockRejectedValue(new Error('Permission denied'));
    mockFsExtra.pathExists.mockResolvedValue(false);
  }
};

module.exports = {
  // Mock对象
  mockAxios,
  mockChatOpenAI,
  mockGoogleGenerativeAI,
  mockCron,
  mockFs,
  mockFsExtra,
  mockUuid,
  mockPath,
  mockProcess,
  mockConsole,
  
  // 工具函数
  createMockResponse,
  createMockError,
  resetAllMocks,
  mockScenarios,
  
  // 便捷的设置函数
  setupMocks: () => {
    // 设置默认的成功场景
    mockScenarios.successfulApiCall();
    mockScenarios.successfulAiCall();
    mockScenarios.successfulFileOps();
  },
  
  // 清理函数
  cleanup: () => {
    resetAllMocks();
  }
};