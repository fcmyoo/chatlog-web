/**
 * 性能监控仪表板组件
 * 提供实时性能指标展示和分析功能
 */

<template>
  <div class="performance-dashboard">
    <!-- 仪表板头部 -->
    <div class="dashboard-header">
      <h2>性能监控仪表板</h2>
      <div class="dashboard-controls">
        <el-button-group>
          <el-button 
            :type="timeRange === '1h' ? 'primary' : ''"
            @click="setTimeRange('1h')"
          >
            1小时
          </el-button>
          <el-button 
            :type="timeRange === '24h' ? 'primary' : ''"
            @click="setTimeRange('24h')"
          >
            24小时
          </el-button>
          <el-button 
            :type="timeRange === '7d' ? 'primary' : ''"
            @click="setTimeRange('7d')"
          >
            7天
          </el-button>
        </el-button-group>
        
        <el-button 
          type="success" 
          :loading="isRefreshing"
          @click="refreshData"
        >
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        
        <el-button 
          type="info"
          @click="exportReport"
        >
          <el-icon><Download /></el-icon>
          导出报告
        </el-button>
      </div>
    </div>

    <!-- 关键指标卡片 -->
    <div class="metrics-cards">
      <div class="metric-card" :class="getMetricStatus(coreWebVitals.fcp, 2500)">
        <div class="metric-icon">⚡</div>
        <div class="metric-content">
          <div class="metric-value">{{ formatTime(coreWebVitals.fcp) }}</div>
          <div class="metric-label">First Contentful Paint</div>
          <div class="metric-threshold">阈值: 2.5s</div>
        </div>
      </div>

      <div class="metric-card" :class="getMetricStatus(coreWebVitals.lcp, 4000)">
        <div class="metric-icon">🎯</div>
        <div class="metric-content">
          <div class="metric-value">{{ formatTime(coreWebVitals.lcp) }}</div>
          <div class="metric-label">Largest Contentful Paint</div>
          <div class="metric-threshold">阈值: 4.0s</div>
        </div>
      </div>

      <div class="metric-card" :class="getMetricStatus(coreWebVitals.fid, 100)">
        <div class="metric-icon">👆</div>
        <div class="metric-content">
          <div class="metric-value">{{ formatTime(coreWebVitals.fid) }}</div>
          <div class="metric-label">First Input Delay</div>
          <div class="metric-threshold">阈值: 100ms</div>
        </div>
      </div>

      <div class="metric-card" :class="getMetricStatus(coreWebVitals.cls * 1000, 100)">
        <div class="metric-icon">📐</div>
        <div class="metric-content">
          <div class="metric-value">{{ formatCLS(coreWebVitals.cls) }}</div>
          <div class="metric-label">Cumulative Layout Shift</div>
          <div class="metric-threshold">阈值: 0.1</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-container">
      <!-- 性能趋势图 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>性能趋势</h3>
          <el-select v-model="selectedMetric" size="small">
            <el-option label="页面加载时间" value="loadTime" />
            <el-option label="API响应时间" value="apiTime" />
            <el-option label="内存使用" value="memory" />
            <el-option label="错误率" value="errorRate" />
          </el-select>
        </div>
        <div class="chart-content">
          <v-chart 
            ref="trendChartRef"
            :option="trendChartOption" 
            :style="{ height: '300px' }"
            @click="handleChartClick"
          />
        </div>
      </div>

      <!-- 资源性能分析 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>资源性能分析</h3>
          <div class="chart-stats">
            <span>总资源: {{ resourceMetrics.totalResources }}</span>
            <span>缓存命中率: {{ resourceMetrics.cacheHitRate }}%</span>
          </div>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="resourceChartOption" 
            :style="{ height: '300px' }"
          />
        </div>
      </div>

      <!-- 用户体验评分 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>用户体验评分</h3>
          <div class="ux-score" :class="getUXScoreClass(overallScore)">
            {{ overallScore }}/100
          </div>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="uxScoreChartOption" 
            :style="{ height: '300px' }"
          />
        </div>
      </div>

      <!-- 错误分析 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>错误分析</h3>
          <div class="error-stats">
            <span class="error-count">{{ errorMetrics.totalErrors }} 个错误</span>
            <span class="error-rate">错误率: {{ errorMetrics.errorRate.toFixed(2) }}%</span>
          </div>
        </div>
        <div class="chart-content">
          <div class="error-list">
            <div 
              v-for="error in errorMetrics.topErrors" 
              :key="error.fingerprint"
              class="error-item"
              @click="showErrorDetails(error)"
            >
              <div class="error-message">{{ error.message }}</div>
              <div class="error-count">{{ error.count }} 次</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 实时监控面板 -->
    <div class="realtime-panel">
      <div class="panel-header">
        <h3>实时监控</h3>
        <div class="status-indicator" :class="{ online: isOnline }">
          {{ isOnline ? '在线' : '离线' }}
        </div>
      </div>
      
      <div class="realtime-metrics">
        <div class="realtime-metric">
          <div class="metric-label">当前用户</div>
          <div class="metric-value">{{ realtimeData.activeUsers }}</div>
        </div>
        
        <div class="realtime-metric">
          <div class="metric-label">页面浏览/分钟</div>
          <div class="metric-value">{{ realtimeData.pageViewsPerMinute }}</div>
        </div>
        
        <div class="realtime-metric">
          <div class="metric-label">平均响应时间</div>
          <div class="metric-value">{{ realtimeData.avgResponseTime }}ms</div>
        </div>
        
        <div class="realtime-metric">
          <div class="metric-label">错误/分钟</div>
          <div class="metric-value" :class="{ warning: realtimeData.errorsPerMinute > 0 }">
            {{ realtimeData.errorsPerMinute }}
          </div>
        </div>
      </div>
    </div>

    <!-- 警告和建议 -->
    <div class="alerts-panel" v-if="alerts.length > 0">
      <div class="panel-header">
        <h3>性能警告</h3>
        <el-button size="small" @click="dismissAllAlerts">
          全部忽略
        </el-button>
      </div>
      
      <div class="alerts-list">
        <div 
          v-for="alert in alerts" 
          :key="alert.id"
          class="alert-item"
          :class="alert.level"
        >
          <div class="alert-icon">
            {{ alert.level === 'error' ? '🚨' : alert.level === 'warning' ? '⚠️' : 'ℹ️' }}
          </div>
          <div class="alert-content">
            <div class="alert-title">{{ alert.title }}</div>
            <div class="alert-message">{{ alert.message }}</div>
            <div class="alert-time">{{ formatTimestamp(alert.timestamp) }}</div>
          </div>
          <div class="alert-actions">
            <el-button size="small" @click="dismissAlert(alert.id)">忽略</el-button>
            <el-button size="small" type="primary" @click="fixIssue(alert)">
              修复
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 性能建议 -->
    <div class="recommendations-panel">
      <div class="panel-header">
        <h3>性能优化建议</h3>
      </div>
      
      <div class="recommendations-list">
        <div 
          v-for="recommendation in recommendations" 
          :key="recommendation.id"
          class="recommendation-item"
        >
          <div class="recommendation-priority" :class="recommendation.priority">
            {{ recommendation.priority }}
          </div>
          <div class="recommendation-content">
            <div class="recommendation-title">{{ recommendation.title }}</div>
            <div class="recommendation-description">{{ recommendation.description }}</div>
            <div class="recommendation-impact">
              预计提升: {{ recommendation.impact }}
            </div>
          </div>
          <div class="recommendation-actions">
            <el-button size="small" @click="applyRecommendation(recommendation)">
              应用
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Download } from '@element-plus/icons-vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart, GaugeChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { performanceMonitor, type PerformanceMetrics } from '@/utils/performanceMonitor'
import { errorTracker, type ErrorMetrics } from '@/utils/errorTracker'
import { userAnalytics, type AnalyticsMetrics } from '@/utils/userAnalytics'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GaugeChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

