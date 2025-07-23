/**
 * 系统监控模块
 * 提供性能监控、健康检查和系统指标收集
 */

const EventEmitter = require('events');
const os = require('os');

// 监控指标类型
const MetricType = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary'
};

// 单个指标
class Metric {
  constructor(name, type, help = '', labels = {}) {
    this.name = name;
    this.type = type;
    this.help = help;
    this.labels = labels;
    this.value = type === MetricType.COUNTER ? 0 : null;
    this.samples = [];
    this.lastUpdate = Date.now();
  }
  
  // 计数器增加
  inc(value = 1, labels = {}) {
    if (this.type !== MetricType.COUNTER) {
      throw new Error('inc() only available for counter metrics');
    }
    this.value += value;
    this.lastUpdate = Date.now();
    this._recordSample({ value: this.value, labels, timestamp: this.lastUpdate });
  }
  
  // 设置仪表值
  set(value, labels = {}) {
    if (this.type !== MetricType.GAUGE) {
      throw new Error('set() only available for gauge metrics');
    }
    this.value = value;
    this.lastUpdate = Date.now();
    this._recordSample({ value, labels, timestamp: this.lastUpdate });
  }
  
  // 观察值（用于直方图和摘要）
  observe(value, labels = {}) {
    if (this.type !== MetricType.HISTOGRAM && this.type !== MetricType.SUMMARY) {
      throw new Error('observe() only available for histogram/summary metrics');
    }
    
    const timestamp = Date.now();
    this._recordSample({ value, labels, timestamp });
    
    // 保持最近1000个样本
    if (this.samples.length > 1000) {
      this.samples = this.samples.slice(-1000);
    }
  }
  
  _recordSample(sample) {
    this.samples.push(sample);
  }
  
  // 获取当前值
  getValue() {
    switch (this.type) {
      case MetricType.COUNTER:
      case MetricType.GAUGE:
        return this.value;
      case MetricType.HISTOGRAM:
      case MetricType.SUMMARY:
        return this._calculateSummaryStats();
      default:
        return null;
    }
  }
  
  _calculateSummaryStats() {
    if (this.samples.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }
    
    const values = this.samples.map(s => s.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    const avg = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // 计算百分位数
    const sorted = [...values].sort((a, b) => a - b);
    const p50 = this._percentile(sorted, 0.5);
    const p95 = this._percentile(sorted, 0.95);
    const p99 = this._percentile(sorted, 0.99);
    
    return { count, sum, avg, min, max, p50, p95, p99 };
  }
  
  _percentile(sortedArray, p) {
    const index = (sortedArray.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    if (upper >= sortedArray.length) return sortedArray[lower];
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }
}

// 监控注册表
class MetricsRegistry {
  constructor() {
    this.metrics = new Map();
    this.defaultLabels = {};
  }
  
  setDefaultLabels(labels) {
    this.defaultLabels = { ...this.defaultLabels, ...labels };
  }
  
  register(metric) {
    this.metrics.set(metric.name, metric);
    return metric;
  }
  
  counter(name, help = '', labels = {}) {
    if (this.metrics.has(name)) {
      return this.metrics.get(name);
    }
    
    const metric = new Metric(name, MetricType.COUNTER, help, {
      ...this.defaultLabels,
      ...labels
    });
    
    return this.register(metric);
  }
  
  gauge(name, help = '', labels = {}) {
    if (this.metrics.has(name)) {
      return this.metrics.get(name);
    }
    
    const metric = new Metric(name, MetricType.GAUGE, help, {
      ...this.defaultLabels,
      ...labels
    });
    
    return this.register(metric);
  }
  
  histogram(name, help = '', labels = {}) {
    if (this.metrics.has(name)) {
      return this.metrics.get(name);
    }
    
    const metric = new Metric(name, MetricType.HISTOGRAM, help, {
      ...this.defaultLabels,
      ...labels
    });
    
    return this.register(metric);
  }
  
  summary(name, help = '', labels = {}) {
    if (this.metrics.has(name)) {
      return this.metrics.get(name);
    }
    
    const metric = new Metric(name, MetricType.SUMMARY, help, {
      ...this.defaultLabels,
      ...labels
    });
    
    return this.register(metric);
  }
  
  getAllMetrics() {
    const result = {};
    for (const [name, metric] of this.metrics) {
      result[name] = {
        name: metric.name,
        type: metric.type,
        help: metric.help,
        labels: metric.labels,
        value: metric.getValue(),
        lastUpdate: metric.lastUpdate
      };
    }
    return result;
  }
  
  getMetric(name) {
    return this.metrics.get(name);
  }
  
  clear() {
    this.metrics.clear();
  }
}

// 系统监控器
class SystemMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.registry = new MetricsRegistry();
    this.interval = options.interval || 10000; // 10秒
    this.monitoringTimer = null;
    this.isRunning = false;
    
    // 初始化系统指标
    this._initSystemMetrics();
  }
  
  _initSystemMetrics() {
    // CPU指标
    this.cpuUsage = this.registry.gauge('system_cpu_usage_percent', 'CPU使用率');
    this.loadAverage = this.registry.gauge('system_load_average', '系统负载');
    
    // 内存指标
    this.memoryUsage = this.registry.gauge('system_memory_usage_bytes', '内存使用量');
    this.memoryUsagePercent = this.registry.gauge('system_memory_usage_percent', '内存使用率');
    
    // Node.js进程指标
    this.heapUsed = this.registry.gauge('nodejs_heap_used_bytes', 'Node.js堆内存使用量');
    this.heapTotal = this.registry.gauge('nodejs_heap_total_bytes', 'Node.js堆内存总量');
    this.external = this.registry.gauge('nodejs_external_memory_bytes', 'Node.js外部内存');
    this.rss = this.registry.gauge('nodejs_rss_bytes', 'Node.js常驻内存');
    
    // 事件循环指标
    this.eventLoopDelay = this.registry.histogram('nodejs_eventloop_delay_seconds', '事件循环延迟');
    
    // 网络连接指标
    this.activeHandles = this.registry.gauge('nodejs_active_handles', 'Node.js活跃句柄数');
    this.activeRequests = this.registry.gauge('nodejs_active_requests', 'Node.js活跃请求数');
  }
  
