/**
 * 错误追踪和分析系统
 * 提供错误收集、分类、聚合和告警功能
 */

const EventEmitter = require('events');
const crypto = require('crypto');

// 错误严重级别
const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// 错误类型
const ErrorType = {
  SYSTEM: 'system',
  APPLICATION: 'application',
  BUSINESS: 'business',
  VALIDATION: 'validation',
  NETWORK: 'network',
  DATABASE: 'database',
  EXTERNAL: 'external'
};

// 错误信息类
class ErrorInfo {
  constructor(error, context = {}) {
    this.id = crypto.randomUUID();
    this.timestamp = Date.now();
    this.message = error.message;
    this.stack = error.stack;
    this.name = error.name;
    this.code = error.code;
    this.context = context;
    
    // 自动分类错误
    this.type = this._classifyError(error);
    this.severity = this._determineSeverity(error, context);
    
    // 生成指纹用于聚合
    this.fingerprint = this._generateFingerprint(error);
    
    // 用户信息
    this.userId = context.userId;
    this.sessionId = context.sessionId;
    this.requestId = context.requestId;
    
    // 环境信息
    this.environment = process.env.NODE_ENV || 'development';
    this.hostname = require('os').hostname();
    this.pid = process.pid;
    
    // 请求信息
    if (context.request) {
      this.request = {
        method: context.request.method,
        url: context.request.url,
        userAgent: context.request.get && context.request.get('user-agent'),
        ip: context.request.ip,
        headers: this._sanitizeHeaders(context.request.headers)
      };
    }
  }
  
  _classifyError(error) {
    // 根据错误类型和消息自动分类
    if (error.name === 'ValidationError') return ErrorType.VALIDATION;
    if (error.name === 'BusinessError') return ErrorType.BUSINESS;
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') return ErrorType.NETWORK;
    if (error.message.includes('database') || error.message.includes('SQL')) return ErrorType.DATABASE;
    if (error.message.includes('ENOENT') || error.message.includes('EPERM')) return ErrorType.SYSTEM;
    if (error.message.includes('API') || error.message.includes('external')) return ErrorType.EXTERNAL;
    
    return ErrorType.APPLICATION;
  }
  
  _determineSeverity(error, context) {
    // 根据错误类型和上下文确定严重级别
    if (error.name === 'ValidationError') return ErrorSeverity.LOW;
    if (error.name === 'BusinessError') return ErrorSeverity.MEDIUM;
    if (error.code === 'ECONNREFUSED') return ErrorSeverity.HIGH;
    if (context.critical || error.message.includes('FATAL')) return ErrorSeverity.CRITICAL;
    
    // 根据HTTP状态码判断
    if (context.statusCode >= 500) return ErrorSeverity.HIGH;
    if (context.statusCode >= 400) return ErrorSeverity.MEDIUM;
    
    return ErrorSeverity.MEDIUM;
  }
  
