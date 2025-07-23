/**
 * 统一日志系统
 * 提供结构化日志记录、多级别支持和上下文追踪
 */

const fs = require('fs');
const path = require('path');

// 日志级别
const LogLevel = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5
};

const LogLevelNames = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL'
};

// 日志格式化器
class LogFormatter {
  static formatConsole(logEntry) {
    const timestamp = new Date(logEntry.timestamp).toISOString();
    const level = LogLevelNames[logEntry.level].padEnd(5);
    const category = logEntry.category.padEnd(15);
    
    let output = `${timestamp} [${level}] ${category} ${logEntry.message}`;
    
    // 添加上下文信息
    if (logEntry.context && Object.keys(logEntry.context).length > 0) {
      output += ` | Context: ${JSON.stringify(logEntry.context)}`;
    }
    
    // 添加错误堆栈
    if (logEntry.error) {
      output += `\n  Error: ${logEntry.error.message}`;
      if (logEntry.error.stack) {
        output += `\n  Stack: ${logEntry.error.stack}`;
      }
    }
    
    return output;
  }
  
  static formatJSON(logEntry) {
    return JSON.stringify({
      ...logEntry,
      timestamp: new Date(logEntry.timestamp).toISOString(),
      level: LogLevelNames[logEntry.level]
    });
  }
}

// 日志输出器
class LogAppender {
  constructor(type, options = {}) {
    this.type = type;
    this.options = options;
    this.minLevel = options.minLevel || LogLevel.INFO;
  }
  
  shouldLog(level) {
    return level >= this.minLevel;
  }
  
  append(logEntry) {
    if (!this.shouldLog(logEntry.level)) {
      return;
    }
    
    switch (this.type) {
      case 'console':
        this._appendConsole(logEntry);
        break;
      case 'file':
        this._appendFile(logEntry);
        break;
      case 'rotating-file':
        this._appendRotatingFile(logEntry);
        break;
    }
  }
  