  start() {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this._collectMetrics();
    
    this.monitoringTimer = setInterval(() => {
      this._collectMetrics();
    }, this.interval);
    
    this.emit('started');
  }
  
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    this.emit('stopped');
  }
  
  _collectMetrics() {
    try {
      // CPU指标
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      
      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      }
      
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - ~~(100 * idle / total);
      
      this.cpuUsage.set(usage);
      
      // 系统负载
      const loadAvg = os.loadavg();
      this.loadAverage.set(loadAvg[0]); // 1分钟负载
      
      // 内存指标
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsagePercent = (usedMem / totalMem) * 100;
      
      this.memoryUsage.set(usedMem);
      this.memoryUsagePercent.set(memUsagePercent);
      
      // Node.js进程内存
      const memUsage = process.memoryUsage();
      this.heapUsed.set(memUsage.heapUsed);
      this.heapTotal.set(memUsage.heapTotal);
      this.external.set(memUsage.external);
      this.rss.set(memUsage.rss);
      
      // 事件循环延迟（简化版本）
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delay = Number(process.hrtime.bigint() - start) / 1e9;
        this.eventLoopDelay.observe(delay);
      });
      
      // Node.js句柄和请求
      this.activeHandles.set(process._getActiveHandles().length);
      this.activeRequests.set(process._getActiveRequests().length);
      
      this.emit('metrics-collected', this.registry.getAllMetrics());
      
    } catch (error) {
      this.emit('error', error);
    }
  }
  
  getMetrics() {
    return this.registry.getAllMetrics();
  }
  
  // Prometheus格式输出
  toPrometheusFormat() {
    const lines = [];
    const metrics = this.registry.getAllMetrics();
    
    for (const [name, metric] of Object.entries(metrics)) {
      // 添加帮助信息
      if (metric.help) {
        lines.push(`# HELP ${name} ${metric.help}`);
      }
      
      // 添加类型信息
      lines.push(`# TYPE ${name} ${metric.type}`);
      
      // 添加指标值
      if (metric.type === MetricType.HISTOGRAM || metric.type === MetricType.SUMMARY) {
        const stats = metric.value;
        lines.push(`${name}_count ${stats.count}`);
        lines.push(`${name}_sum ${stats.sum}`);
        lines.push(`${name}_avg ${stats.avg}`);
        lines.push(`${name}_min ${stats.min}`);
        lines.push(`${name}_max ${stats.max}`);
        if (stats.p50 !== undefined) {
          lines.push(`${name}{quantile="0.5"} ${stats.p50}`);
          lines.push(`${name}{quantile="0.95"} ${stats.p95}`);
          lines.push(`${name}{quantile="0.99"} ${stats.p99}`);
        }
      } else {
        const labelsStr = Object.entries(metric.labels).length > 0 
          ? `{${Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` 
          : '';
        lines.push(`${name}${labelsStr} ${metric.value || 0}`);
      }
    }
    
    return lines.join('\n');
  }
}

// 健康检查器
class HealthChecker {
  constructor() {
    this.checks = new Map();
  }
  
  addCheck(name, checkFn, options = {}) {
    this.checks.set(name, {
      name,
      checkFn,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      interval: options.interval || 30000,
      lastCheck: null,
      lastResult: null
    });
  }
  
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`健康检查 '${name}' 不存在`);
    }
    
    const startTime = Date.now();
    
    try {
      const result = await Promise.race([
        check.checkFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('检查超时')), check.timeout)
        )
      ]);
      
      const duration = Date.now() - startTime;
      const checkResult = {
        name,
        status: 'healthy',
        message: result?.message || '检查通过',
        duration,
        timestamp: Date.now(),
        details: result?.details || {}
      };
      
      check.lastCheck = Date.now();
      check.lastResult = checkResult;
      
      return checkResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const checkResult = {
        name,
        status: 'unhealthy',
        message: error.message,
        duration,
        timestamp: Date.now(),
        error: error.stack
      };
      
      check.lastCheck = Date.now();
      check.lastResult = checkResult;
      
      return checkResult;
    }
  }
  
  async runAllChecks() {
    const results = {};
    const promises = [];
    
    for (const [name] of this.checks) {
      promises.push(
        this.runCheck(name).then(result => {
          results[name] = result;
        })
      );
    }
    
    await Promise.all(promises);
    
    const overallStatus = Object.values(results).every(r => r.status === 'healthy')
      ? 'healthy'
      : 'unhealthy';
    
    return {
      status: overallStatus,
      timestamp: Date.now(),
      checks: results
    };
  }
  
  getStatus() {
    const results = {};
    let overallStatus = 'healthy';
    
    for (const [name, check] of this.checks) {
      if (check.lastResult) {
        results[name] = check.lastResult;
        if (check.lastResult.status === 'unhealthy' && check.critical) {
          overallStatus = 'unhealthy';
        }
      } else {
        results[name] = {
          name,
          status: 'unknown',
          message: '尚未检查',
          timestamp: Date.now()
        };
        if (check.critical) {
          overallStatus = 'unhealthy';
        }
      }
    }
    
    return {
      status: overallStatus,
      timestamp: Date.now(),
      checks: results
    };
  }
}

module.exports = {
  Metric,
  MetricsRegistry,
  SystemMonitor,
  HealthChecker,
  MetricType
};