interface Alert {
  id: string
  level: 'info' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
}

interface Recommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
}

// 响应式数据
const timeRange = ref('24h')
const selectedMetric = ref('loadTime')
const isRefreshing = ref(false)
const isOnline = ref(navigator.onLine)

// 性能指标数据
const coreWebVitals = ref({
  fcp: 0,
  lcp: 0,
  fid: 0,
  cls: 0,
  ttfb: 0
})

const resourceMetrics = ref({
  totalResources: 0,
  totalSize: 0,
  cacheHitRate: 0
})

const errorMetrics = ref<ErrorMetrics>({
  totalErrors: 0,
  errorRate: 0,
  topErrors: [],
  errorsByType: {},
  errorsByPage: {},
  resolution: { resolved: 0, unresolved: 0, rate: 0 },
  trends: { hourly: [], daily: [], weekly: [] }
})

const realtimeData = ref({
  activeUsers: 0,
  pageViewsPerMinute: 0,
  avgResponseTime: 0,
  errorsPerMinute: 0
})

const alerts = ref<Alert[]>([
  {
    id: '1',
    level: 'warning',
    title: 'LCP 过慢',
    message: 'Largest Contentful Paint 超过 4 秒，影响用户体验',
    timestamp: Date.now()
  },
  {
    id: '2',
    level: 'error',
    title: '内存泄漏',
    message: 'JavaScript 堆内存使用持续增长，可能存在内存泄漏',
    timestamp: Date.now() - 300000
  }
])

