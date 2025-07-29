<template>
  <div class="performance-monitor">
    <!-- 系统状态概览 -->
    <el-row :gutter="20" class="stats-overview">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon cpu">
              <el-icon><Cpu /></el-icon>
            </div>
            <div class="stat-info">
              <h3>{{ systemStats.cpu }}%</h3>
              <p>CPU使用率</p>
            </div>
          </div>
          <div class="stat-trend">
            <el-progress
              :percentage="systemStats.cpu"
              :color="getProgressColor(systemStats.cpu)"
              :show-text="false"
              stroke-width="6"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon memory">
              <el-icon><Monitor /></el-icon>
            </div>
            <div class="stat-info">
              <h3>{{ systemStats.memory }}%</h3>
              <p>内存使用率</p>
            </div>
          </div>
          <div class="stat-trend">
            <el-progress
              :percentage="systemStats.memory"
              :color="getProgressColor(systemStats.memory)"
              :show-text="false"
              stroke-width="6"
            />
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon api">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="stat-info">
              <h3>{{ apiStats.requestCount }}</h3>
              <p>API请求总数</p>
            </div>
          </div>
          <div class="stat-trend">
            <span :class="['trend-text', apiStats.trend > 0 ? 'positive' : 'negative']">
              {{ apiStats.trend > 0 ? '+' : '' }}{{ apiStats.trend }}%
            </span>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon response">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <h3>{{ apiStats.avgResponseTime }}ms</h3>
              <p>平均响应时间</p>
            </div>
          </div>
          <div class="stat-trend">
            <span :class="['trend-text', apiStats.responseTimeTrend < 0 ? 'positive' : 'negative']">
              {{ apiStats.responseTimeTrend > 0 ? '+' : '' }}{{ apiStats.responseTimeTrend }}%
            </span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 性能图表 -->
    <el-row :gutter="20" class="charts-section">
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>📈 系统资源监控</span>
              <el-select
                v-model="timeRange"
                size="small"
                style="width: 120px"
                @change="loadPerformanceData"
              >
                <el-option label="最近1小时" value="1h" />
                <el-option label="最近6小时" value="6h" />
                <el-option label="最近24小时" value="24h" />
                <el-option label="最近7天" value="7d" />
              </el-select>
            </div>
          </template>
          
          <v-chart
            :option="systemChartOption"
            style="height: 300px;"
            :loading="chartsLoading"
          />
        </el-card>
      </el-col>

      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>🌐 API性能监控</span>
              <el-button size="small" @click="refreshApiStats">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>
          
          <v-chart
            :option="apiChartOption"
            style="height: 300px;"
            :loading="chartsLoading"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细监控表格 -->
    <el-card class="monitor-table">
      <template #header>
        <div class="table-header">
          <span>📊 详细性能指标</span>
          <div class="header-controls">
            <el-switch
              v-model="autoRefresh"
              active-text="自动刷新"
              @change="toggleAutoRefresh"
            />
            <el-button @click="exportData" size="small">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="API监控" name="api">
          <el-table :data="apiMetrics" v-loading="loading" style="width: 100%">
            <el-table-column prop="endpoint" label="接口路径" width="200" />
            <el-table-column prop="method" label="请求方法" width="100">
              <template #default="{ row }">
                <el-tag :type="getMethodTagType(row.method)" size="small">
                  {{ row.method }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="requestCount" label="请求次数" width="100" />
            <el-table-column prop="avgResponseTime" label="平均响应时间" width="120">
              <template #default="{ row }">
                <span :class="getResponseTimeClass(row.avgResponseTime)">
                  {{ row.avgResponseTime }}ms
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="errorRate" label="错误率" width="100">
              <template #default="{ row }">
                <span :class="getErrorRateClass(row.errorRate)">
                  {{ row.errorRate }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="lastAccess" label="最后访问" width="150">
              <template #default="{ row }">
                {{ formatTime(row.lastAccess) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="模型性能" name="models">
          <el-table :data="modelMetrics" v-loading="loading" style="width: 100%">
            <el-table-column prop="modelName" label="模型名称" width="150" />
            <el-table-column prop="provider" label="提供商" width="120" />
            <el-table-column prop="totalRequests" label="总请求数" width="100" />
            <el-table-column prop="avgLatency" label="平均延迟" width="100">
              <template #default="{ row }">
                <span :class="getLatencyClass(row.avgLatency)">
                  {{ row.avgLatency }}ms
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="tokensUsed" label="Token使用量" width="120" />
            <el-table-column prop="costEstimate" label="预估成本" width="100">
              <template #default="{ row }">
                <span>¥{{ row.costEstimate }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="successRate" label="成功率" width="100">
              <template #default="{ row }">
                <span :class="getSuccessRateClass(row.successRate)">
                  {{ row.successRate }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="lastUsed" label="最后使用" width="150">
              <template #default="{ row }">
                {{ formatTime(row.lastUsed) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="错误日志" name="errors">
          <el-table :data="errorLogs" v-loading="loading" style="width: 100%" max-height="400">
            <el-table-column prop="timestamp" label="时间" width="150">
              <template #default="{ row }">
                {{ formatTime(row.timestamp) }}
              </template>
            </el-table-column>
            <el-table-column prop="level" label="级别" width="80">
              <template #default="{ row }">
                <el-tag :type="getLogLevelTagType(row.level)" size="small">
                  {{ row.level }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="endpoint" label="接口" width="200" />
            <el-table-column prop="error" label="错误信息" show-overflow-tooltip />
            <el-table-column prop="userAgent" label="用户代理" width="200" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { aiApi } from '@/api/ApiClient.js'
import dayjs from 'dayjs'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 响应式数据
const loading = ref(false)
const chartsLoading = ref(false)
const autoRefresh = ref(true)
const timeRange = ref('1h')
const activeTab = ref('api')

const systemStats = reactive({
  cpu: 45,
  memory: 68,
  disk: 32,
  network: 12
})

const apiStats = reactive({
  requestCount: 1247,
  avgResponseTime: 186,
  errorRate: 2.3,
  trend: 12,
  responseTimeTrend: -8
})

const apiMetrics = ref([])
const modelMetrics = ref([])
const errorLogs = ref([])

const systemChartOption = ref({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
    borderColor: '#409eff',
    textStyle: { color: '#fff' }
  },
  legend: {
    data: ['CPU', '内存', '网络'],
    bottom: 0
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '15%',
    top: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: []
  },
  yAxis: {
    type: 'value',
    max: 100,
    axisLabel: {
      formatter: '{value}%'
    }
  },
  series: [
    {
      name: 'CPU',
      type: 'line',
      smooth: true,
      lineStyle: { color: '#409eff' },
      areaStyle: { color: 'rgba(64, 158, 255, 0.1)' },
      data: []
    },
    {
      name: '内存',
      type: 'line',
      smooth: true,
      lineStyle: { color: '#67c23a' },
      areaStyle: { color: 'rgba(103, 194, 58, 0.1)' },
      data: []
    },
    {
      name: '网络',
      type: 'line',
      smooth: true,
      lineStyle: { color: '#e6a23c' },
      areaStyle: { color: 'rgba(230, 162, 60, 0.1)' },
      data: []
    }
  ]
})

const apiChartOption = ref({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
    borderColor: '#409eff',
    textStyle: { color: '#fff' }
  },
  legend: {
    data: ['请求数', '响应时间'],
    bottom: 0
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '15%',
    top: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: []
  },
  yAxis: [
    {
      type: 'value',
      name: '请求数',
      position: 'left'
    },
    {
      type: 'value',
      name: '响应时间(ms)',
      position: 'right'
    }
  ],
  series: [
    {
      name: '请求数',
      type: 'line',
      smooth: true,
      lineStyle: { color: '#409eff' },
      areaStyle: { color: 'rgba(64, 158, 255, 0.1)' },
      data: []
    },
    {
      name: '响应时间',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      lineStyle: { color: '#f56c6c' },
      data: []
    }
  ]
})

let refreshTimer = null

// 生命周期
onMounted(() => {
  loadPerformanceData()
  loadApiMetrics()
  loadModelMetrics()
  loadErrorLogs()
  
  if (autoRefresh.value) {
    startAutoRefresh()
  }
})

onUnmounted(() => {
  stopAutoRefresh()
})

// 方法
const loadPerformanceData = async () => {
  chartsLoading.value = true
  try {
    const response = await aiApi.getPerformanceMetrics({ timeRange: timeRange.value })
    const data = response.data.data
    
    // 更新系统统计
    Object.assign(systemStats, data.system)
    Object.assign(apiStats, data.api)
    
    // 更新图表数据
    systemChartOption.value.xAxis.data = data.timestamps
    systemChartOption.value.series[0].data = data.cpuUsage
    systemChartOption.value.series[1].data = data.memoryUsage
    systemChartOption.value.series[2].data = data.networkUsage
    
    apiChartOption.value.xAxis.data = data.timestamps
    apiChartOption.value.series[0].data = data.requestCounts
    apiChartOption.value.series[1].data = data.responseTimes
  } catch (error) {
    console.error('加载性能数据失败:', error)
    ElMessage.error('加载性能数据失败')
  } finally {
    chartsLoading.value = false
  }
}

const loadApiMetrics = async () => {
  loading.value = true
  try {
    const response = await aiApi.getApiUsage(timeRange.value)
    apiMetrics.value = response.data.data || []
  } catch (error) {
    console.error('加载API指标失败:', error)
    ElMessage.error('加载API指标失败')
  } finally {
    loading.value = false
  }
}

const loadModelMetrics = async () => {
  try {
    const response = await aiApi.getModelStats()
    modelMetrics.value = response.data.data || []
  } catch (error) {
    console.error('加载模型指标失败:', error)
  }
}

const loadErrorLogs = async () => {
  try {
    const response = await aiApi.getServiceLogs({ level: 'error', limit: 50 })
    errorLogs.value = response.data.data || []
  } catch (error) {
    console.error('加载错误日志失败:', error)
  }
}

const refreshApiStats = async () => {
  await Promise.all([
    loadPerformanceData(),
    loadApiMetrics(),
    loadModelMetrics()
  ])
  ElMessage.success('数据已刷新')
}

const toggleAutoRefresh = (enabled) => {
  if (enabled) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

const startAutoRefresh = () => {
  refreshTimer = setInterval(() => {
    loadPerformanceData()
    loadApiMetrics()
  }, 30000) // 30秒刷新一次
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const exportData = () => {
  const data = {
    systemStats,
    apiStats,
    apiMetrics: apiMetrics.value,
    modelMetrics: modelMetrics.value,
    exportTime: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `performance-data-${dayjs().format('YYYY-MM-DD-HH-mm')}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('数据导出成功')
}

// 工具函数
const formatTime = (time) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '--'
}

const getProgressColor = (value) => {
  if (value < 50) return '#67c23a'
  if (value < 80) return '#e6a23c'
  return '#f56c6c'
}

const getMethodTagType = (method) => {
  const types = {
    GET: 'success',
    POST: 'primary',
    PUT: 'warning',
    DELETE: 'danger'
  }
  return types[method] || 'info'
}

const getResponseTimeClass = (time) => {
  if (time < 200) return 'response-fast'
  if (time < 1000) return 'response-normal'
  return 'response-slow'
}

const getErrorRateClass = (rate) => {
  if (rate < 1) return 'error-low'
  if (rate < 5) return 'error-medium'
  return 'error-high'
}

const getLatencyClass = (latency) => {
  if (latency < 500) return 'latency-fast'
  if (latency < 2000) return 'latency-normal'
  return 'latency-slow'
}

const getSuccessRateClass = (rate) => {
  if (rate >= 99) return 'success-excellent'
  if (rate >= 95) return 'success-good'
  return 'success-poor'
}

const getStatusTagType = (status) => {
  const types = {
    healthy: 'success',
    warning: 'warning',
    error: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    healthy: '正常',
    warning: '警告',
    error: '错误'
  }
  return texts[status] || '未知'
}

const getLogLevelTagType = (level) => {
  const types = {
    info: 'info',
    warn: 'warning',
    error: 'danger'
  }
  return types[level] || 'info'
}
</script>

<style scoped>
.performance-monitor {
  padding: 20px;
}

.stats-overview {
  margin-bottom: 20px;
}

.stat-card {
  height: 120px;
}

.stat-content {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.stat-icon.cpu {
  background: linear-gradient(135deg, #409eff, #66b3ff);
  color: white;
}

.stat-icon.memory {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: white;
}

.stat-icon.api {
  background: linear-gradient(135deg, #e6a23c, #ebb563);
  color: white;
}

.stat-icon.response {
  background: linear-gradient(135deg, #f56c6c, #f78989);
  color: white;
}

.stat-info h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.stat-info p {
  margin: 0;
  color: #666;
  font-size: 12px;
}

.stat-trend {
  height: 6px;
}

.trend-text {
  font-size: 12px;
  font-weight: 600;
}

.trend-text.positive {
  color: #67c23a;
}

.trend-text.negative {
  color: #f56c6c;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.monitor-table .table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* 响应时间样式 */
.response-fast {
  color: #67c23a;
  font-weight: 600;
}

.response-normal {
  color: #e6a23c;
}

.response-slow {
  color: #f56c6c;
  font-weight: 600;
}

/* 错误率样式 */
.error-low {
  color: #67c23a;
}

.error-medium {
  color: #e6a23c;
}

.error-high {
  color: #f56c6c;
  font-weight: 600;
}

/* 延迟样式 */
.latency-fast {
  color: #67c23a;
}

.latency-normal {
  color: #e6a23c;
}

.latency-slow {
  color: #f56c6c;
}

/* 成功率样式 */
.success-excellent {
  color: #67c23a;
  font-weight: 600;
}

.success-good {
  color: #e6a23c;
}

.success-poor {
  color: #f56c6c;
  font-weight: 600;
}
</style>