  _appendConsole(logEntry) {
    const output = LogFormatter.formatConsole(logEntry);
    
    if (logEntry.level >= LogLevel.ERROR) {
      console.error(output);
    } else if (logEntry.level >= LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
  
  _appendFile(logEntry) {
    const output = LogFormatter.formatJSON(logEntry) + '\n';
    const filePath = this.options.filePath || './logs/app.log';
    
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.appendFileSync(filePath, output, 'utf8');
  }
  
  _appendRotatingFile(logEntry) {
    const output = LogFormatter.formatJSON(logEntry) + '\n';
    const basePath = this.options.basePath || './logs/app';
    const maxSize = this.options.maxSize || 10 * 1024 * 1024; // 10MB
    const maxFiles = this.options.maxFiles || 5;
    
    const currentFile = `${basePath}.log`;
    
    // 检查文件大小并轮转
    if (fs.existsSync(currentFile)) {
      const stats = fs.statSync(currentFile);
      if (stats.size >= maxSize) {
        this._rotateFiles(basePath, maxFiles);
      }
    }
    
    // 确保目录存在
    const dir = path.dirname(currentFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.appendFileSync(currentFile, output, 'utf8');
  }
  
  _rotateFiles(basePath, maxFiles) {
    // 删除最老的文件
    const oldestFile = `${basePath}.${maxFiles}.log`;
    if (fs.existsSync(oldestFile)) {
      fs.unlinkSync(oldestFile);
    }
    
    // 轮转文件
    for (let i = maxFiles - 1; i >= 1; i--) {
      const oldFile = `${basePath}.${i}.log`;
      const newFile = `${basePath}.${i + 1}.log`;
      
      if (fs.existsSync(oldFile)) {
        fs.renameSync(oldFile, newFile);
      }
    }
    
    // 将当前文件重命名为 .1.log
    const currentFile = `${basePath}.log`;
    const firstRotated = `${basePath}.1.log`;
    if (fs.existsSync(currentFile)) {
      fs.renameSync(currentFile, firstRotated);
    }
  }
}

// 主日志类
class Logger {
  constructor(category = 'default', options = {}) {
    this.category = category;
    this.appenders = [];
    this.context = {};
    this.requestId = null;
    
    // 默认添加控制台输出器
    if (options.console !== false) {
      this.addAppender(new LogAppender('console', {
        minLevel: options.consoleLevel || LogLevel.INFO
      }));
    }
    
    // 添加文件输出器
    if (options.file) {
      this.addAppender(new LogAppender('rotating-file', {
        basePath: options.file.path || './logs/app',
        maxSize: options.file.maxSize || 10 * 1024 * 1024,
        maxFiles: options.file.maxFiles || 5,
        minLevel: options.file.level || LogLevel.INFO
      }));
    }
  }
  
  addAppender(appender) {
    this.appenders.push(appender);
  }
  
  setContext(context) {
    this.context = { ...this.context, ...context };
    return this;
  }
  
  setRequestId(requestId) {
    this.requestId = requestId;
    return this;
  }
  
  clearContext() {
    this.context = {};
    this.requestId = null;
    return this;
  }
  
  createChild(category, context = {}) {
    const child = new Logger(`${this.category}.${category}`);
    child.appenders = this.appenders;
    child.context = { ...this.context, ...context };
    child.requestId = this.requestId;
    return child;
  }
  
  _log(level, message, context = {}, error = null) {
    const logEntry = {
      timestamp: Date.now(),
      level,
      category: this.category,
      message,
      context: { 
        ...this.context, 
        ...context,
        ...(this.requestId && { requestId: this.requestId })
      },
      error,
      pid: process.pid,
      hostname: require('os').hostname()
    };
    
    this.appenders.forEach(appender => {
      try {
        appender.append(logEntry);
      } catch (err) {
        console.error('日志输出器错误:', err);
      }
    });
  }
  
  trace(message, context = {}) {
    this._log(LogLevel.TRACE, message, context);
  }
  
  debug(message, context = {}) {
    this._log(LogLevel.DEBUG, message, context);
  }
  
  info(message, context = {}) {
    this._log(LogLevel.INFO, message, context);
  }
  
  warn(message, context = {}) {
    this._log(LogLevel.WARN, message, context);
  }
  
  error(message, context = {}, error = null) {
    this._log(LogLevel.ERROR, message, context, error);
  }
  
  fatal(message, context = {}, error = null) {
    this._log(LogLevel.FATAL, message, context, error);
  }
  
  // 性能日志
  time(label) {
    const start = Date.now();
    return {
      end: (context = {}) => {
        const duration = Date.now() - start;
        this.info(`性能计时: ${label}`, { 
          ...context, 
          duration: `${duration}ms`,
          performance: true
        });
        return duration;
      }
    };
  }
  
  // 请求日志
  request(req, res, next) {
    const requestId = require('crypto').randomUUID();
    const startTime = Date.now();
    
    this.setRequestId(requestId);
    
    this.info('请求开始', {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
    
    // 监听响应结束
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
      
      this._log(level, '请求结束', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: res.get('content-length') || 0
      });
    });
    
    if (next) next();
  }
}

// 日志管理器
class LogManager {
  constructor() {
    this.loggers = new Map();
    this.defaultConfig = {
      console: true,
      consoleLevel: LogLevel.INFO,
      file: {
        path: './logs/app',
        level: LogLevel.INFO,
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5
      }
    };
  }
  
  configure(config) {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    // 清除现有日志器，让它们重新创建
    this.loggers.clear();
  }
  
  getLogger(category = 'default') {
    if (!this.loggers.has(category)) {
      const logger = new Logger(category, this.defaultConfig);
      this.loggers.set(category, logger);
    }
    return this.loggers.get(category);
  }
  
  createRequestLogger(req, res, next) {
    const logger = this.getLogger('request');
    logger.request(req, res, next);
    
    // 将日志器添加到请求对象
    req.logger = logger;
  }
}

// 导出
module.exports = {
  Logger,
  LogManager,
  LogLevel,
  LogAppender,
  LogFormatter
};