const recommendations = ref<Recommendation[]>([
  {
    id: '1',
    priority: 'high',
    title: '启用图片懒加载',
    description: '对页面中的图片启用懒加载，减少初始加载时间',
    impact: '20-30% 页面加载速度提升'
  },
  {
    id: '2',
    priority: 'medium',
    title: '优化 JavaScript 包大小',
    description: '移除未使用的依赖和代码分割优化',
    impact: '15-25% 包大小减少'
  },
  {
    id: '3',
    priority: 'low',
    title: '启用 HTTP/2 服务器推送',
    description: '对关键资源启用服务器推送',
    impact: '10-15% 首屏时间改善'
  }
])

// 计算属性
const overallScore = computed(() => {
  const scores = [
    getPerformanceScore(coreWebVitals.value.fcp, 2500, 4000),
    getPerformanceScore(coreWebVitals.value.lcp, 4000, 6000),
    getPerformanceScore(coreWebVitals.value.fid, 100, 300),
    getPerformanceScore(coreWebVitals.value.cls * 1000, 100, 250)
  ]
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
})

// 图表配置
const trendChartOption = computed(() => ({
  title: {
    text: '性能趋势',
    left: 'center'
  },
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'category',
    data: generateTimeLabels()
  },
  yAxis: {
    type: 'value',
    name: getMetricUnit(selectedMetric.value)
  },
  series: [{
    name: getMetricName(selectedMetric.value),
    type: 'line',
    data: generateTrendData(selectedMetric.value),
    smooth: true,
    lineStyle: {
      color: '#1890ff'
    },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
          { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
        ]
      }
    }
  }]
}))

const resourceChartOption = computed(() => ({
  title: {
    text: '资源类型分布',
    left: 'center'
  },
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  series: [{
    type: 'pie',
    radius: ['30%', '70%'],
    data: [
      { value: 35, name: 'JavaScript' },
      { value: 25, name: 'CSS' },
      { value: 20, name: '图片' },
      { value: 15, name: '字体' },
      { value: 5, name: '其他' }
    ],
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: 'rgba(0, 0, 0, 0.5)'
      }
    }
  }]
}))

