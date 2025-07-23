/**
 * 可观测性模块入口文件
 * 集成日志、监控和错误追踪功能
 */

const { Logger, LogManager, LogLevel, LogAppender, LogFormatter } = require('./Logger');
const { Metric, MetricsRegistry, SystemMonitor, HealthChecker, MetricType } = require('./Monitor');
const { ErrorInfo, ErrorAggregator, ErrorTracker, ErrorSeverity, ErrorType } = require('./ErrorTracker');

// 统一的可观测性管理器
class ObservabilityManager {
  constructor(options = {}) {
    // 初始化日志管理
    this.logManager = new LogManager();
    if (options.logging) {
      this.logManager.configure(options.logging);
    }
    
    // 初始化系统监控
    this.systemMonitor = new SystemMonitor(options.monitoring);
    
    // 初始化错误追踪
    this.errorTracker = new ErrorTracker(options.errorTracking);
    
    // 初始化健康检查
    this.healthChecker = new HealthChecker();
    
    this.logger = this.logManager.getLogger('observability');
    
    // 设置组件间的联动
    this._setupIntegrations();
  }
  
  _setupIntegrations() {
    // 错误追踪器事件监听
    this.errorTracker.on('error-captured', (errorInfo) => {
      this.logger.error('错误被捕获', {
        errorId: errorInfo.id,
        fingerprint: errorInfo.fingerprint,
        type: errorInfo.type,
        severity: errorInfo.severity
      }, errorInfo);
    });
    
    this.errorTracker.on('alert', (alert) => {
      this.logger.fatal('错误告警触发', {
        alertType: alert.type,
        timestamp: alert.timestamp
      });
    });
    
    // 系统监控事件监听
    this.systemMonitor.on('metrics-collected', (metrics) => {
      this.logger.debug('系统指标已收集', {
        metricsCount: Object.keys(metrics).length,
        timestamp: Date.now()
      });
    });
    
    this.systemMonitor.on('error', (error) => {
      this.errorTracker.captureError(error, {
        component: 'system-monitor',
        severity: ErrorSeverity.MEDIUM
      });
    });
  }
  
  // 启动所有监控组件
  start() {
    this.logger.info('启动可观测性系统');
    
    try {
      // 启动系统监控
      this.systemMonitor.start();
      
      // 添加基本健康检查
      this._setupBasicHealthChecks();
      
      this.logger.info('可观测性系统启动成功');
      return true;
      
    } catch (error) {
      this.logger.error('可观测性系统启动失败', {}, error);
      this.errorTracker.captureError(error, {
        component: 'observability-manager',
        severity: ErrorSeverity.CRITICAL
      });
      return false;
    }
  }
  
  // 停止所有监控组件
  stop() {
    this.logger.info('停止可观测性系统');
    
    try {
      this.systemMonitor.stop();
      this.errorTracker.destroy();
      
      this.logger.info('可观测性系统已停止');
      
    } catch (error) {
      this.logger.error('停止可观测性系统时出错', {}, error);
    }
  }
  
  _setupBasicHealthChecks() {
    // 内存使用检查
    this.healthChecker.addCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (usagePercent > 90) {
        throw new Error(`内存使用率过高: ${usagePercent.toFixed(1)}%`);
      }
      
      return {
        message: `内存使用正常: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`,
        details: { heapUsedMB, heapTotalMB, usagePercent }
      };
    }, { critical: true });
    
    // 事件循环延迟检查
    this.healthChecker.addCheck('event-loop', async () => {
      return new Promise((resolve, reject) => {
        const start = process.hrtime.bigint();
        setImmediate(() => {
          const delay = Number(process.hrtime.bigint() - start) / 1e6; // 转换为毫秒
          
          if (delay > 100) {
            reject(new Error(`事件循环延迟过高: ${delay.toFixed(2)}ms`));
          } else {
            resolve({
              message: `事件循环延迟正常: ${delay.toFixed(2)}ms`,
              details: { delay }
            });
          }
        });
      });
    });
    
    // 错误率检查
    this.healthChecker.addCheck('error-rate', async () => {
      const stats = this.errorTracker.getStats();
      const errorRate = stats.counts.lastMinute;
      
      if (errorRate > 20) {
        throw new Error(`错误率过高: ${errorRate} errors/min`);
      }
      
      return {
        message: `错误率正常: ${errorRate} errors/min`,
        details: stats.counts
      };
    });
  }
  
  // 获取完整状态
  async getStatus() {
    const [healthStatus, systemMetrics, errorStats] = await Promise.all([
      this.healthChecker.runAllChecks(),
      Promise.resolve(this.systemMonitor.getMetrics()),
      Promise.resolve(this.errorTracker.getStats())
    ]);
    
    return {
      timestamp: Date.now(),
      health: healthStatus,
      metrics: systemMetrics,
      errors: errorStats,
      components: {
        logging: true,
        monitoring: this.systemMonitor.isRunning,
        errorTracking: this.errorTracker.enabled
      }
    };
  }
  
  // Express中间件工厂
  createMiddleware() {
    const self = this;
    
    return {
      // 请求日志中间件
      requestLogging: (req, res, next) => {
        self.logManager.createRequestLogger(req, res, next);
      },
      
      // 错误追踪中间件
      errorTracking: this.errorTracker.middleware(),
      
      // 指标收集中间件
      metricsCollection: (req, res, next) => {
        const start = Date.now();
        
        // 请求计数
        const requestCounter = self.systemMonitor.registry.counter(
          'http_requests_total',
          'HTTP请求总数',
          { method: req.method, route: req.route?.path || 'unknown' }
        );
        requestCounter.inc();
        
        // 响应时间记录
        res.on('finish', () => {
          const duration = Date.now() - start;
          
          const responseTime = self.systemMonitor.registry.histogram(
            'http_request_duration_ms',
            'HTTP请求响应时间'
          );
          responseTime.observe(duration);
          
          // 状态码计数
          const statusCounter = self.systemMonitor.registry.counter(
            'http_responses_total',
            'HTTP响应总数',
            { status: res.statusCode.toString() }
          );
          statusCounter.inc();
        });
        
        next();
      }
    };
  }
  
  // 获取日志器
  getLogger(category) {
    return this.logManager.getLogger(category);
  }
  
  // 捕获错误
  captureError(error, context) {
    return this.errorTracker.captureError(error, context);
  }
  
  // 获取指标（Prometheus格式）
  getMetricsPrometheus() {
    return this.systemMonitor.toPrometheusFormat();
  }
  
  // 添加自定义健康检查
  addHealthCheck(name, checkFn, options) {
    this.healthChecker.addCheck(name, checkFn, options);
  }
  
  // 添加自定义指标
  addMetric(name, type, help, labels) {
    switch (type) {
      case 'counter':
        return this.systemMonitor.registry.counter(name, help, labels);
      case 'gauge':
        return this.systemMonitor.registry.gauge(name, help, labels);
      case 'histogram':
        return this.systemMonitor.registry.histogram(name, help, labels);
      case 'summary':
        return this.systemMonitor.registry.summary(name, help, labels);
      default:
        throw new Error(`不支持的指标类型: ${type}`);
    }
  }
}

// 导出所有组件
module.exports = {
  // 管理器
  ObservabilityManager,
  
  // 日志组件
  Logger,
  LogManager,
  LogLevel,
  LogAppender,
  LogFormatter,
  
  // 监控组件
  Metric,
  MetricsRegistry,
  SystemMonitor,
  HealthChecker,
  MetricType,
  
  // 错误追踪组件
  ErrorInfo,
  ErrorAggregator,
  ErrorTracker,
  ErrorSeverity,
  ErrorType
};