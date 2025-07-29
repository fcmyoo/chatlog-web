/**
 * 日志管理仪表板组件
 * 提供日志查看、分析和管理功能
 */

<template>
  <div class="log-dashboard">
    <!-- 仪表板头部 -->
    <div class="dashboard-header">
      <h2>日志管理仪表板</h2>
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
          @click="exportLogs"
        >
          <el-icon><Download /></el-icon>
          导出日志
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ analytics?.summary.totalLogs || 0 }}</div>
          <div class="stat-label">总日志数</div>
        </div>
      </div>

      <div class="stat-card error">
        <div class="stat-icon">🚨</div>
        <div class="stat-content">
          <div class="stat-value">{{ (analytics?.summary.errorRate || 0).toFixed(1) }}%</div>
          <div class="stat-label">错误率</div>
        </div>
      </div>

      <div class="stat-card warning">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-value">{{ (analytics?.summary.warnRate || 0).toFixed(1) }}%</div>
          <div class="stat-label">警告率</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-content">
          <div class="stat-value">{{ analytics?.patterns.slowOperations.length || 0 }}</div>
          <div class="stat-label">慢操作</div>
        </div>
      </div>
    </div>

    <!-- 过滤器和搜索 -->
    <div class="filter-section">
      <div class="filter-row">
        <el-select v-model="selectedLevels" multiple placeholder="选择日志级别" style="width: 200px">
          <el-option label="Trace" value="trace" />
          <el-option label="Debug" value="debug" />
          <el-option label="Info" value="info" />
          <el-option label="Warn" value="warn" />
          <el-option label="Error" value="error" />
          <el-option label="Fatal" value="fatal" />
        </el-select>

        <el-select v-model="selectedCategories" multiple placeholder="选择分类" style="width: 200px">
          <el-option 
            v-for="category in availableCategories" 
            :key="category" 
            :label="category" 
            :value="category" 
          />
        </el-select>

        <el-select v-model="selectedSources" multiple placeholder="选择来源" style="width: 200px">
          <el-option 
            v-for="source in availableSources" 
            :key="source" 
            :label="source" 
            :value="source" 
          />
        </el-select>

        <el-input
          v-model="searchText"
          placeholder="搜索日志内容..."
          style="width: 300px"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button type="primary" @click="applyFilters">
          <el-icon><Filter /></el-icon>
          应用过滤
        </el-button>

        <el-button @click="clearFilters">
          <el-icon><RefreshLeft /></el-icon>
          清除过滤
        </el-button>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-container">
      <!-- 日志趋势图 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>日志趋势</h3>
          <el-select v-model="trendPeriod" size="small">
            <el-option label="小时" value="hourly" />
            <el-option label="天" value="daily" />
            <el-option label="周" value="weekly" />
          </el-select>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="trendChartOption" 
            :style="{ height: '300px' }"
          />
        </div>
      </div>

      <!-- 日志级别分布 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>日志级别分布</h3>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="levelDistributionOption" 
            :style="{ height: '300px' }"
          />
        </div>
      </div>

      <!-- 热门分类 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>热门分类</h3>
        </div>
        <div class="chart-content">
          <v-chart 
            :option="categoryChartOption" 
            :style="{ height: '300px' }"
          />
        </div>
      </div>

      <!-- 性能模式分析 -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>性能模式分析</h3>
        </div>
        <div class="chart-content">
          <div class="pattern-list">
            <div 
              v-for="pattern in analytics?.patterns.slowOperations || []" 
              :key="pattern.operation"
              class="pattern-item"
            >
              <div class="pattern-name">{{ pattern.operation }}</div>
              <div class="pattern-stats">
                <span class="avg-time">{{ pattern.avgTime.toFixed(1) }}ms</span>
                <span class="count">{{ pattern.count }} 次</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 日志列表 -->
    <div class="logs-section">
      <div class="section-header">
        <h3>日志记录</h3>
        <div class="log-stats">
          <span>共 {{ filteredLogs.length }} 条日志</span>
          <el-button size="small" @click="clearAllLogs" type="danger" plain>
            清空所有日志
          </el-button>
        </div>
      </div>

      <div class="log-table">
        <el-table 
          :data="paginatedLogs" 
          style="width: 100%"
          :height="400"
          stripe
          @row-click="showLogDetails"
        >
          <el-table-column prop="timestamp" label="时间" width="180">
            <template #default="{ row }">
              {{ formatTimestamp(row.timestamp) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="level" label="级别" width="80">
            <template #default="{ row }">
              <el-tag :type="getLevelTagType(row.level)" size="small">
                {{ row.level.toUpperCase() }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="category" label="分类" width="120" />
          <el-table-column prop="source" label="来源" width="150" />
          <el-table-column prop="message" label="消息" min-width="300" />
          
          <el-table-column prop="tags" label="标签" width="150">
            <template #default="{ row }">
              <el-tag 
                v-for="tag in row.tags.slice(0, 2)" 
                :key="tag" 
                size="small" 
                style="margin-right: 4px"
              >
                {{ tag }}
              </el-tag>
              <span v-if="row.tags.length > 2">+{{ row.tags.length - 2 }}</span>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button size="small" @click.stop="showLogDetails(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[20, 50, 100, 200]"
            :total="filteredLogs.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>
      </div>
    </div>

    <!-- 日志详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="日志详情"
      width="80%"
      top="5vh"
    >
      <div v-if="selectedLog" class="log-detail">
        <div class="detail-section">
          <h4>基本信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>时间:</label>
              <span>{{ formatTimestamp(selectedLog.timestamp) }}</span>
            </div>
            <div class="detail-item">
              <label>级别:</label>
              <el-tag :type="getLevelTagType(selectedLog.level)">
                {{ selectedLog.level.toUpperCase() }}
              </el-tag>
            </div>
            <div class="detail-item">
              <label>分类:</label>
              <span>{{ selectedLog.category }}</span>
            </div>
            <div class="detail-item">
              <label>来源:</label>
              <span>{{ selectedLog.source }}</span>
            </div>
            <div class="detail-item">
              <label>会话ID:</label>
              <span>{{ selectedLog.sessionId }}</span>
            </div>
            <div class="detail-item" v-if="selectedLog.correlationId">
              <label>关联ID:</label>
              <span>{{ selectedLog.correlationId }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>消息内容</h4>
          <div class="message-content">{{ selectedLog.message }}</div>
        </div>

        <div class="detail-section" v-if="selectedLog.tags.length > 0">
          <h4>标签</h4>
          <div class="tags-content">
            <el-tag 
              v-for="tag in selectedLog.tags" 
              :key="tag" 
              style="margin-right: 8px; margin-bottom: 4px"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>

        <div class="detail-section" v-if="Object.keys(selectedLog.metadata).length > 0">
          <h4>元数据</h4>
          <pre class="metadata-content">{{ JSON.stringify(selectedLog.metadata, null, 2) }}</pre>
        </div>

        <div class="detail-section">
          <h4>上下文信息</h4>
          <pre class="context-content">{{ JSON.stringify(selectedLog.context, null, 2) }}</pre>
        </div>
      </div>
    </el-dialog>

    <!-- 错误关联分析弹窗 -->
    <el-dialog
      v-model="correlationDialogVisible"
      title="错误关联分析"
      width="70%"
    >
      <div class="correlation-analysis">
        <div v-for="correlation in analytics?.correlations.errorCorrelations || []" 
             :key="correlation.error"
             class="correlation-item">
          <div class="correlation-error">
            <h4>{{ correlation.error }}</h4>
          </div>
          <div class="correlation-precursors">
            <h5>相关前置事件:</h5>
            <ul>
              <li v-for="precursor in correlation.precursors" :key="precursor">
                {{ precursor }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Download, Search, Filter, RefreshLeft } from '@element-plus/icons-vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { logAggregator, type LogEntry, type LogFilter, type LogAnalytics } from '@/utils/logAggregator'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 响应式数据
const timeRange = ref('24h')
const isRefreshing = ref(false)
const analytics = ref<LogAnalytics | null>(null)

// 过滤器状态
const selectedLevels = ref<string[]>([])
const selectedCategories = ref<string[]>([])
const selectedSources = ref<string[]>([])
const searchText = ref('')

// 图表设置
const trendPeriod = ref<'hourly' | 'daily' | 'weekly'>('hourly')

// 日志列表
const allLogs = ref<LogEntry[]>([])
const filteredLogs = ref<LogEntry[]>([])
const currentPage = ref(1)
const pageSize = ref(50)

// 弹窗状态
const detailDialogVisible = ref(false)
const correlationDialogVisible = ref(false)
const selectedLog = ref<LogEntry | null>(null)

// 定时器
let refreshTimer: number

// 计算属性
const availableCategories = computed(() => {
  const categories = new Set<string>()
  allLogs.value.forEach(log => categories.add(log.category))
  return Array.from(categories).sort()
})

const availableSources = computed(() => {
  const sources = new Set<string>()
  allLogs.value.forEach(log => sources.add(log.source))
  return Array.from(sources).sort()
})

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredLogs.value.slice(start, end)
})

// 图表配置
const trendChartOption = computed(() => ({
  title: {
    text: '日志趋势',
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
    name: '日志数量'
  },
  series: [{
    name: '日志数量',
    type: 'line',
    data: analytics.value?.trends[trendPeriod.value] || [],
    smooth: true,
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

const levelDistributionOption = computed(() => ({
  title: {
    text: '日志级别分布',
    left: 'center'
  },
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  series: [{
    type: 'pie',
    radius: '70%',
    data: Object.entries(analytics.value?.summary.logsByLevel || {})
      .map(([level, count]) => ({
        value: count,
        name: level.toUpperCase(),
        itemStyle: {
          color: getLevelColor(level as LogEntry['level'])
        }
      }))
      .filter(item => item.value > 0)
  }]
}))

const categoryChartOption = computed(() => ({
  title: {
    text: '热门分类',
    left: 'center'
  },
  tooltip: {
    trigger: 'axis'
  },
  xAxis: {
    type: 'value'
  },
  yAxis: {
    type: 'category',
    data: (analytics.value?.summary.topCategories || [])
      .slice(0, 10)
      .map(item => item.category)
  },
  series: [{
    type: 'bar',
    data: (analytics.value?.summary.topCategories || [])
      .slice(0, 10)
      .map(item => item.count),
    itemStyle: {
      color: '#1890ff'
    }
  }]
}))

// 生命周期
onMounted(() => {
  loadLogData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

// 监听过滤器变化
watch([selectedLevels, selectedCategories, selectedSources, searchText], () => {
  applyFilters()
}, { deep: true })

// 方法
const loadLogData = async () => {
  try {
    // 生成时间范围
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[timeRange.value] || 24 * 60 * 60 * 1000

    const now = Date.now()
    const filter: LogFilter = {
      timeRange: {
        start: now - timeRangeMs,
        end: now
      }
    }

    // 获取日志数据
    allLogs.value = logAggregator.query(filter)
    
    // 生成分析数据
    analytics.value = logAggregator.generateAnalytics(filter.timeRange)
    
    // 应用当前过滤器
    applyFilters()
    
  } catch (error) {
    console.error('加载日志数据失败:', error)
    ElMessage.error('加载日志数据失败')
  }
}

const applyFilters = () => {
  const filter: LogFilter = {}

  if (selectedLevels.value.length > 0) {
    filter.level = selectedLevels.value as LogEntry['level'][]
  }

  if (selectedCategories.value.length > 0) {
    filter.category = selectedCategories.value
  }

  if (selectedSources.value.length > 0) {
    filter.source = selectedSources.value
  }

  if (searchText.value.trim()) {
    filter.search = searchText.value.trim()
  }

  filteredLogs.value = logAggregator.query(filter)
    .filter(log => allLogs.value.includes(log))
  
  // 重置分页
  currentPage.value = 1
}

const clearFilters = () => {
  selectedLevels.value = []
  selectedCategories.value = []
  selectedSources.value = []
  searchText.value = ''
  filteredLogs.value = [...allLogs.value]
  currentPage.value = 1
}

const setTimeRange = (range: string) => {
  timeRange.value = range
  loadLogData()
}

const refreshData = async () => {
  isRefreshing.value = true
  try {
    await loadLogData()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    ElMessage.error('数据刷新失败')
  } finally {
    isRefreshing.value = false
  }
}

const exportLogs = async () => {
  try {
    const filter: LogFilter = {
      level: selectedLevels.value.length > 0 ? selectedLevels.value as LogEntry['level'][] : undefined,
      category: selectedCategories.value.length > 0 ? selectedCategories.value : undefined,
      source: selectedSources.value.length > 0 ? selectedSources.value : undefined,
      search: searchText.value.trim() || undefined
    }

    const data = logAggregator.exportLogs(filter, 'json')
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success('日志导出成功')
  } catch (error) {
    console.error('导出日志失败:', error)
    ElMessage.error('导出日志失败')
  }
}

const clearAllLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有日志吗？此操作不可恢复。',
      '确认清空',
      { type: 'warning' }
    )
    
    // 这里应该调用 logAggregator 的清空方法
    allLogs.value = []
    filteredLogs.value = []
    analytics.value = null
    
    ElMessage.success('日志已清空')
  } catch {
    // 用户取消
  }
}

const showLogDetails = (log: LogEntry) => {
  selectedLog.value = log
  detailDialogVisible.value = true
}

const startAutoRefresh = () => {
  refreshTimer = window.setInterval(() => {
    loadLogData()
  }, 30000) // 30秒自动刷新
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
}

const generateTimeLabels = (): string[] => {
  const labels = []
  const period = trendPeriod.value
  const count = 24

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date()
    
    if (period === 'hourly') {
      time.setHours(time.getHours() - i)
      labels.push(time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
    } else if (period === 'daily') {
      time.setDate(time.getDate() - i)
      labels.push(time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }))
    } else {
      time.setDate(time.getDate() - i * 7)
      labels.push(time.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }))
    }
  }
  
  return labels
}

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const getLevelTagType = (level: LogEntry['level']): string => {
  const types = {
    trace: '',
    debug: 'info',
    info: 'success',
    warn: 'warning',
    error: 'danger',
    fatal: 'danger'
  }
  return types[level] || ''
}

const getLevelColor = (level: LogEntry['level']): string => {
  const colors = {
    trace: '#8c8c8c',
    debug: '#1890ff',
    info: '#52c41a',
    warn: '#faad14',
    error: '#f5222d',
    fatal: '#722ed1'
  }
  return colors[level] || '#8c8c8c'
}
</script>

<style scoped>
.log-dashboard {
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

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.error {
  border-left: 4px solid #f5222d;
}

.stat-card.warning {
  border-left: 4px solid #faad14;
}

.stat-icon {
  font-size: 32px;
  margin-right: 16px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
}

.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.filter-row {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
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

.chart-content {
  padding: 20px;
}

.pattern-list {
  max-height: 260px;
  overflow-y: auto;
}

.pattern-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.pattern-item:last-child {
  border-bottom: none;
}

.pattern-name {
  font-weight: 500;
  color: #262626;
}

.pattern-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #8c8c8c;
}

.avg-time {
  color: #faad14;
  font-weight: 500;
}

.count {
  color: #1890ff;
}

.logs-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.section-header h3 {
  margin: 0;
  color: #262626;
  font-size: 16px;
  font-weight: 600;
}

.log-stats {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 14px;
  color: #8c8c8c;
}

.log-table {
  padding: 20px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.log-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: #262626;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
}

.detail-item label {
  font-weight: 500;
  color: #595959;
  margin-right: 8px;
  min-width: 80px;
}

.message-content {
  background: #fafafa;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.tags-content {
  line-height: 2;
}

.metadata-content,
.context-content {
  background: #fafafa;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.correlation-analysis {
  max-height: 60vh;
  overflow-y: auto;
}

.correlation-item {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.correlation-error h4 {
  margin: 0 0 12px 0;
  color: #f5222d;
}

.correlation-precursors h5 {
  margin: 0 0 8px 0;
  color: #595959;
}

.correlation-precursors ul {
  margin: 0;
  padding-left: 20px;
}

.correlation-precursors li {
  margin-bottom: 4px;
  color: #8c8c8c;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .log-dashboard {
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
  
  .stats-overview {
    grid-template-columns: 1fr;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-row > * {
    width: 100% !important;
  }
  
  .charts-container {
    grid-template-columns: 1fr;
  }
}
</style>