const uxScoreChartOption = computed(() => ({
  series: [{
    type: 'gauge',
    startAngle: 180,
    endAngle: 0,
    min: 0,
    max: 100,
    center: ['50%', '80%'],
    radius: '80%',
    axisLine: {
      lineStyle: {
        width: 6,
        color: [
          [0.3, '#ff4757'],
          [0.7, '#ffa502'],
          [1, '#2ed573']
        ]
      }
    },
    pointer: {
      icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
      length: '12%',
      width: 20,
      offsetCenter: [0, '-60%'],
      itemStyle: {
        color: 'auto'
      }
    },
    axisTick: {
      length: 12,
      lineStyle: {
        color: 'auto',
        width: 2
      }
    },
    splitLine: {
      length: 20,
      lineStyle: {
        color: 'auto',
        width: 5
      }
    },
    axisLabel: {
      color: '#464646',
      fontSize: 20,
      distance: -60,
      formatter: function (value: number) {
        if (value >= 90) return '优秀'
        if (value >= 70) return '良好'
        if (value >= 50) return '一般'
        return '差'
      }
    },
    title: {
      offsetCenter: [0, '-20%'],
      fontSize: 20
    },
    detail: {
      fontSize: 30,
      offsetCenter: [0, '-35%'],
      valueAnimation: true,
      formatter: function (value: number) {
        return Math.round(value) + '{score|分}'
      },
      rich: {
        score: {
          fontSize: 20,
          color: '#999',
          padding: [0, 0, 0, 5]
        }
      }
    },
    data: [{
      value: overallScore.value,
      name: '用户体验'
    }]
  }]
}))

// 生命周期
onMounted(() => {
  loadPerformanceData()
  startRealtimeMonitoring()
  
  // 监听在线状态
  window.addEventListener('online', () => { isOnline.value = true })
  window.addEventListener('offline', () => { isOnline.value = false })
})

onUnmounted(() => {
  stopRealtimeMonitoring()
})

// 方法
const loadPerformanceData = async () => {
  try {
    // 获取性能指标
    const perfReport = performanceMonitor.generateReport()
    
    if (perfReport.navigation) {
      coreWebVitals.value = {
        fcp: perfReport.navigation.firstContentfulPaint || 0,
        lcp: perfReport.navigation.largestContentfulPaint || 0,
        fid: perfReport.navigation.firstInputDelay || 0,
        cls: perfReport.navigation.cumulativeLayoutShift || 0,
        ttfb: perfReport.navigation.timeToFirstByte || 0
      }
    }

    if (perfReport.resources) {
      resourceMetrics.value = {
        totalResources: perfReport.resources.totalResources || 0,
        totalSize: perfReport.resources.totalSize || 0,
        cacheHitRate: 75 // 示例数据
      }
    }

    // 获取错误指标
    errorMetrics.value = errorTracker.getMetrics()

    // 检查性能阈值并生成警告
    checkPerformanceThresholds()
    
  } catch (error) {
    console.error('加载性能数据失败:', error)
    ElMessage.error('加载性能数据失败')
  }
}

const checkPerformanceThresholds = () => {
  const newAlerts: Alert[] = []

  if (coreWebVitals.value.lcp > 4000) {
    newAlerts.push({
      id: `lcp-${Date.now()}`,
      level: 'warning',
      title: 'LCP 过慢',
      message: `Largest Contentful Paint 为 ${formatTime(coreWebVitals.value.lcp)}，超过 4 秒阈值`,
      timestamp: Date.now()
    })
  }

  if (coreWebVitals.value.fid > 100) {
    newAlerts.push({
      id: `fid-${Date.now()}`,
      level: 'error',
      title: 'FID 过高',
      message: `First Input Delay 为 ${formatTime(coreWebVitals.value.fid)}，超过 100ms 阈值`,
      timestamp: Date.now()
    })
  }

  if (errorMetrics.value.errorRate > 5) {
    newAlerts.push({
      id: `error-rate-${Date.now()}`,
      level: 'error',
      title: '错误率过高',
      message: `当前错误率为 ${errorMetrics.value.errorRate.toFixed(2)}%，需要立即处理`,
      timestamp: Date.now()
    })
  }

  alerts.value = [...alerts.value, ...newAlerts]
}

let realtimeTimer: number

const startRealtimeMonitoring = () => {
  realtimeTimer = window.setInterval(() => {
    // 模拟实时数据更新
    realtimeData.value = {
      activeUsers: Math.floor(Math.random() * 100) + 20,
      pageViewsPerMinute: Math.floor(Math.random() * 50) + 10,
      avgResponseTime: Math.floor(Math.random() * 200) + 100,
      errorsPerMinute: Math.floor(Math.random() * 3)
    }
  }, 5000)
}