  _generateFingerprint(error) {
    // 生成错误指纹用于聚合相似错误
    const key = `${error.name}:${error.message}:${this._getStackSignature(error.stack)}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }
  
  _getStackSignature(stack) {
    if (!stack) return '';
    
    // 取前3行堆栈作为签名，忽略行号
    const lines = stack.split('\n').slice(0, 4);
    return lines
      .map(line => line.replace(/:\d+:\d+/g, ''))  // 移除行号和列号
      .join('|');
  }
  
  _sanitizeHeaders(headers) {
    if (!headers) return {};
    
    const sensitive = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = {};
    
    for (const [key, value] of Object.entries(headers)) {
      if (sensitive.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

// 错误聚合器
class ErrorAggregator {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 1000;
    this.timeWindow = options.timeWindow || 60 * 60 * 1000; // 1小时
    this.errors = new Map();
    this.errorsByFingerprint = new Map();
    
    // 定期清理过期错误
    this.cleanupInterval = setInterval(() => {
      this._cleanup();
    }, 5 * 60 * 1000); // 5分钟清理一次
  }
  
  add(errorInfo) {
    // 添加到主错误列表
    this.errors.set(errorInfo.id, errorInfo);
    
    // 按指纹聚合
    if (!this.errorsByFingerprint.has(errorInfo.fingerprint)) {
      this.errorsByFingerprint.set(errorInfo.fingerprint, {
        fingerprint: errorInfo.fingerprint,
        count: 0,
        firstSeen: errorInfo.timestamp,
        lastSeen: errorInfo.timestamp,
        sample: errorInfo,
        occurrences: []
      });
    }
    
    const aggregated = this.errorsByFingerprint.get(errorInfo.fingerprint);
    aggregated.count++;
    aggregated.lastSeen = errorInfo.timestamp;
    aggregated.occurrences.push({
      id: errorInfo.id,
      timestamp: errorInfo.timestamp,
      context: errorInfo.context
    });
    
    // 保持最近的样本
    if (errorInfo.timestamp > aggregated.sample.timestamp) {
      aggregated.sample = errorInfo;
    }
    
    // 限制聚合条目数量
    if (this.errors.size > this.maxEntries) {
      this._evictOldest();
    }
  }
  
  getAggregatedErrors() {
    return Array.from(this.errorsByFingerprint.values())
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }
  
  getErrorById(id) {
    return this.errors.get(id);
  }
  
  getErrorsByFingerprint(fingerprint) {
    const aggregated = this.errorsByFingerprint.get(fingerprint);
    if (!aggregated) return null;
    
    return {
      ...aggregated,
      errors: aggregated.occurrences.map(occ => this.errors.get(occ.id)).filter(Boolean)
    };
  }
  
  getStats() {
    const now = Date.now();
    const recentWindow = now - this.timeWindow;
    
    let total = 0;
    let recent = 0;
    const bySeverity = {};
    const byType = {};
    
    for (const error of this.errors.values()) {
      total++;
      if (error.timestamp > recentWindow) {
        recent++;
      }
      
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      byType[error.type] = (byType[error.type] || 0) + 1;
    }
    
    return {
      total,
      recent,
      uniqueErrors: this.errorsByFingerprint.size,
      bySeverity,
      byType,
      timeWindow: this.timeWindow
    };
  }
  
  _cleanup() {
    const cutoff = Date.now() - this.timeWindow * 2; // 保留2倍时间窗口的数据
    
    for (const [id, error] of this.errors) {
      if (error.timestamp < cutoff) {
        this.errors.delete(id);
        
        // 同时清理聚合数据
        const aggregated = this.errorsByFingerprint.get(error.fingerprint);
        if (aggregated) {
          aggregated.occurrences = aggregated.occurrences.filter(occ => occ.id !== id);
          if (aggregated.occurrences.length === 0) {
            this.errorsByFingerprint.delete(error.fingerprint);
          }
        }
      }
    }
  }
  
  _evictOldest() {
    const sortedErrors = Array.from(this.errors.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const toRemove = sortedErrors.slice(0, Math.floor(this.maxEntries * 0.1));
    
    for (const error of toRemove) {
      this.errors.delete(error.id);
      
      const aggregated = this.errorsByFingerprint.get(error.fingerprint);
      if (aggregated) {
        aggregated.occurrences = aggregated.occurrences.filter(occ => occ.id !== error.id);
        if (aggregated.occurrences.length === 0) {
          this.errorsByFingerprint.delete(error.fingerprint);
        }
      }
    }
  }
  
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// 错误追踪器
class ErrorTracker extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.enabled = options.enabled !== false;
    this.captureUnhandled = options.captureUnhandled !== false;
    this.aggregator = new ErrorAggregator(options.aggregator);
    
    // 告警配置
    this.alertThresholds = {
      errorRate: options.errorRateThreshold || 10, // 每分钟错误数
      criticalErrors: options.criticalErrorThreshold || 1, // 关键错误立即告警
      ...options.alertThresholds
    };
    
    this.alertCooldown = options.alertCooldown || 5 * 60 * 1000; // 5分钟冷却
    this.lastAlert = new Map();
    
    // 错误计数器
    this.errorCounts = {
      lastMinute: 0,
      lastHour: 0,
      total: 0
    };
    
    this.resetCountersInterval = setInterval(() => {
      this.errorCounts.lastMinute = 0;
    }, 60 * 1000);
    
    if (this.captureUnhandled) {
      this._setupUnhandledErrorCapture();
    }
  }
  
  captureError(error, context = {}) {
    if (!this.enabled) return;
    
    const errorInfo = new ErrorInfo(error, context);
    this.aggregator.add(errorInfo);
    
    // 更新计数器
    this.errorCounts.lastMinute++;
    this.errorCounts.lastHour++;
    this.errorCounts.total++;
    
    // 发出事件
    this.emit('error-captured', errorInfo);
    
    // 检查告警条件
    this._checkAlerts(errorInfo);
    
    return errorInfo.id;
  }
  
  captureException(error, context = {}) {
    return this.captureError(error, { ...context, type: 'exception' });
  }
  
  captureMessage(message, level = 'error', context = {}) {
    const error = new Error(message);
    error.name = 'CapturedMessage';
    return this.captureError(error, { ...context, level, type: 'message' });
  }
  
  _setupUnhandledErrorCapture() {
    // 捕获未处理的异常
    process.on('uncaughtException', (error) => {
      this.captureError(error, { 
        type: 'uncaughtException',
        severity: ErrorSeverity.CRITICAL,
        critical: true
      });
    });
    
    // 捕获未处理的Promise拒绝
    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.captureError(error, { 
        type: 'unhandledRejection',
        severity: ErrorSeverity.HIGH
      });
    });
  }
  
  _checkAlerts(errorInfo) {
    // 关键错误立即告警
    if (errorInfo.severity === ErrorSeverity.CRITICAL) {
      this._triggerAlert('critical-error', errorInfo);
    }
    
    // 错误率告警
    if (this.errorCounts.lastMinute >= this.alertThresholds.errorRate) {
      this._triggerAlert('high-error-rate', {
        rate: this.errorCounts.lastMinute,
        threshold: this.alertThresholds.errorRate
      });
    }
  }
  
  _triggerAlert(type, data) {
    const now = Date.now();
    const lastAlert = this.lastAlert.get(type);
    
    // 检查冷却时间
    if (lastAlert && (now - lastAlert) < this.alertCooldown) {
      return;
    }
    
    this.lastAlert.set(type, now);
    this.emit('alert', { type, data, timestamp: now });
  }
  
  // Express中间件
  middleware() {
    return (error, req, res, next) => {
      if (error) {
        this.captureError(error, {
          request: req,
          statusCode: res.statusCode,
          requestId: req.requestId || req.id,
          userId: req.user?.id,
          sessionId: req.session?.id
        });
      }
      next(error);
    };
  }
  
  // 获取错误统计
  getStats() {
    return {
      counts: this.errorCounts,
      aggregated: this.aggregator.getStats(),
      alerts: {
        thresholds: this.alertThresholds,
        cooldown: this.alertCooldown,
        lastAlerts: Object.fromEntries(this.lastAlert)
      }
    };
  }
  
  // 获取聚合错误
  getAggregatedErrors(options = {}) {
    const errors = this.aggregator.getAggregatedErrors();
    
    if (options.severity) {
      return errors.filter(err => err.sample.severity === options.severity);
    }
    
    if (options.type) {
      return errors.filter(err => err.sample.type === options.type);
    }
    
    return errors;
  }
  
  // 获取错误详情
  getErrorDetails(fingerprintOrId) {
    // 尝试按指纹获取
    let result = this.aggregator.getErrorsByFingerprint(fingerprintOrId);
    if (result) return result;
    
    // 尝试按ID获取单个错误
    const error = this.aggregator.getErrorById(fingerprintOrId);
    if (error) {
      return {
        fingerprint: error.fingerprint,
        count: 1,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        sample: error,
        errors: [error]
      };
    }
    
    return null;
  }
  
  destroy() {
    this.aggregator.destroy();
    
    if (this.resetCountersInterval) {
      clearInterval(this.resetCountersInterval);
    }
    
    // 移除进程监听器
    if (this.captureUnhandled) {
      process.removeAllListeners('uncaughtException');
      process.removeAllListeners('unhandledRejection');
    }
  }
}

module.exports = {
  ErrorInfo,
  ErrorAggregator,
  ErrorTracker,
  ErrorSeverity,
  ErrorType
};