const stopRealtimeMonitoring = () => {
  if (realtimeTimer) {
    clearInterval(realtimeTimer)
  }
}

const setTimeRange = (range: string) => {
  timeRange.value = range
  loadPerformanceData()
}

const refreshData = async () => {
  isRefreshing.value = true
  try {
    await loadPerformanceData()
    ElMessage.success('数据刷新成功')
  } finally {
    isRefreshing.value = false
  }
}

const exportReport = async () => {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      timeRange: timeRange.value,
      coreWebVitals: coreWebVitals.value,
      resourceMetrics: resourceMetrics.value,
      errorMetrics: errorMetrics.value,
      overallScore: overallScore.value,
      alerts: alerts.value,
      recommendations: recommendations.value
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-report-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success('报告导出成功')
  } catch (error) {
    console.error('导出报告失败:', error)
    ElMessage.error('导出报告失败')
  }
}

const dismissAlert = (alertId: string) => {
  alerts.value = alerts.value.filter(alert => alert.id !== alertId)
}

const dismissAllAlerts = () => {
  alerts.value = []
}

const fixIssue = async (alert: Alert) => {
  ElMessageBox.confirm(
    `确定要修复问题："${alert.title}"吗？`,
    '确认修复',
    { type: 'warning' }
  ).then(() => {
    // 这里可以实现自动修复逻辑
    ElMessage.success('问题修复成功')
    dismissAlert(alert.id)
  }).catch(() => {
    // 用户取消
  })
}

const applyRecommendation = async (recommendation: Recommendation) => {
  ElMessageBox.confirm(
    `确定要应用建议："${recommendation.title}"吗？`,
    '确认应用',
    { type: 'info' }
  ).then(() => {
    // 这里可以实现自动应用建议的逻辑
    ElMessage.success('建议应用成功')
    recommendations.value = recommendations.value.filter(r => r.id !== recommendation.id)
  }).catch(() => {
    // 用户取消
  })
}

const showErrorDetails = (error: any) => {
  ElMessageBox.alert(
    `错误详情：${error.message}\n发生次数：${error.count}\n错误指纹：${error.fingerprint}`,
    '错误详情',
    { type: 'error' }
  )
}

const handleChartClick = (params: any) => {
  console.log('图表点击:', params)
}

// 工具函数
const formatTime = (time: number): string => {
  if (time < 1000) {
    return `${Math.round(time)}ms`
  }
  return `${(time / 1000).toFixed(2)}s`
}

const formatCLS = (cls: number): string => {
  return cls.toFixed(3)
}

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

const getMetricStatus = (value: number, threshold: number): string => {
  if (value <= threshold) return 'good'
  if (value <= threshold * 1.5) return 'needs-improvement'
  return 'poor'
}

const getUXScoreClass = (score: number): string => {
  if (score >= 90) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'average'
  return 'poor'
}

const getPerformanceScore = (value: number, goodThreshold: number, poorThreshold: number): number => {
  if (value <= goodThreshold) return 100
  if (value >= poorThreshold) return 0
  return Math.max(0, 100 - ((value - goodThreshold) / (poorThreshold - goodThreshold)) * 100)
}

const generateTimeLabels = (): string[] => {
  const labels = []
  const now = new Date()
  
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000)
    labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
  }
  
  return labels
}

const generateTrendData = (metric: string): number[] => {
  // 生成模拟趋势数据
  const data = []
  for (let i = 0; i < 24; i++) {
    switch (metric) {
      case 'loadTime':
        data.push(Math.random() * 2000 + 1000)
        break
      case 'apiTime':
        data.push(Math.random() * 500 + 100)
        break
      case 'memory':
        data.push(Math.random() * 50 + 30)
        break
      case 'errorRate':
        data.push(Math.random() * 5)
        break
      default:
        data.push(Math.random() * 100)
    }
  }
  return data
}

const getMetricName = (metric: string): string => {
  const names: Record<string, string> = {
    loadTime: '页面加载时间',
    apiTime: 'API响应时间',
    memory: '内存使用',
    errorRate: '错误率'
  }
  return names[metric] || metric
}

const getMetricUnit = (metric: string): string => {
  const units: Record<string, string> = {
    loadTime: '毫秒 (ms)',
    apiTime: '毫秒 (ms)',
    memory: 'MB',
    errorRate: '百分比 (%)'
  }
  return units[metric] || ''
}
</script>

<style scoped>
.performance-dashboard {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dashboard-header h2 {
  margin: 0;
  color: #262626;
  font-size: 24px;
  font-weight: 600;
}

.dashboard-controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.metrics-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.metric-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.metric-card.good {
  border-left: 4px solid #52c41a;
}

.metric-card.needs-improvement {
  border-left: 4px solid #faad14;
}

.metric-card.poor {
  border-left: 4px solid #f5222d;
}

.metric-icon {
  font-size: 32px;
  margin-right: 16px;
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 2px;
}

.metric-threshold {
  font-size: 12px;
  color: #bfbfbf;
}

.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-header h3 {
  margin: 0;
  color: #262626;
  font-size: 16px;
  font-weight: 600;
}

.chart-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #8c8c8c;
}

.ux-score {
  font-size: 24px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 4px;
}

.ux-score.excellent {
  background: #f6ffed;
  color: #52c41a;
}

.ux-score.good {
  background: #fffbe6;
  color: #faad14;
}

.ux-score.average {
  background: #fff2e8;
  color: #fa8c16;
}

.ux-score.poor {
  background: #fff1f0;
  color: #f5222d;
}

.chart-content {
  padding: 20px;
}

.error-list {
  max-height: 200px;
  overflow-y: auto;
}

.error-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.2s;
}

.error-item:hover {
  background: #fafafa;
}

.error-item:last-child {
  border-bottom: none;
}

.error-message {
  flex: 1;
  font-size: 14px;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-count {
  font-size: 12px;
  color: #f5222d;
  font-weight: 600;
}

.realtime-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-header h3 {
  margin: 0;
  color: #262626;
  font-size: 16px;
  font-weight: 600;
}

.status-indicator {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: #fff1f0;
  color: #f5222d;
}

.status-indicator.online {
  background: #f6ffed;
  color: #52c41a;
}

.realtime-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;
}

.realtime-metric {
  text-align: center;
}

.realtime-metric .metric-label {
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.realtime-metric .metric-value {
  font-size: 24px;
  font-weight: 600;
  color: #262626;
}

.realtime-metric .metric-value.warning {
  color: #f5222d;
}

.alerts-panel,
.recommendations-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.alerts-list,
.recommendations-list {
  padding: 20px;
}

.alert-item,
.recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.alert-item:last-child,
.recommendation-item:last-child {
  border-bottom: none;
}

.alert-item.error {
  background: #fff1f0;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 8px;
}

.alert-item.warning {
  background: #fffbe6;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 8px;
}

.alert-icon {
  font-size: 20px;
  line-height: 1;
}

.alert-content,
.recommendation-content {
  flex: 1;
}

.alert-title,
.recommendation-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.alert-message,
.recommendation-description {
  font-size: 13px;
  color: #595959;
  margin-bottom: 4px;
}

.alert-time {
  font-size: 12px;
  color: #bfbfbf;
}

.recommendation-priority {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.recommendation-priority.high {
  background: #fff1f0;
  color: #f5222d;
}

.recommendation-priority.medium {
  background: #fffbe6;
  color: #faad14;
}

.recommendation-priority.low {
  background: #f6ffed;
  color: #52c41a;
}

.recommendation-impact {
  font-size: 12px;
  color: #1890ff;
  font-weight: 600;
}

.alert-actions,
.recommendation-actions {
  display: flex;
  gap: 8px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .performance-dashboard {
    padding: 12px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .dashboard-controls {
    justify-content: center;
  }
  
  .metrics-cards {
    grid-template-columns: 1fr;
  }
  
  .charts-container {
    grid-template-columns: 1fr;
  }
  
  .realtime-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>